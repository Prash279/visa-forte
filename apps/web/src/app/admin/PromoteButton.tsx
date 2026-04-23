'use client'

import { useState } from 'react'

interface Props {
  leadId: string
  alreadyPromoted: boolean
}

export default function PromoteButton({ leadId, alreadyPromoted }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    alreadyPromoted ? 'done' : 'idle'
  )

  async function handlePromote() {
    setStatus('loading')
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/promote`, { method: 'POST' })
      if (res.ok) {
        setStatus('done')
      } else if (res.status === 409) {
        setStatus('done') // already promoted by another session
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <a href="/admin/clients" className="admin-promote-done">
        ✓ In CRM →
      </a>
    )
  }

  if (status === 'error') {
    return (
      <button className="admin-promote-btn admin-promote-btn-error" onClick={handlePromote}>
        Error — retry
      </button>
    )
  }

  return (
    <button
      className="admin-promote-btn"
      onClick={handlePromote}
      disabled={status === 'loading'}
    >
      {status === 'loading' ? 'Promoting…' : 'Promote →'}
    </button>
  )
}
