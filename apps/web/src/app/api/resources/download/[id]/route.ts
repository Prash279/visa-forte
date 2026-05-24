// apps/web/src/app/api/resources/download/[id]/route.ts
// Serves free PDF resources by id.
// Returns 404 if the id is not in resources.json.
// Returns 503 if the file exists in data but hasn't been uploaded yet.
// Logs every successful download to stdout for analytics.

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { findFreeResource } from "@/lib/resources";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // Next.js 15+ requires awaiting params
  const { id } = await context.params;

  const resource = findFreeResource(id);
  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    "downloads",
    resource.fileName
  );

  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(filePath);
  } catch {
    // File registered in data but not yet uploaded — return 503 (not 404,
    // so we can distinguish "unknown resource" from "file pending upload")
    return NextResponse.json(
      { error: "File not available yet — check back soon" },
      { status: 503 }
    );
  }

  console.log(`[resources/download] id=${id} file=${resource.fileName}`);

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${resource.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
