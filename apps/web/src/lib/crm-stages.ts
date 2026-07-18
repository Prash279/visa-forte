import { z } from 'zod';

export const CRM_STAGES = [
  'Lead',
  'Qualified',
  'Proposal Sent',
  'Active Client',
  'ITA Window',
  'Submitted',
  'Decision Pending',
  'Completed',
  'Archived',
] as const;

export type CrmStage = (typeof CRM_STAGES)[number];

// Stage filter pills shown in the CRM table toolbar.
export const CRM_FILTER_STAGES: Array<CrmStage | 'all'> = [
  'all',
  'Lead',
  'Qualified',
  'Active Client',
  'ITA Window',
  'Completed',
];

export const CreateClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email required'),
  phone: z.string().max(20).optional(),
  serviceTier: z.string().min(1, 'Service tier is required'),
});

export const UpdateClientSchema = z
  .object({
    stage: z.enum(CRM_STAGES).optional(),
    notes: z.string().max(5000).optional(),
  })
  .refine((d) => d.stage !== undefined || d.notes !== undefined, {
    message: 'Provide stage or notes',
  });
