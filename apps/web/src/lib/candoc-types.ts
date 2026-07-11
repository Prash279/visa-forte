import { z } from 'zod'

const FindingSchema = z.object({
  id: z.string(),
  severity: z.enum(['info', 'minor', 'major', 'critical']),
  description: z.string(),
  documentRef: z.string(),
  suggestedAction: z.string(),
  isNew: z.boolean().optional(),
  isResolved: z.boolean().optional(),
  prashAnnotation: z.string().optional(),
})

const SopLayerResultSchema = z.object({
  layer: z.string(),
  layerName: z.string(),
  status: z.enum(['pass', 'gap', 'missing', 'partial']),
  findings: z.array(FindingSchema),
})

const FindingsJsonSchema = z.object({
  reviewedAt: z.string(),
  clientId: z.string(),
  version: z.number().int().positive(),
  sopLayers: z.array(SopLayerResultSchema),
  overallRiskLevel: z.enum(['clear', 'minor', 'major', 'critical']),
  totalGaps: z.number().int().min(0),
})

export type Finding = z.infer<typeof FindingSchema>
export type FindingsJson = z.infer<typeof FindingsJsonSchema>

export function parseFindings(json: unknown): FindingsJson {
  return FindingsJsonSchema.parse(json)
}
