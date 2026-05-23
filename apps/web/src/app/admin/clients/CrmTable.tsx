'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Client } from '../../../../drizzle/schema'
import { CRM_STAGES, CRM_FILTER_STAGES } from '@/lib/crm-stages'

interface ClientDoc {
  id: string
  clientId: string
  filename: string
  blobUrl: string
  uploadedAt: string | Date
}

interface MsgRow {
  id: string
  clientId: string
  senderRole: string
  senderId: string
  body: string
  isRead: boolean
  readAt: string | Date | null
  attachmentUrl?: string | null
  createdAt: string | Date
}

const SLA_ITA_MS = 12 * 60 * 60 * 1000  // 12 hours for ITA Window
const SLA_STD_MS = 24 * 60 * 60 * 1000  // 24 hours for all other stages

function isSlaBreached(clientId: string, stage: string, oldestTs: Record<string, number>): boolean {
  const ts = oldestTs[clientId]
  if (!ts) return false
  const threshold = stage === 'ITA Window' ? SLA_ITA_MS : SLA_STD_MS
  return Date.now() - ts > threshold
}

interface Props {
  initialClients: Client[]
  serviceTiers: string[]
  initialDocCounts: Record<string, number>
  initialUnreadFromClient: Record<string, number>
  oldestUnreadClientMsgTs: Record<string, number>
  resumeMap: Record<string, { leadId: string; filename: string }>
}

