import { NextRequest, NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clientDocuments, clients } from '../../../../../../../drizzle/schema'
import { getCurrentAuthSession } from '@/lib/auth-server'
import { uploadFile } from '@/lib/storage'

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// GET /api/admin/clients/[id]/documents — list all documents for a client
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id } = await params

  try {
    const docs = await db
      .select()
      .from(clientDocuments)
      .where(eq(clientDocuments.clientId, id))
      .orderBy(desc(clientDocuments.uploadedAt))

    return NextResponse.json({ documents: docs })
  } catch (err) {
    console.error('Document list failed:', err)
    return NextResponse.json({ error: 'Could not fetch documents' }, { status: 500 })
  }
}

// POST /api/admin/clients/[id]/documents — upload a file to Vercel Blob and record it
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id } = await params

  // Verify client exists
  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const filename = (file as File).name ?? 'document'
  if (filename.length > 255) {
    return NextResponse.json({ error: 'Filename too long' }, { status: 400 })
  }

  // Limit individual file size to 20 MB
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'File exceeds 20 MB limit' }, { status: 400 })
  }

  const contentType = file.type || 'application/octet-stream'
  const pathname = `clients/${id}/${Date.now()}-${filename}`

  try {
    const { url } = await uploadFile(pathname, await file.arrayBuffer(), contentType)

    const [doc] = await db
      .insert(clientDocuments)
      .values({ clientId: id, filename, blobUrl: url })
      .returning()

    return NextResponse.json({ document: doc }, { status: 201 })
  } catch (err) {
    console.error('Document upload failed:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}