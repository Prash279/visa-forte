import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { getCurrentAuthSession } from '@/lib/auth-server'

export const maxDuration = 30

// Claude classifies free-text job duties → a single best-fit NOC 2021 code + TEER.
// The citation URL is constructed server-side (never trust a model-generated URL).
const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 1024
const NOC_FINDER_URL =
  'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/find-national-occupation-code.html'

const ADMIN_EMAIL = 'prashant@visaforte.com'

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (!session?.session || session.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

const SYSTEM_PROMPT = `You are an expert Canadian NOC 2021 (TEER) occupational classifier for immigration documentation.
You map a worker's DUTIES (not their job title) to a single best-fit NOC 2021 5-digit code and its TEER level.

Rules:
- Classify from the duties. The job title is a weak signal; duties decide the code.
- If the duties plausibly match MORE THAN ONE NOC at materially different TEER levels (e.g. a TEER 1 vs a TEER 3 code), set ambiguity.flag = true and list the competing codes in ambiguity.alternatives. NOC mismatch is the highest-frequency PR refusal trigger — never manufacture false confidence.
- confidence: "high" only when the duties clearly map to one code; "medium" when reasonable but with caveats; "low" when duties are sparse or generic.
- Return ONLY a valid JSON object — no markdown fences, no commentary.

Return exactly this shape:
{
  "nocCode": "<5-digit NOC 2021 code>",
  "teer": <integer 0-5>,
  "title": "<official NOC unit group title>",
  "confidence": "high" | "medium" | "low",
  "ambiguity": {
    "flag": <boolean>,
    "alternatives": [ { "nocCode": "<code>", "teer": <int>, "title": "<title>" } ]
  }
}`

// Boundary validation — Claude output is untrusted until parsed.
const nocResponseSchema = z.object({
  nocCode: z.string().min(4).max(6),
  teer: z.number().int().min(0).max(5),
  title: z.string().min(1),
  confidence: z.enum(['high', 'medium', 'low']),
  ambiguity: z.object({
    flag: z.boolean(),
    alternatives: z
      .array(
        z.object({
          nocCode: z.string().min(4).max(6),
          teer: z.number().int().min(0).max(5),
          title: z.string().min(1),
        })
      )
      .default([]),
  }),
})

const requestSchema = z.object({
  occupationTitle: z.string().max(200).optional(),
  jobDuties: z.string().min(20, 'Provide a detailed description of the job duties (at least a sentence or two).').max(8000),
})

// POST /api/admin/pnp-noc  Body: { occupationTitle?, jobDuties }
export async function POST(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny

  try {
    const parsed = requestSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      )
    }
    const { occupationTitle, jobDuties } = parsed.data

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Job title (context only): ${occupationTitle || 'not provided'}\n\nDetailed job duties:\n${jobDuties}`,
        },
      ],
    })

    const rawText = message.content.find(b => b.type === 'text')?.text ?? ''
    const jsonText = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()

    const result = nocResponseSchema.safeParse(JSON.parse(jsonText))
    if (!result.success) {
      return NextResponse.json({ error: 'Classifier returned an unexpected shape.' }, { status: 502 })
    }

    // Build the citation URL server-side so it is always a valid canada.ca source.
    const classification = {
      ...result.data,
      citationUrl: NOC_FINDER_URL,
    }
    return NextResponse.json(classification)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'NOC classification failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