export default function CrmTable({ initialClients, serviceTiers, initialDocCounts, initialUnreadFromClient, oldestUnreadClientMsgTs, resumeMap }: Props) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingNotes, setEditingNotes] = useState<{ id: string; notes: string } | null>(null)
  const [savingStage, setSavingStage] = useState<string | null>(null)

  // Add client form state
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', serviceTier: '' })
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Document modal state
  const [docCounts, setDocCounts] = useState<Record<string, number>>(initialDocCounts)
  const [docsModal, setDocsModal] = useState<{ clientId: string; clientName: string } | null>(null)
  const [docs, setDocs] = useState<ClientDoc[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')

  // Unread client message counts (Steps 13, 14) — tracks state locally so badge clears on open
  const [unreadFromClient, setUnreadFromClient] = useState<Record<string, number>>(initialUnreadFromClient)

  // Message modal state
  const [msgModal, setMsgModal] = useState<{ clientId: string; clientName: string } | null>(null)
  const [msgThread, setMsgThread] = useState<MsgRow[]>([])
  const [msgThreadLoading, setMsgThreadLoading] = useState(false)
  const [msgBody, setMsgBody] = useState('')
  const [msgAttachFile, setMsgAttachFile] = useState<File | null>(null)
  const [msgSending, setMsgSending] = useState(false)
  const [msgError, setMsgError] = useState('')
  const [msgSent, setMsgSent] = useState(false)
  const [transcriptLoading, setTranscriptLoading] = useState(false)
  const msgAttachRef = useRef<HTMLInputElement>(null)

  // Link-to-portal modal state
  const [linkModal, setLinkModal] = useState<{ clientId: string; email: string } | null>(null)
  const [linkEmail, setLinkEmail] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [linkSuccess, setLinkSuccess] = useState('')

  const notesRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = clients.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    const matchStage = stageFilter === 'all' || c.stage === stageFilter
    return matchSearch && matchStage
  })

  async function updateStage(id: string, stage: string) {
    setSavingStage(id)
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)))
    try {
      await fetch(`/api/admin/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      })
    } finally {
      setSavingStage(null)
    }
  }

  async function saveNotes(id: string) {
    if (!editingNotes || editingNotes.id !== id) return
    const notes = editingNotes.notes
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, notes } : c)))
    setEditingNotes(null)
    await fetch(`/api/admin/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
  }

  async function handleAddClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAddError('')
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.serviceTier) {
      setAddError('Name, email, and service tier are required.')
      return
    }
    setAddLoading(true)
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          phone: addForm.phone.trim() || undefined,
          serviceTier: addForm.serviceTier,
        }),
      })
      const data = (await res.json()) as { client?: Client; error?: unknown }
      if (!res.ok) {
        setAddError('Could not create client. Check the details and try again.')
        return
      }
      if (data.client) {
        setClients((prev) => [data.client as Client, ...prev])
        setDocCounts((prev) => ({ ...prev, [(data.client as Client).id]: 0 }))
      }
      setAddForm({ name: '', email: '', phone: '', serviceTier: '' })
      setShowAddModal(false)
    } catch {
      setAddError('Network error. Please try again.')
    } finally {
      setAddLoading(false)
    }
  }

  // ── Document modal handlers ───────────────────────────────

  async function openDocsModal(clientId: string, clientName: string) {
    setDocsModal({ clientId, clientName })
    setDocs([])
    setUploadFiles([])
    setUploadError('')
    setDocsLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/documents`)
      const data = (await res.json()) as { documents?: ClientDoc[] }
      setDocs(data.documents ?? [])
    } finally {
      setDocsLoading(false)
    }
  }

  function closeDocsModal() {
    setDocsModal(null)
    setDocs([])
    setUploadFiles([])
    setUploadError('')
  }

  async function handleUpload() {
    if (!docsModal || uploadFiles.length === 0) return
    setUploadError('')
    setUploadLoading(true)
    try {
      for (const file of uploadFiles) {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(`/api/admin/clients/${docsModal.clientId}/documents`, {
          method: 'POST',
          body: form,
        })
        const data = (await res.json()) as { document?: ClientDoc; error?: string }
        if (!res.ok) {
          setUploadError(`"${file.name}": ${data.error ?? 'Upload failed.'}`)
          return
        }
        if (data.document) {
          setDocs((prev) => [data.document as ClientDoc, ...prev])
          setDocCounts((prev) => ({
            ...prev,
            [docsModal.clientId]: (prev[docsModal.clientId] ?? 0) + 1,
          }))
        }
      }
      setUploadFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      setUploadError('Network error. Try again.')
    } finally {
      setUploadLoading(false)
    }
  }

  async function handleDeleteDoc(docId: string) {
    if (!docsModal) return
    setDeletingDocId(docId)
    try {
      await fetch(`/api/admin/clients/${docsModal.clientId}/documents/${docId}`, {
        method: 'DELETE',
      })
      setDocs((prev) => prev.filter((d) => d.id !== docId))
      setDocCounts((prev) => ({
        ...prev,
        [docsModal.clientId]: Math.max(0, (prev[docsModal.clientId] ?? 1) - 1),
      }))
    } finally {
      setDeletingDocId(null)
    }
  }

  async function handleDownload(docId: string) {
    if (!docsModal) return
    const res = await fetch(
      `/api/admin/clients/${docsModal.clientId}/documents/${docId}/download`
    )
    const data = (await res.json()) as { url?: string }
    if (data.url) window.open(data.url, '_blank')
  }

  function handleExportCsv() {
    window.open('/api/admin/clients/export', '_blank')
  }

  function openLinkModal(clientId: string, currentEmail: string) {
    setLinkModal({ clientId, email: currentEmail })
    setLinkEmail(currentEmail)
    setLinkError('')
    setLinkSuccess('')
  }

  async function handleLinkPortal(e: React.FormEvent) {
    e.preventDefault()
    if (!linkModal) return
    setLinkError('')
    setLinkSuccess('')
    setLinkLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${linkModal.clientId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: linkEmail.trim() }),
      })
      const data = (await res.json()) as { linked?: boolean; created?: boolean; error?: unknown }
      if (!res.ok) {
        setLinkError('Could not link the portal account. Check the email and try again.')
        return
      }
      // Update the local client record so the badge reflects the linked state
      setClients((prev) =>
        prev.map((c) =>
          c.id === linkModal.clientId ? { ...c, userId: 'linked' } : c
        )
      )
      setLinkSuccess(
        data.created
          ? `Portal account created and invite sent to ${linkEmail}.`
          : `Existing account linked. Client can log in at /portal.`
      )
    } catch {
      setLinkError('Network error. Please try again.')
    } finally {
      setLinkLoading(false)
    }
  }

  async function openMsgModal(clientId: string, clientName: string) {
    setMsgModal({ clientId, clientName })
    setMsgBody('')
    setMsgAttachFile(null)
    setMsgError('')
    setMsgSent(false)
    setMsgThread([])
    setMsgThreadLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/messages`)
      const data = (await res.json()) as { messages?: MsgRow[] }
      setMsgThread(data.messages ?? [])
      // Step 13: mark all client messages for this client as read
      if ((data.messages ?? []).some((m) => m.senderRole === 'client' && !m.isRead)) {
        fetch(`/api/admin/clients/${clientId}/messages/read`, { method: 'PATCH' }).catch(() => {})
        setUnreadFromClient((prev) => ({ ...prev, [clientId]: 0 }))
      }
    } finally {
      setMsgThreadLoading(false)
    }
  }

  function closeMsgModal() {
    setMsgModal(null)
    setMsgThread([])
    setMsgBody('')
    setMsgAttachFile(null)
    setMsgError('')
    setMsgSent(false)
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!msgModal || !msgBody.trim()) return
    setMsgError('')
    setMsgSending(true)
    try {
      let res: Response
      if (msgAttachFile) {
        const form = new FormData()
        form.append('body', msgBody.trim())
        form.append('file', msgAttachFile)
        res = await fetch(`/api/admin/clients/${msgModal.clientId}/messages`, {
          method: 'POST',
          body: form,
        })
      } else {
        res = await fetch(`/api/admin/clients/${msgModal.clientId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: msgBody.trim() }),
        })
      }
      const data = (await res.json()) as { message?: MsgRow; error?: string }
      if (!res.ok) {
        setMsgError(data.error ?? 'Failed to send message. Try again.')
        return
      }
      if (data.message) {
        setMsgThread((prev) => [...prev, data.message as MsgRow])
      }
      setMsgBody('')
      setMsgAttachFile(null)
      if (msgAttachRef.current) msgAttachRef.current.value = ''
      setMsgSent(true)
      setTimeout(() => setMsgSent(false), 3000)
    } catch {
      setMsgError('Network error. Please try again.')
    } finally {
      setMsgSending(false)
    }
  }

  async function handleDownloadTranscript() {
    if (!msgModal) return
    setTranscriptLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${msgModal.clientId}/messages/transcript`)
      const data = (await res.json()) as { url?: string; error?: string }
      if (data.url) {
        window.open(data.url, '_blank')
      } else {
        setMsgError(data.error ?? 'Failed to generate transcript.')
      }
    } catch {
      setMsgError('Network error. Please try again.')
    } finally {
      setTranscriptLoading(false)
    }
  }

  function handleDownloadMsgAttachment(msgId: string, clientId: string) {
    window.open(`/api/admin/clients/${clientId}/messages/${msgId}/attachment`, '_blank')
  }

  function handleDeleteClient(id: string, name: string) {
    setDeleteTarget({ id, name })
    setDeletePassword('')
    setDeleteError('')
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeletingClientId(deleteTarget.id)
    setDeleteError('')
    try {
      const res = await fetch(`/api/admin/clients/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-delete-password': deletePassword },
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setDeleteError(data.error ?? 'Delete failed. Check your password.')
        return
      }
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
      setDeletePassword('')
    } catch {
      setDeleteError('Network error. Try again.')
    } finally {
      setDeletingClientId(null)
    }
  }

  const itaCount = clients.filter((c) => c.stage === 'ITA Window').length

  return (
    <div>

      {/* ITA Window alert banner */}
      {itaCount > 0 && (
        <div className="crm-ita-banner">
          <span className="crm-ita-banner-icon">⚑</span>
          <span className="crm-ita-banner-text">
            {itaCount} client{itaCount > 1 ? 's' : ''} in ITA Window — immediate action required.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="crm-toolbar">
        <div className="crm-toolbar-left">
          <input
            type="text"
            className="crm-search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="crm-filter-pills">
            {CRM_FILTER_STAGES.map((s) => (
              <button
                key={s}
                className={`crm-pill ${stageFilter === s ? 'crm-pill-active' : ''}`}
                onClick={() => setStageFilter(s)}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>
        <div className="crm-toolbar-right">
          <button className="crm-export-btn" onClick={handleExportCsv}>
            ↓ Export CSV
          </button>
          <button className="crm-add-btn" onClick={() => setShowAddModal(true)}>
            + Add Client
          </button>
        </div>
      </div>

      {/* Metric strip */}
      <div className="crm-meta">
        <span className="crm-meta-count">
          {filtered.length} of {clients.length} client{clients.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Client table */}
      {filtered.length === 0 ? (
        <div className="admin-empty">
          <p className="admin-empty-text">
            {clients.length === 0
              ? 'No clients yet. Add one or promote a lead from the dashboard.'
              : 'No clients match the current filter.'}
          </p>
        </div>
      ) : (
        <div className="admin-table-wrap crm-table-wrap">
          <table className="admin-table crm-table">
            <thead>
              <tr>
                {['Name', 'Email', 'Service Tier', 'Stage', 'Added', 'Notes', 'Docs', 'Resume', 'Msg', 'Portal', ''].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const isIta = client.stage === 'ITA Window'
                const isEditingNotes = editingNotes?.id === client.id
                const count = docCounts[client.id] ?? 0
                const hasUnread = (unreadFromClient[client.id] ?? 0) > 0
                const slaBreached = isSlaBreached(client.id, client.stage, oldestUnreadClientMsgTs)

                return (
                  <tr key={client.id} className={isIta ? 'crm-row-ita' : ''}>

                    {/* Name */}
                    <td>
                      <span className="admin-td-name">{client.name}</span>
                      {client.phone && (
                        <span className="crm-td-phone">{client.phone}</span>
                      )}
                    </td>

                    {/* Email */}
                    <td>
                      <a href={`mailto:${client.email}`} className="admin-td-email">
                        {client.email}
                      </a>
                    </td>

                    {/* Service Tier */}
                    <td>
                      <span className="admin-td-service" title={client.serviceTier}>
                        {client.serviceTier}
                      </span>
                    </td>

                    {/* Stage — inline editable dropdown */}
                    <td>
                      <div className="crm-stage-cell">
                        <select
                          className={`crm-stage-select ${isIta ? 'crm-stage-select-ita' : ''}`}
                          value={client.stage}
                          disabled={savingStage === client.id}
                          onChange={(e) => updateStage(client.id, e.target.value)}
                        >
                          {CRM_STAGES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {savingStage === client.id && (
                          <span className="crm-saving-dot" title="Saving…" />
                        )}
                      </div>
                    </td>

                    {/* Date Added */}
                    <td>
                      <span className="admin-td-date">
                        {new Date(client.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>

                    {/* Notes — inline edit */}
                    <td className="crm-notes-cell">
                      {isEditingNotes ? (
                        <div className="crm-notes-edit">
                          <textarea
                            ref={notesRef}
                            className="crm-notes-textarea"
                            value={editingNotes.notes}
                            rows={3}
                            onChange={(e) =>
                              setEditingNotes({ id: client.id, notes: e.target.value })
                            }
                            autoFocus
                          />
                          <div className="crm-notes-actions">
                            <button
                              className="crm-notes-save"
                              onClick={() => saveNotes(client.id)}
                            >
                              Save
                            </button>
                            <button
                              className="crm-notes-cancel"
                              onClick={() => setEditingNotes(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="crm-notes-view">
                          <span className="crm-notes-text">
                            {client.notes ? client.notes : (
                              <span className="crm-notes-empty">—</span>
                            )}
                          </span>
                          <button
                            className="crm-notes-edit-btn"
                            title="Edit notes"
                            onClick={() =>
                              setEditingNotes({ id: client.id, notes: client.notes ?? '' })
                            }
                          >
                            ✎
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Documents */}
                    <td className="crm-docs-col">
                      <button
                        className="crm-docs-btn"
                        onClick={() => openDocsModal(client.id, client.name)}
                      >
                        Docs{count > 0 ? ` (${count})` : ''}
                      </button>
                    </td>

                    {/* Resume — download the original resume from assessment, if available */}
                    <td className="crm-docs-col">
                      {resumeMap[client.email] ? (
                        <a
                          href={`/api/admin/resume/${resumeMap[client.email].leadId}`}
                          className="crm-docs-btn"
                          style={{ textDecoration: 'none', display: 'inline-block' }}
                        >
                          ↓ Resume
                        </a>
                      ) : (
                        <span className="crm-notes-empty">—</span>
                      )}
                    </td>

                    {/* Message — Step 14: saffron dot if client has unread; Step 17: SLA ⚠ */}
                    <td className="crm-msg-col">
                      <div className="crm-msg-cell">
                        {slaBreached && (
                          <span className="crm-sla-warn" title="Unanswered client message past SLA">⚠</span>
                        )}
                        <button
                          className={`crm-msg-btn ${hasUnread ? 'crm-msg-btn-unread' : ''}`}
                          onClick={() => openMsgModal(client.id, client.name)}
                          title={hasUnread ? 'New message from client' : 'Send message to client'}
                        >
                          ✉
                          {hasUnread && <span className="crm-unread-dot" />}
                        </button>
                      </div>
                    </td>

                    {/* Portal link status */}
                    <td className="crm-portal-col">
                      {client.userId ? (
                        <span className="crm-portal-linked">Portal ✓</span>
                      ) : (
                        <button
                          className="crm-portal-link-btn"
                          onClick={() => openLinkModal(client.id, client.email)}
                          title="Link client to portal"
                        >
                          Link Portal
                        </button>
                      )}
                    </td>

                    {/* CanDoc Review */}
                    <td>
                      <button
                        style={{
                          background: 'none',
                          border: '1px solid var(--clr-accent)',
                          color: 'var(--clr-accent)',
                          borderRadius: '4px',
                          padding: '0.25rem 0.6rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                        onClick={() => router.push(`/admin/candoc?clientId=${client.id}&name=${encodeURIComponent(client.name)}`)}
                      >
                        CanDoc Review
                      </button>
                    </td>

                    {/* Delete */}
                    <td className="crm-delete-col">
                      <button
                        className="crm-delete-btn"
                        onClick={() => handleDeleteClient(client.id, client.name)}
                        disabled={deletingClientId === client.id}
                        title="Delete client permanently"
                      >
                        {deletingClientId === client.id ? '…' : '✕'}
                      </button>
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add Client Modal ── */}
      {showAddModal && (
        <div
          className="crm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false)
          }}
        >
          <div className="crm-modal">
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">Add Client</h2>
              <button className="crm-modal-close" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleAddClient} className="crm-modal-form">
              <label className="crm-field-label">
                Full Name *
                <input
                  type="text"
                  className="crm-field-input"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ravi Kumar"
                  required
                />
              </label>

              <label className="crm-field-label">
                Email *
                <input
                  type="email"
                  className="crm-field-input"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="ravi@example.com"
                  required
                />
              </label>

              <label className="crm-field-label">
                Phone (optional)
                <input
                  type="text"
                  className="crm-field-input"
                  value={addForm.phone}
                  onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </label>

              <label className="crm-field-label">
                Service Tier *
                <select
                  className="crm-field-input"
                  value={addForm.serviceTier}
                  onChange={(e) => setAddForm((f) => ({ ...f, serviceTier: e.target.value }))}
                  required
                >
                  <option value="">Select a service…</option>
                  {serviceTiers.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>

              {addError && <p className="crm-form-error">{addError}</p>}

              <div className="crm-modal-footer">
                <button
                  type="button"
                  className="crm-modal-cancel-btn"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="crm-modal-submit-btn"
                  disabled={addLoading}
                >
                  {addLoading ? 'Creating…' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div
          className="crm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) { setDeleteTarget(null); setDeletePassword('') }
          }}
        >
          <div className="crm-modal crm-delete-modal">
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">Delete Client</h2>
              <button
                className="crm-modal-close"
                onClick={() => { setDeleteTarget(null); setDeletePassword('') }}
              >
                ✕
              </button>
            </div>

            <div className="crm-delete-modal-body">
              <p className="crm-delete-warning">
                You are about to permanently delete <strong>{deleteTarget.name}</strong> and all
                their documents. This cannot be undone.
              </p>
              <label className="crm-field-label">
                Admin Password
                <input
                  type="password"
                  className="crm-field-input"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter admin password to confirm"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && deletePassword) handleConfirmDelete() }}
                />
              </label>
              {deleteError && <p className="crm-form-error">{deleteError}</p>}
            </div>

            <div className="crm-modal-footer">
              <button
                type="button"
                className="crm-modal-cancel-btn"
                onClick={() => { setDeleteTarget(null); setDeletePassword('') }}
              >
                Cancel
              </button>
              <button
                className="crm-delete-confirm-btn"
                onClick={handleConfirmDelete}
                disabled={!deletePassword || deletingClientId === deleteTarget.id}
              >
                {deletingClientId === deleteTarget.id ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Link Portal Modal ── */}
      {linkModal && (
        <div
          className="crm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLinkModal(null)
          }}
        >
          <div className="crm-modal">
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">Link Client Portal</h2>
              <button className="crm-modal-close" onClick={() => setLinkModal(null)}>
                ✕
              </button>
            </div>

            {linkSuccess ? (
              <div className="crm-link-success">
                <p className="crm-link-success-text">{linkSuccess}</p>
                <div className="crm-modal-footer">
                  <button className="crm-modal-submit-btn" onClick={() => setLinkModal(null)}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLinkPortal} className="crm-modal-form">
                <p className="crm-link-hint">
                  Enter the email address the client will use to log in. If no account exists,
                  one will be created and an invite email will be sent.
                </p>
                <label className="crm-field-label">
                  Client Email *
                  <input
                    type="email"
                    className="crm-field-input"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    placeholder="client@example.com"
                    required
                    autoFocus
                  />
                </label>
                {linkError && <p className="crm-form-error">{linkError}</p>}
                <div className="crm-modal-footer">
                  <button
                    type="button"
                    className="crm-modal-cancel-btn"
                    onClick={() => setLinkModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="crm-modal-submit-btn"
                    disabled={linkLoading}
                  >
                    {linkLoading ? 'Linking…' : 'Send Invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Message Modal ── */}
      {msgModal && (
        <div
          className="crm-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closeMsgModal() }}
        >
          <div className="crm-modal crm-msg-modal">
            <div className="crm-modal-header">
              <div>
                <p className="crm-docs-modal-eyebrow">Message Thread</p>
                <h2 className="crm-modal-title">{msgModal.clientName}</h2>
              </div>
              <div className="crm-msg-modal-actions">
                {msgThread.length > 0 && (
                  <button
                    className="crm-transcript-btn"
                    onClick={handleDownloadTranscript}
                    disabled={transcriptLoading}
                    title="Download full transcript"
                  >
                    {transcriptLoading ? '…' : '↓ Transcript'}
                  </button>
                )}
                <button className="crm-modal-close" onClick={closeMsgModal}>✕</button>
              </div>
            </div>

            {/* Thread — Step 12: full back-and-forth, Step 15: attachment links */}
            <div className="crm-msg-thread">
              {msgThreadLoading ? (
                <p className="crm-doc-empty">Loading…</p>
              ) : msgThread.length === 0 ? (
                <p className="crm-doc-empty">No messages yet. Send the first one below.</p>
              ) : (
                msgThread.map((m) => (
                  <div
                    key={m.id}
                    className={`crm-msg-bubble ${m.senderRole === 'admin' ? 'crm-msg-bubble-admin' : 'crm-msg-bubble-client'}`}
                  >
                    <p className="crm-msg-bubble-sender">
                      {m.senderRole === 'admin' ? 'You (Prashant)' : 'Client'}
                    </p>
                    <p className="crm-msg-bubble-body">{m.body}</p>
                    {m.attachmentUrl && (
                      <button
                        className="crm-msg-attachment-btn"
                        onClick={() => handleDownloadMsgAttachment(m.id, msgModal.clientId)}
                      >
                        ↓ Attachment
                      </button>
                    )}
                    <p className="crm-msg-bubble-time">
                      {new Date(m.createdAt).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Compose — Step 15: optional file attachment */}
            <form className="crm-msg-compose" onSubmit={handleSendMessage}>
              <textarea
                className="crm-msg-textarea"
                placeholder="Write a message to the client…"
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                rows={3}
                maxLength={4000}
                required
              />
              <div className="crm-msg-attach-row">
                <input
                  ref={msgAttachRef}
                  type="file"
                  id="crm-msg-attach-input"
                  className="crm-upload-input"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.csv"
                  onChange={(e) => setMsgAttachFile(e.target.files?.[0] ?? null)}
                />
                <label htmlFor="crm-msg-attach-input" className="crm-msg-attach-label">
                  {msgAttachFile ? `📎 ${msgAttachFile.name}` : '+ Attach file'}
                </label>
                {msgAttachFile && (
                  <button
                    type="button"
                    className="crm-msg-attach-clear"
                    onClick={() => { setMsgAttachFile(null); if (msgAttachRef.current) msgAttachRef.current.value = '' }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {msgError && <p className="crm-form-error">{msgError}</p>}
              <div className="crm-modal-footer" style={{ paddingTop: 0 }}>
                <button type="button" className="crm-modal-cancel-btn" onClick={closeMsgModal}>
                  Close
                </button>
                <button type="submit" className="crm-modal-submit-btn" disabled={msgSending || !msgBody.trim()}>
                  {msgSending ? 'Sending…' : msgSent ? 'Sent ✓' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Documents Modal ── */}
      {docsModal && (
        <div
          className="crm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDocsModal()
          }}
        >
          <div className="crm-modal crm-docs-modal">
            <div className="crm-modal-header">
              <div>
                <p className="crm-docs-modal-eyebrow">Documents</p>
                <h2 className="crm-modal-title">{docsModal.clientName}</h2>
              </div>
              <button className="crm-modal-close" onClick={closeDocsModal}>
                ✕
              </button>
            </div>

            <div className="crm-docs-body">

              {/* Upload area */}
              <div className="crm-upload-area">
                <p className="crm-upload-label">Upload a document</p>
                <div className="crm-upload-row">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="crm-upload-input"
                    id="crm-file-input"
                    multiple
                    onChange={(e) => setUploadFiles(Array.from(e.target.files ?? []))}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.csv"
                  />
                  <label htmlFor="crm-file-input" className="crm-upload-trigger">
                    {uploadFiles.length === 0
                      ? 'Choose file…'
                      : uploadFiles.length === 1
                      ? uploadFiles[0].name
                      : `${uploadFiles.length} files selected`}
                  </label>
                  <button
                    className="crm-upload-submit"
                    onClick={handleUpload}
                    disabled={uploadFiles.length === 0 || uploadLoading}
                  >
                    {uploadLoading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
                {uploadError && <p className="crm-form-error">{uploadError}</p>}
                <p className="crm-upload-hint">PDF, Word, Excel, or image · Max 20 MB · Select multiple files at once</p>
              </div>

              {/* Document list */}
              <div className="crm-doc-list">
                {docsLoading ? (
                  <p className="crm-doc-empty">Loading documents…</p>
                ) : docs.length === 0 ? (
                  <p className="crm-doc-empty">No documents uploaded yet.</p>
                ) : (
                  docs.map((doc) => (
                    <div key={doc.id} className="crm-doc-item">
                      <div className="crm-doc-item-info">
                        <span className="crm-doc-item-name" title={doc.filename}>
                          {doc.filename}
                        </span>
                        <span className="crm-doc-item-date">
                          {new Date(doc.uploadedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="crm-doc-item-actions">
                        <button
                          className="crm-doc-download-btn"
                          onClick={() => handleDownload(doc.id)}
                          title="Download"
                        >
                          ↓ Download
                        </button>
                        <button
                          className="crm-doc-delete-btn"
                          onClick={() => handleDeleteDoc(doc.id)}
                          disabled={deletingDocId === doc.id}
                          title="Delete"
                        >
                          {deletingDocId === doc.id ? '…' : '✕'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}