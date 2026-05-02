'use client'

import { useState, useRef, useEffect } from 'react'
import type { ChecklistItem } from '@/lib/document-checklist'

interface MsgRow {
  id: string
  senderRole: string
  body: string
  createdAt: string | Date
}

interface UploadedDoc {
  id: string
  filename: string
  uploadedAt: Date
}

interface Props {
  client: {
    id: string
    name: string
    email: string
    serviceTier: string
    stage: string
    consentGivenAt: Date | null
  }
  checklist: ChecklistItem[]
  uploadedMap: Record<string, UploadedDoc>
}

export default function PortalDashboard({ client, checklist, uploadedMap }: Props) {
  const [uploaded, setUploaded] = useState<Record<string, UploadedDoc>>(uploadedMap)
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingDocType = useRef<string | null>(null)

  // Messaging state
  const [msgThread, setMsgThread] = useState<MsgRow[]>([])
  const [msgLoading, setMsgLoading] = useState(true)
  const [replyBody, setReplyBody] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [replyError, setReplyError] = useState('')
  const [replied, setReplied] = useState(false)

  // Data deletion state
  const [deletionStatus, setDeletionStatus] = useState<'idle' | 'pending' | 'confirming' | 'submitting' | 'done'>('idle')
  const [deletionError, setDeletionError] = useState('')

  useEffect(() => {
    fetch('/api/portal/messages')
      .then((r) => r.json())
      .then((data: { messages?: MsgRow[] }) => {
        const thread = data.messages ?? []
        setMsgThread(thread)
        setReplied(thread.some((m) => m.senderRole === 'client'))
      })
      .catch(() => {})
      .finally(() => setMsgLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/portal/deletion-request')
      .then((r) => r.json())
      .then((data: { hasPending?: boolean }) => {
        if (data.hasPending) setDeletionStatus('pending')
      })
      .catch(() => {})
  }, [])

  const uploadedCount = checklist.filter((item) => uploaded[item.id]).length
  const totalCount = checklist.length
  const progressPct = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 0

  const isIta = client.stage === 'ITA Window'

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyBody.trim()) return
    setReplyError('')
    setReplySending(true)
    try {
      const res = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyBody.trim() }),
      })
      const data = (await res.json()) as { message?: MsgRow; error?: string }
      if (!res.ok) {
        setReplyError(data.error ?? 'Could not send reply. Please try again.')
        return
      }
      if (data.message) {
        setMsgThread((prev) => [...prev, data.message as MsgRow])
      }
      setReplyBody('')
      setReplied(true)
    } catch {
      setReplyError('Network error. Please try again.')
    } finally {
      setReplySending(false)
    }
  }

  function triggerUpload(docTypeId: string) {
    pendingDocType.current = docTypeId
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const docType = pendingDocType.current
    if (!file || !docType) return

    setUploading(docType)
    setUploadError(null)

    const form = new FormData()
    form.append('docType', docType)
    form.append('file', file)

    try {
      const res = await fetch('/api/portal/documents', {
        method: 'POST',
        body: form,
      })
      const data = (await res.json()) as {
        doc?: { id: string; filename: string; uploadedAt: string }
        error?: string
      }
      if (!res.ok) {
        setUploadError(data.error ?? 'Upload failed. Please try again.')
        return
      }
      if (data.doc) {
        setUploaded((prev) => ({
          ...prev,
          [docType]: {
            id: data.doc!.id,
            filename: data.doc!.filename,
            uploadedAt: new Date(data.doc!.uploadedAt),
          },
        }))
      }
    } catch {
      setUploadError('Network error. Please try again.')
    } finally {
      setUploading(null)
      pendingDocType.current = null
    }
  }

  return (
    <div className="portal-content">

      {/* Welcome header */}
      <div className="portal-welcome">
        <p className="portal-eyebrow">Client Portal</p>
        <h1 className="portal-heading">Welcome, {client.name}.</h1>
        <p className="portal-sub">{client.serviceTier}</p>
      </div>

      {/* Stage card */}
      <div className={`portal-stage-card ${isIta ? 'portal-stage-card-ita' : ''}`}>
        <div className="portal-stage-card-left">
          <p className="portal-stage-label">Current Stage</p>
          <p className="portal-stage-value">{client.stage}</p>
        </div>
        {isIta && (
          <div className="portal-stage-ita-flag">
            <span>⚑</span>
            <span>ITA Window — action required</span>
          </div>
        )}
      </div>

      {/* Document checklist */}
      <div className="portal-section">
        <div className="portal-section-header">
          <h2 className="portal-section-title">Document Checklist</h2>
          <span className="portal-progress-label">
            {uploadedCount} of {totalCount} uploaded
          </span>
        </div>

        {/* Progress bar */}
        <div className="portal-progress-bar-track">
          <div
            className="portal-progress-bar-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {checklist.length === 0 ? (
          <p className="portal-empty">No documents required for this service tier.</p>
        ) : (
          <div className="portal-checklist">
            {checklist.map((item) => {
              const doc = uploaded[item.id]
              const isUploading = uploading === item.id
              return (
                <div
                  key={item.id}
                  className={`portal-checklist-row ${doc ? 'portal-checklist-row-done' : ''}`}
                >
                  <div className="portal-checklist-icon">
                    {doc ? (
                      <span className="portal-check-icon">✓</span>
                    ) : (
                      <span className="portal-pending-icon">○</span>
                    )}
                  </div>
                  <div className="portal-checklist-info">
                    <p className="portal-checklist-label">{item.label}</p>
                    {doc && (
                      <p className="portal-checklist-meta">
                        {doc.filename} &middot;{' '}
                        {new Date(doc.uploadedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                  <div className="portal-checklist-action">
                    {doc ? (
                      <span className="portal-uploaded-badge">Uploaded</span>
                    ) : (
                      <button
                        className="portal-upload-btn"
                        disabled={isUploading}
                        onClick={() => triggerUpload(item.id)}
                      >
                        {isUploading ? 'Uploading…' : 'Upload'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {uploadError && <p className="portal-upload-error">{uploadError}</p>}
      </div>

      {/* Hidden file input — shared across all checklist items */}
      <input
        ref={fileInputRef}
        type="file"
        className="portal-hidden-input"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={handleFileChange}
      />

      {/* Messages */}
      <div className="portal-section">
        <div className="portal-section-header">
          <h2 className="portal-section-title">Messages</h2>
        </div>

        {msgLoading ? (
          <p className="portal-msg-empty">Loading…</p>
        ) : msgThread.length === 0 ? (
          <p className="portal-msg-empty">No messages yet. Prashant will reach out here when needed.</p>
        ) : (
          <div className="portal-msg-thread">
            {msgThread.map((m) => (
              <div
                key={m.id}
                className={`portal-msg-bubble ${m.senderRole === 'admin' ? 'portal-msg-bubble-admin' : 'portal-msg-bubble-client'}`}
              >
                <p className="portal-msg-bubble-sender">
                  {m.senderRole === 'admin' ? 'Prashant' : 'You'}
                </p>
                <p className="portal-msg-bubble-body">{m.body}</p>
                <p className="portal-msg-bubble-time">
                  {new Date(m.createdAt).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            ))}

            {/* Reply form — shown only if there's an admin message and client hasn't replied yet */}
            {msgThread.some((m) => m.senderRole === 'admin') && (
              replied ? (
                <p className="portal-msg-replied">Replied ✓ — Prashant will get back to you soon.</p>
              ) : (
                <form className="portal-msg-reply-form" onSubmit={handleReply}>
                  <textarea
                    className="portal-msg-textarea"
                    placeholder="Type your reply…"
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={3}
                    maxLength={4000}
                    required
                  />
                  {replyError && <p className="portal-upload-error">{replyError}</p>}
                  <button
                    type="submit"
                    className="portal-msg-reply-btn"
                    disabled={replySending || !replyBody.trim()}
                  >
                    {replySending ? 'Sending…' : 'Send Reply'}
                  </button>
                </form>
              )
            )}
          </div>
        )}
      </div>

      {/* Data & Privacy */}
      <div className="portal-section">
        <div className="portal-section-header">
          <h2 className="portal-section-title">Data &amp; Privacy</h2>
        </div>
        <div className="portal-privacy-card">
          <div className="portal-privacy-row">
            <span className="portal-privacy-label">Name</span>
            <span className="portal-privacy-value">{client.name}</span>
          </div>
          <div className="portal-privacy-row">
            <span className="portal-privacy-label">Email</span>
            <span className="portal-privacy-value">{client.email}</span>
          </div>
          <div className="portal-privacy-row">
            <span className="portal-privacy-label">Service</span>
            <span className="portal-privacy-value">{client.serviceTier}</span>
          </div>
          <div className="portal-privacy-row">
            <span className="portal-privacy-label">Consent given</span>
            <span className="portal-privacy-value">
              {client.consentGivenAt
                ? new Date(client.consentGivenAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'Not recorded'}
            </span>
          </div>
        </div>

        {deletionStatus === 'idle' && (
          <button className="portal-deletion-btn" onClick={() => setDeletionStatus('confirming')}>
            Request Data Deletion
          </button>
        )}

        {(deletionStatus === 'confirming' || deletionStatus === 'submitting') && (
          <div className="portal-deletion-confirm">
            <p className="portal-deletion-confirm-text">
              This will permanently delete your account, all uploaded documents, and your case data.
              Prashant will review the request before any data is removed.
            </p>
            {deletionError && <p className="portal-upload-error">{deletionError}</p>}
            <div className="portal-deletion-confirm-actions">
              <button
                className="portal-deletion-submit-btn"
                disabled={deletionStatus === 'submitting'}
                onClick={async () => {
                  setDeletionStatus('submitting')
                  setDeletionError('')
                  try {
                    const res = await fetch('/api/portal/deletion-request', { method: 'POST' })
                    const data = await res.json() as { error?: string }
                    if (!res.ok) {
                      setDeletionError(data.error ?? 'Could not submit request. Please try again.')
                      setDeletionStatus('confirming')
                      return
                    }
                    setDeletionStatus('done')
                  } catch {
                    setDeletionError('Network error. Please try again.')
                    setDeletionStatus('confirming')
                  }
                }}
              >
                Confirm Deletion Request
              </button>
              <button className="portal-deletion-cancel-btn" onClick={() => setDeletionStatus('idle')}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {(deletionStatus === 'pending' || deletionStatus === 'done') && (
          <p className="portal-deletion-pending">
            Your data deletion request has been submitted. Prashant will review and process it within 30 days.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="portal-footer">
        <p className="portal-footer-text">
          Questions about your file? Email{' '}
          <a href="mailto:prashant@visaforte.com" className="portal-footer-link">
            prashant@visaforte.com
          </a>
        </p>
        <p className="portal-footer-tagline">Visa Forte · Engineered for Passage.</p>
      </div>

    </div>
  )
}