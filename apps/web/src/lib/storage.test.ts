import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadFile, deleteFile, generateDownloadUrl } from './storage';

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  del: vi.fn(),
  getDownloadUrl: vi.fn(),
}));

import { put, del, getDownloadUrl } from '@vercel/blob';

const mockPut = vi.mocked(put);
const mockDel = vi.mocked(del);
const mockGetDownloadUrl = vi.mocked(getDownloadUrl);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('uploadFile', () => {
  it('calls put with private access and returns url and pathname', async () => {
    mockPut.mockResolvedValue({
      url: 'https://blob.vercel-storage.com/clients/abc/passport.pdf',
      pathname: 'clients/abc/passport.pdf',
      contentType: 'application/pdf',
      contentDisposition: 'attachment',
      downloadUrl: '',
      etag: '"abc123"',
    });

    const result = await uploadFile(
      'clients/abc/passport.pdf',
      Buffer.from('data'),
      'application/pdf',
    );

    expect(mockPut).toHaveBeenCalledWith(
      'clients/abc/passport.pdf',
      expect.any(Buffer),
      {
        access: 'private',
        contentType: 'application/pdf',
      },
    );
    expect(result.url).toBe(
      'https://blob.vercel-storage.com/clients/abc/passport.pdf',
    );
    expect(result.pathname).toBe('clients/abc/passport.pdf');
  });
});

describe('deleteFile', () => {
  it('calls del with the provided url', async () => {
    mockDel.mockResolvedValue(undefined);
    await deleteFile(
      'https://blob.vercel-storage.com/clients/abc/passport.pdf',
    );
    expect(mockDel).toHaveBeenCalledWith(
      'https://blob.vercel-storage.com/clients/abc/passport.pdf',
    );
  });
});

describe('generateDownloadUrl', () => {
  it('returns the download url from getDownloadUrl', () => {
    mockGetDownloadUrl.mockReturnValue(
      'https://blob.vercel-storage.com/clients/abc/passport.pdf?token=xyz',
    );
    const url = generateDownloadUrl(
      'https://blob.vercel-storage.com/clients/abc/passport.pdf',
    );
    expect(mockGetDownloadUrl).toHaveBeenCalledWith(
      'https://blob.vercel-storage.com/clients/abc/passport.pdf',
    );
    expect(url).toBe(
      'https://blob.vercel-storage.com/clients/abc/passport.pdf?token=xyz',
    );
  });
});
