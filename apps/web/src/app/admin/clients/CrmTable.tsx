'use client'

import { useState, useRef } from 'react'
import type { Client } from '../../../../drizzle/schema'
import { CRM_STAGES, CRM_FILTER_STAGES } from '@/lib/crm-stages'

interface ClientDoc {
  id: string
  clientId: string
  filename: string
  blobUrl: string
  uploadedAt: string | Date
}

interface Props {
  initialClients: Client[]
  serviceTiers: string[]
  initialDocCounts: Record<string, number>
}

export default function CrmTable({ initialClients, serviceTiers, initialDocCounts }: Props) {
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
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')

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
    setUploadFile(null)
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
    setUploadFile(null)
    setUploadError('')
  }

  async function handleUpload() {
    if (!docsModal || !uploadFile) return
    setUploadError('')
    setUploadLoading(true)
    const form = new FormData()
    form.append('file', uploadFile)
    try {
      const res = await fetch(`/api/admin/clients/${docsModal.clientId}/documents`, {
        method: 'POST',
        body: form,
      })
      const data = (await res.json()) as { document?: ClientDoc; error?: string }
      if (!res.ok) {
        setUploadError(data.error ?? 'Upload failed. Try again.')
        return
      }
      if (data.document) {
        setDocs((prev) => [data.document as ClientDoc, ...prev])
        setDocCounts((prev) => ({
          ...prev,
          [docsModal.clientId]: (prev[docsModal.clientId] ?? 0) + 1,
        }))
      }
      setUploadFile(null)
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
                {['Name', 'Email', 'Service Tier', 'Stage', 'Added', 'Notes', 'Docs', ''].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const isIta = client.stage === 'ITA Window'
                const isEditingNotes = editingNotes?.id === client.id
                const count = docCounts[client.id] ?? 0

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
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.csv"
                  />
                  <label htmlFor="crm-file-input" className="crm-upload-trigger">
                    {uploadFile ? uploadFile.name : 'Choose file…'}
                  </label>
                  <button
                    className="crm-upload-submit"
                    onClick={handleUpload}
                    disabled={!uploadFile || uploadLoading}
                  >
                    {uploadLoading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
                {uploadError && <p className="crm-form-error">{uploadError}</p>}
                <p className="crm-upload-hint">PDF, Word, Excel, or image · Max 20 MB</p>
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