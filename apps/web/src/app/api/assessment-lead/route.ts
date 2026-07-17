import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { leads } from '../../../../drizzle/schema';

const FieldSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('A valid email address is required'),
  phone: z.string().min(7, 'Mobile number is required').max(20),
  crsScore: z.coerce.number().int().min(0).max(1200),
  consentGiven: z.literal('true', {
    errorMap: () => ({ message: 'Consent is required' }),
  }),
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
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const result = FieldSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    crsScore: formData.get('crsScore'),
    consentGiven: formData.get('consentGiven'),
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten() },
      { status: 400 },
    );
  }

  const { name, email, phone, crsScore } = result.data;

  // Encode resume as a base64 data URI and store directly in the database.
  // This approach has no external service dependency and works reliably in all environments.
  let resumeUrl: string | null = null;
  let resumeFilename: string | null = null;
  const resumeEntry = formData.get('resume');
  if (resumeEntry instanceof File && resumeEntry.size > 0) {
    const mimeType = resumeEntry.type || 'application/octet-stream';
    if (!ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json(
        { error: 'Resume must be a PDF or Word document.' },
        { status: 400 },
      );
    }
    if (resumeEntry.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: 'Resume must be under 5 MB.' },
        { status: 400 },
      );
    }
    const arrayBuffer = await resumeEntry.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    resumeUrl = `data:${mimeType};base64,${base64}`;
    resumeFilename = resumeEntry.name;
  }

  const notes =
    `CRS Score: ${crsScore}.` +
    `\nCaptured from /assessment self-assessment tool.`;

  try {
    await db.insert(leads).values({
      name,
      email,
      phone,
      serviceInterest: 'Pre-Application Eligibility Assessment',
      notes,
      resumeUrl,
      resumeFilename,
    });
  } catch (err) {
    console.error('Assessment lead insert failed:', err);
    return NextResponse.json(
      { error: 'Could not save your submission. Please try again.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
