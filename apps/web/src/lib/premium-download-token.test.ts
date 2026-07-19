import { describe, it, expect } from 'vitest';
import {
  createDownloadToken,
  verifyDownloadToken,
  DOWNLOAD_LINK_VALIDITY_DAYS,
} from './premium-download-token';

const SECRET = 'test_secret';
const RESOURCE_ID = 'loe-master-template-pack';

describe('premium download token', () => {
  it('round-trips: a freshly minted token verifies', () => {
    const token = createDownloadToken(RESOURCE_ID, SECRET);
    expect(
      verifyDownloadToken(
        RESOURCE_ID,
        token.expiresAt,
        token.signature,
        SECRET,
      ),
    ).toBe(true);
  });

  it('expires after the validity window', () => {
    const token = createDownloadToken(RESOURCE_ID, SECRET);
    const expectedMs = DOWNLOAD_LINK_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
    expect(token.expiresAt - Date.now()).toBeLessThanOrEqual(expectedMs);

    const pastExpiry = Date.now() - 1000;
    // A token whose expiry is in the past fails even with a valid signature shape
    expect(
      verifyDownloadToken(RESOURCE_ID, pastExpiry, token.signature, SECRET),
    ).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const token = createDownloadToken(RESOURCE_ID, SECRET);
    const tampered = token.signature.replace(/^./, (c) =>
      c === 'a' ? 'b' : 'a',
    );
    expect(
      verifyDownloadToken(RESOURCE_ID, token.expiresAt, tampered, SECRET),
    ).toBe(false);
  });

  it('rejects the token when used for a different resource', () => {
    const token = createDownloadToken(RESOURCE_ID, SECRET);
    expect(
      verifyDownloadToken(
        'ee-pre-submission-audit-guide',
        token.expiresAt,
        token.signature,
        SECRET,
      ),
    ).toBe(false);
  });

  it('rejects a tampered expiry (extending the link lifetime)', () => {
    const token = createDownloadToken(RESOURCE_ID, SECRET);
    expect(
      verifyDownloadToken(
        RESOURCE_ID,
        token.expiresAt + 999999,
        token.signature,
        SECRET,
      ),
    ).toBe(false);
  });

  it('rejects non-numeric or malformed expiry values', () => {
    const token = createDownloadToken(RESOURCE_ID, SECRET);
    expect(verifyDownloadToken(RESOURCE_ID, NaN, token.signature, SECRET)).toBe(
      false,
    );
    expect(verifyDownloadToken(RESOURCE_ID, token.expiresAt, '', SECRET)).toBe(
      false,
    );
  });

  it('rejects a token signed with a different secret', () => {
    const token = createDownloadToken(RESOURCE_ID, 'other_secret');
    expect(
      verifyDownloadToken(
        RESOURCE_ID,
        token.expiresAt,
        token.signature,
        SECRET,
      ),
    ).toBe(false);
  });
});
