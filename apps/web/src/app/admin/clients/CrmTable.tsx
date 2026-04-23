'use client'

import { useState, useRef } from 'react'
import type { Client } from '../../../../drizzle/schema'
import { CRM_STAGES, CRM_FILTER_STAGES } from '@/lib/crm-stages'

interface Props {
  initialClients: Client[]
  serviceTiers: string[]
}

export default function CrmTable({ initialClients, serviceTiers }: Props) {
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

  const notesRef = useRef<HTMLTextAreaElement>(null)

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

  async function handleAddClient(e: React.FormEvent) {
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
      }
      setAddForm({ name: '', email: '', phone: '', serviceTier: '' })
      setShowAddModal(false)
    } catch {
      setAddError('Network error. Please try again.')
    } finally {
      setAddLoading(false)
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
        <button className="crm-add-btn" onClick={() => setShowAddModal(true)}>
          + Add Client
        </button>
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
                {['Name', 'Email', 'Service Tier', 'Stage', 'Added', 'Notes'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const isIta = client.stage === 'ITA Window'
                const isEditingNotes = editingNotes?.id === client.id

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

                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Client Modal */}
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

    </div>
  )
}
