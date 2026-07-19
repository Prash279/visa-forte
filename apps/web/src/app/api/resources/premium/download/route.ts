// Serves a purchased premium PDF from apps/web/private/downloads/.
// The file lives OUTSIDE public/ so it can never be fetched by guessing a URL —
// the only way in is a link whose HMAC signature was minted by the verify
// route after a genuine Razorpay payment.

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { findPremiumResource } from '@/lib/resources';
import { verifyDownloadToken } from '@/lib/premium-download-token';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const id = params.get('id') ?? '';
  const exp = Number(params.get('exp'));
  const sig = params.get('sig') ?? '';

  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
  if (!keySecret || !verifyDownloadToken(id, exp, sig, keySecret)) {
    return NextResponse.json(
      {
        error:
          'This download link is invalid or has expired. Email prashant@visaforte.com from your purchase email address to get a fresh link.',
      },
      { status: 403 },
    );
  }

  const resource = findPremiumResource(id);
  if (!resource) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
  }

  const filePath = path.join(
    process.cwd(),
    'private',
    'downloads',
    resource.fileName,
  );

  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(filePath);
  } catch {
    console.error(
      `[resources/premium-download] missing file for id=${id}: ${resource.fileName}`,
    );
    return NextResponse.json(
      {
        error:
          'File temporarily unavailable — email prashant@visaforte.com and we will send it directly.',
      },
      { status: 503 },
    );
  }

  console.log(`[resources/premium-download] id=${id}`);

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${resource.fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
