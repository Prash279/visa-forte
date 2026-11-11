import { z } from 'zod';
import { CRS_MAX_TOTAL } from '@/lib/crs-calculator';

export const AssessmentLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('A valid email address is required'),
  crsScore: z.number().int().min(0).max(CRS_MAX_TOTAL),
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: 'Consent is required' }),
  }),
});
