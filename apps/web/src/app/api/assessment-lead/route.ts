import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { leads } from '../../../../drizzle/schema';
import { put } from '@vercel/blob';

const FieldSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('A valid email address is required'),
  crsScore: z.coerce.number().int().min(0).max(1200),
  consentGiven: z.literal('true', { errorMap: () => ({ message: 'Consent is required' }) }),
});

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const result = FieldSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    crsScore: formData.get('crsScore'),
    consentGiven: formData.get('consentGiven'),
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { name, email, crsScore } = result.data;

  // Upload resume to Vercel Blob if provided (non-fatal — lead is saved either way).
  let resumeUrl: string | null = null;
  const resumeEntry = formData.get('resume');
  if (resumeEntry instanceof File && resumeEntry.size > 0) {
    if (!ALLOWED_MIME.has(resumeEntry.type)) {
      return NextResponse.json(
        { error: 'Resume must be a PDF or Word document.' },
        { status: 400 }
      );
    }
    if (resumeEntry.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Resume must be under 5 MB.' }, { status: 400 });
    }
    try {
      const blob = await put(
        `resumes/${Date.now()}-${resumeEntry.name}`,
        resumeEntry,
        { access: 'public', contentType: resumeEntry.type }
      );
      resumeUrl = blob.url;
    } catch (err) {
      console.error('Resume upload failed:', err);
      // Continue without resume URL rather than failing the lead capture.
    }
  }

  const notes =
    `CRS Score: ${crsScore}.` +
    (resumeUrl ? `\nResume: ${resumeUrl}` : '') +
    `\nCaptured from /assessment self-assessment tool.`;

  try {
    await db.insert(leads).values({
      name,
      email,
      serviceInterest: 'Pre-Application Eligibility Assessment',
      notes,
    });
  } catch (err) {
    console.error('Assessment lead insert failed:', err);
    return NextResponse.json(
      { error: 'Could not save your submission. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
