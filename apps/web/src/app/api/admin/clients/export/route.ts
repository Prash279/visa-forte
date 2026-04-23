import { NextRequest, NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clients } from '../../../../../../drizzle/schema'
import { getCurrentAuthSession } from '@/lib/auth-server'

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (!session?.session || session.user?.email !== 'prashant@visaforte.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

function escapeCsv(value: string | null | undefined): string {
  const s = value ?? ''
  // Wrap in quotes if the value contains commas, quotes, or newlines
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

// GET /api/admin/clients/export — streams all clients as a UTF-8 CSV download
export async function GET(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny

  const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt))

  const header = ['Name', 'Email', 'Phone', 'Service Tier', 'Stage', 'Notes', 'Date Added']
  const rows = allClients.map((c) => [
    escapeCsv(c.name),
    escapeCsv(c.email),
    escapeCsv(c.phone),
    escapeCsv(c.serviceTier),
    escapeCsv(c.stage),
    escapeCsv(c.notes),
    escapeCsv(new Date(c.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })),
  ])

  const csv = [header, ...rows].map((r) => r.join(',')).join('\r\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename=clients.csv',
    },
  })
}