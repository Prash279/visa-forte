// premium-download-token.ts — stateless signed download links for premium resources.
//
// There is no purchases table: the Razorpay dashboard is the purchase ledger.
// Instead, the verify route mints a link whose HMAC signature proves the buyer
// completed a verified payment. The signing key is RAZORPAY_KEY_SECRET — a
// purchase cannot exist without it, so downloads need no extra configuration.

import { createHmac, timingSafeEqual } from 'crypto';

// How long an emailed download link keeps working. Generous on purpose —
// a buyer re-downloading from the receipt email weeks later should succeed.
export const DOWNLOAD_LINK_VALIDITY_DAYS = 30;

export interface DownloadToken {
  expiresAt: number; // Unix ms
  signature: string; // hex HMAC over "<resourceId>.<expiresAt>"
}

function sign(resourceId: string, expiresAt: number, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${resourceId}.${expiresAt}`)
    .digest('hex');
}

// Mints a token for a resource. Called only AFTER the Razorpay payment
// signature has been verified — the token is the proof of purchase.
export function createDownloadToken(
  resourceId: string,
  secret: string,
): DownloadToken {
  const expiresAt =
    Date.now() + DOWNLOAD_LINK_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
  return { expiresAt, signature: sign(resourceId, expiresAt, secret) };
}

// Returns true only if the signature matches this exact resource + expiry
// and the link has not expired. Constant-time comparison prevents an
// attacker from guessing the signature byte by byte.
export function verifyDownloadToken(
  resourceId: string,
  expiresAt: number,
  signature: string,
  secret: string,
): boolean {
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  const expected = Buffer.from(sign(resourceId, expiresAt, secret));
  const provided = Buffer.from(signature);
  return (
    expected.length === provided.length && timingSafeEqual(expected, provided)
  );
}
