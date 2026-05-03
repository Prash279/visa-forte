import { z } from 'zod';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const CreateMonitoringSchema = z.object({
  submittedAt: z.string().regex(ISO_DATE, 'Must be YYYY-MM-DD'),
  aorNumber: z.string().max(50).optional(),
  expectedDecisionDate: z.string().regex(ISO_DATE, 'Must be YYYY-MM-DD').optional().or(z.literal('')),
  lastStatusCheck: z.string().regex(ISO_DATE, 'Must be YYYY-MM-DD').optional().or(z.literal('')),
  irccPortalStatus: z.string().max(200).optional(),
  monitoringNotes: z.string().max(2000).optional(),
});

export type CreateMonitoringInput = z.infer<typeof CreateMonitoringSchema>;

export const QUERY_TYPES = [
  'Additional Documents Request',
  'Medical Update',
  'Background Check',
  'Biometrics Request',
  'Police Certificate',
  'Other',
] as const;

export const CreateQuerySchema = z.object({
  queryType: z.string().min(1).max(100),
  receivedAt: z.string().regex(ISO_DATE, 'Must be YYYY-MM-DD'),
  responseDeadline: z.string().regex(ISO_DATE, 'Must be YYYY-MM-DD'),
  notes: z.string().max(1000).optional(),
});

export type CreateQueryInput = z.infer<typeof CreateQuerySchema>;

export const UpdateQuerySchema = z.object({
  status: z.enum(['Open', 'Responded', 'Overdue']),
  responseSubmittedAt: z.string().regex(ISO_DATE, 'Must be YYYY-MM-DD').optional().or(z.literal('')),
  notes: z.string().max(1000).optional(),
});

export type UpdateQueryInput = z.infer<typeof UpdateQuerySchema>;

// Returns true if a query deadline has passed and it is still Open
export function isOverdue(responseDeadline: string, today: string): boolean {
  return responseDeadline < today;
}

// Returns true if a query deadline is within `daysAhead` days from today (inclusive)
export function isDeadlineWithin(responseDeadline: string, today: string, daysAhead: number): boolean {
  const deadlineDate = new Date(responseDeadline);
  const todayDate = new Date(today);
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + daysAhead);
  return deadlineDate >= todayDate && deadlineDate <= futureDate;
}