import { redirect } from 'next/navigation'
import { desc } from 'drizzle-orm'
import { getCurrentAuthSession } from '@/lib/auth-server'
import { db } from '@/lib/db'
import { clients } from '../../../../drizzle/schema'
import { PRICING } from '@/lib/pricing'
import CrmTable from './CrmTable'
import './crm.css'

export default async function CrmPage() {
  const authSession = await getCurrentAuthSession()

  if (!authSession?.session) redirect('/login')
  if (authSession.user?.email !== 'prashant@visaforte.com') redirect('/')

  const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt))
  const serviceTiers = Object.keys(PRICING)

  return (
    <div className="admin-wrap">

      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-header-wordmark">Visa Forte</span>
          <span className="admin-header-divider" />
          <span className="admin-header-label">CRM</span>
        </div>
        <div className="admin-header-right">
          <a href="/admin" className="crm-header-nav-link">← Dashboard</a>
          <span className="admin-header-email">{authSession.user?.email}</span>
        </div>
      </header>

      <div className="admin-accent" />

      <main className="admin-main">

        <div className="admin-welcome">
          <p className="admin-welcome-eyebrow">Client Management</p>
          <h1 className="admin-welcome-heading">CRM Pipeline</h1>
          <p className="admin-welcome-sub">
            Track every client from Lead through Completed. Stage changes and notes are
            saved immediately — no refresh needed.
          </p>
        </div>

        <CrmTable initialClients={allClients} serviceTiers={serviceTiers} />

        <div className="admin-footer">
          <p className="admin-footer-text">Visa Forte · Engineered for Passage.</p>
          <a href="/admin" className="admin-footer-link">← Dashboard</a>
        </div>

      </main>
    </div>
  )
}
