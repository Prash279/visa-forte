import { put, del, getDownloadUrl } from '@vercel/blob';

export type UploadResult = {
  url: string;
  pathname: string;
};

// Store a file as a private blob. pathname should include folder structure,
// e.g. "clients/abc123/passport.pdf"
export async function uploadFile(
  pathname: string,
  body: Buffer | Blob | ArrayBuffer | ReadableStream,
  contentType: string,
): Promise<UploadResult> {
  const result = await put(pathname, body, {
    access: 'private',
    contentType,
  });
  return { url: result.url, pathname: result.pathname };
}

// Permanently delete a file by its blob URL.
export async function deleteFile(url: string): Promise<void> {
  await del(url);
}

// Generate a download URL for a private blob. The URL embeds the read token
// and should only be returned to authenticated users via a server-side route.
export function generateDownloadUrl(blobUrl: string): string {
  return getDownloadUrl(blobUrl);
}
