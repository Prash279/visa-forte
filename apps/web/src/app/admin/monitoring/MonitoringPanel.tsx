'use client';

import { useState } from 'react';
import { QUERY_TYPES } from '@/lib/monitoring-schemas';

interface QueryRow {
  id: string;
  queryType: string;
  receivedAt: string;
  responseDeadline: string;
  responseSubmittedAt: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

interface MonitoringRow {
  id: string;
  aorNumber: string | null;
  submittedAt: string;
  expectedDecisionDate: string | null;
  lastStatusCheck: string | null;
  irccPortalStatus: string | null;
  monitoringNotes: string | null;
}

interface ClientRow {
  id: string;
  name: string;
  email: string;
  stage: string;
  serviceTier: string;
  monitoring: MonitoringRow | null;
  queries: QueryRow[];
}

interface Props {
  rows: ClientRow[];
  today: string;
}

export default function MonitoringPanel({ rows, today }: Props) {
  const [clients, setClients] = useState<ClientRow[]>(rows);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Edit monitoring form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MonitoringRow>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // New query form state
  const [queryForms, setQueryForms] = useState<
    Record<
      string,
      {
        queryType: string;
        receivedAt: string;
        responseDeadline: string;
        notes: string;
      }
    >
  >({});
  const [queryAdding, setQueryAdding] = useState<string | null>(null);
  const [queryError, setQueryError] = useState<Record<string, string>>({});

  // Query status update
  const [updatingQueryId, setUpdatingQueryId] = useState<string | null>(null);

  function openEdit(client: ClientRow) {
    setEditingId(client.id);
    setEditForm({
      aorNumber: client.monitoring?.aorNumber ?? '',
      submittedAt: client.monitoring?.submittedAt ?? '',
      expectedDecisionDate: client.monitoring?.expectedDecisionDate ?? '',
      lastStatusCheck: client.monitoring?.lastStatusCheck ?? '',
      irccPortalStatus: client.monitoring?.irccPortalStatus ?? '',
      monitoringNotes: client.monitoring?.monitoringNotes ?? '',
    });
    setEditError('');
  }

  async function saveEdit(clientId: string) {
    setEditSaving(true);
    setEditError('');
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/monitoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = (await res.json()) as {
        monitoring?: MonitoringRow;
        error?: unknown;
      };
      if (!res.ok) {
        setEditError('Could not save. Please check your inputs.');
        return;
      }
      setClients((prev) =>
        prev.map((c) =>
          c.id === clientId
            ? { ...c, monitoring: data.monitoring ?? c.monitoring }
            : c,
        ),
      );
      setEditingId(null);
    } catch {
      setEditError('Network error. Please try again.');
    } finally {
      setEditSaving(false);
    }
  }

  async function addQuery(clientId: string) {
    const form = queryForms[clientId];
    if (!form?.queryType || !form.receivedAt || !form.responseDeadline) {
      setQueryError((prev) => ({
        ...prev,
        [clientId]: 'Query type, received date, and deadline are required.',
      }));
      return;
    }
    setQueryAdding(clientId);
    setQueryError((prev) => ({ ...prev, [clientId]: '' }));
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryType: form.queryType,
          receivedAt: form.receivedAt,
          responseDeadline: form.responseDeadline,
          notes: form.notes || undefined,
        }),
      });
      const data = (await res.json()) as { query?: QueryRow; error?: unknown };
      if (!res.ok) {
        setQueryError((prev) => ({
          ...prev,
          [clientId]: 'Could not add query.',
        }));
        return;
      }
      if (data.query) {
        setClients((prev) =>
          prev.map((c) =>
            c.id === clientId
              ? { ...c, queries: [...c.queries, data.query!] }
              : c,
          ),
        );
        setQueryForms((prev) => ({
          ...prev,
          [clientId]: {
            queryType: '',
            receivedAt: '',
            responseDeadline: '',
            notes: '',
          },
        }));
      }
    } catch {
      setQueryError((prev) => ({ ...prev, [clientId]: 'Network error.' }));
    } finally {
      setQueryAdding(null);
    }
  }

  async function updateQueryStatus(
    clientId: string,
    queryId: string,
    newStatus: 'Open' | 'Responded' | 'Overdue',
    responseSubmittedAt?: string,
  ) {
    setUpdatingQueryId(queryId);
    try {
      const res = await fetch(
        `/api/admin/clients/${clientId}/queries/${queryId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            responseSubmittedAt: responseSubmittedAt || undefined,
          }),
        },
      );
      const data = (await res.json()) as { query?: QueryRow };
      if (res.ok && data.query) {
        setClients((prev) =>
          prev.map((c) =>
            c.id === clientId
              ? {
                  ...c,
                  queries: c.queries.map((q) =>
                    q.id === queryId ? data.query! : q,
                  ),
                }
              : c,
          ),
        );
      }
    } catch {
      // silent — UI stays as-is
    } finally {
      setUpdatingQueryId(null);
    }
  }

  if (clients.length === 0) {
    return (
      <div className="admin-empty">
        <p className="admin-empty-text">
          No clients in Submitted or Decision Pending stage.
        </p>
        <a href="/admin/clients" className="admin-empty-link">
          Go to CRM to change a client&apos;s stage →
        </a>
      </div>
    );
  }

  return (
    <div className="mon-table-wrap">
      <table className="admin-table mon-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Stage</th>
            <th>AOR</th>
            <th>Submitted</th>
            <th>Expected Decision</th>
            <th>IRCC Status</th>
            <th>Open Queries</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const openCount = client.queries.filter(
              (q) => q.status === 'Open',
            ).length;
            const isExpanded = expandedId === client.id;
            const isEditing = editingId === client.id;
            const qForm = queryForms[client.id] ?? {
              queryType: '',
              receivedAt: '',
              responseDeadline: '',
              notes: '',
            };

            return (
              <>
                <tr
                  key={client.id}
                  className={openCount > 0 ? 'mon-row-open-query' : ''}
                >
                  <td>
                    <span className="admin-td-name">{client.name}</span>
                    <span className="mon-email">{client.email}</span>
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${client.stage === 'Submitted' ? 'mon-badge-submitted' : 'mon-badge-decision'}`}
                    >
                      {client.stage}
                    </span>
                  </td>
                  <td className="mon-aor">
                    {client.monitoring?.aorNumber ?? (
                      <span className="mon-empty-cell">—</span>
                    )}
                  </td>
                  <td className="admin-td-date">
                    {client.monitoring?.submittedAt ?? (
                      <span className="mon-empty-cell">Not set</span>
                    )}
                  </td>
                  <td className="admin-td-date">
                    {client.monitoring?.expectedDecisionDate ?? (
                      <span className="mon-empty-cell">—</span>
                    )}
                  </td>
                  <td>
                    {client.monitoring?.irccPortalStatus ? (
                      <span className="mon-ircc-status">
                        {client.monitoring.irccPortalStatus}
                      </span>
                    ) : (
                      <span className="mon-empty-cell">—</span>
                    )}
                  </td>
                  <td>
                    {openCount > 0 ? (
                      <span className="mon-query-badge mon-query-badge-open">
                        {openCount} open
                      </span>
                    ) : (
                      <span className="mon-query-badge mon-query-badge-none">
                        —
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="mon-actions">
                      <button
                        className="mon-btn-edit"
                        onClick={() => {
                          setExpandedId(isExpanded ? null : client.id);
                          if (!isExpanded) openEdit(client);
                          else setEditingId(null);
                        }}
                      >
                        {isExpanded ? 'Close' : 'Edit'}
                      </button>
                    </div>
                  </td>
                </tr>

                {isExpanded && (
                  <tr key={`${client.id}-panel`} className="mon-panel-row">
                    <td colSpan={8}>
                      <div className="mon-panel">
                        {/* Edit monitoring fields */}
                        <div className="mon-panel-section">
                          <h3 className="mon-panel-title">
                            Monitoring Details
                          </h3>
                          {isEditing ? (
                            <div className="mon-edit-form">
                              <div className="mon-field-row">
                                <label className="mon-label">
                                  Submitted Date{' '}
                                  <span className="mon-required">*</span>
                                </label>
                                <input
                                  type="date"
                                  className="mon-input"
                                  value={editForm.submittedAt ?? ''}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      submittedAt: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="mon-field-row">
                                <label className="mon-label">AOR Number</label>
                                <input
                                  type="text"
                                  className="mon-input"
                                  placeholder="e.g. AOR-20260101-XXXXX"
                                  value={editForm.aorNumber ?? ''}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      aorNumber: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="mon-field-row">
                                <label className="mon-label">
                                  Expected Decision Date
                                </label>
                                <input
                                  type="date"
                                  className="mon-input"
                                  value={editForm.expectedDecisionDate ?? ''}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      expectedDecisionDate: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="mon-field-row">
                                <label className="mon-label">
                                  Last Status Check
                                </label>
                                <input
                                  type="date"
                                  className="mon-input"
                                  value={editForm.lastStatusCheck ?? ''}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      lastStatusCheck: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="mon-field-row">
                                <label className="mon-label">
                                  IRCC Portal Status
                                </label>
                                <input
                                  type="text"
                                  className="mon-input"
                                  placeholder="e.g. In Progress"
                                  value={editForm.irccPortalStatus ?? ''}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      irccPortalStatus: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="mon-field-row mon-field-row-full">
                                <label className="mon-label">
                                  Private Notes (not visible to client)
                                </label>
                                <textarea
                                  className="mon-textarea"
                                  rows={3}
                                  placeholder="Internal observations…"
                                  value={editForm.monitoringNotes ?? ''}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      monitoringNotes: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              {editError && (
                                <p className="mon-error">{editError}</p>
                              )}
                              <div className="mon-edit-actions">
                                <button
                                  className="mon-btn-save"
                                  disabled={editSaving || !editForm.submittedAt}
                                  onClick={() => saveEdit(client.id)}
                                >
                                  {editSaving ? 'Saving…' : 'Save Changes'}
                                </button>
                                <button
                                  className="mon-btn-cancel"
                                  onClick={() => setEditingId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mon-details-grid">
                              <div className="mon-detail">
                                <span className="mon-detail-label">
                                  Submitted
                                </span>
                                <span>
                                  {client.monitoring?.submittedAt ?? '—'}
                                </span>
                              </div>
                              <div className="mon-detail">
                                <span className="mon-detail-label">AOR</span>
                                <span>
                                  {client.monitoring?.aorNumber ?? '—'}
                                </span>
                              </div>
                              <div className="mon-detail">
                                <span className="mon-detail-label">
                                  Expected Decision
                                </span>
                                <span>
                                  {client.monitoring?.expectedDecisionDate ??
                                    '—'}
                                </span>
                              </div>
                              <div className="mon-detail">
                                <span className="mon-detail-label">
                                  Last Check
                                </span>
                                <span>
                                  {client.monitoring?.lastStatusCheck ?? '—'}
                                </span>
                              </div>
                              <div className="mon-detail">
                                <span className="mon-detail-label">
                                  IRCC Status
                                </span>
                                <span>
                                  {client.monitoring?.irccPortalStatus ?? '—'}
                                </span>
                              </div>
                              {client.monitoring?.monitoringNotes && (
                                <div className="mon-detail mon-detail-full">
                                  <span className="mon-detail-label">
                                    Notes
                                  </span>
                                  <span>
                                    {client.monitoring.monitoringNotes}
                                  </span>
                                </div>
                              )}
                              <button
                                className="mon-btn-edit"
                                onClick={() => openEdit(client)}
                              >
                                Edit Details
                              </button>
                            </div>
                          )}
                        </div>

                        {/* IRCC Query log */}
                        <div className="mon-panel-section">
                          <h3 className="mon-panel-title">IRCC Queries</h3>
                          {client.queries.length === 0 ? (
                            <p className="mon-no-queries">
                              No queries logged yet.
                            </p>
                          ) : (
                            <div className="mon-query-list">
                              {client.queries.map((q) => {
                                const isOverdue =
                                  q.status === 'Open' &&
                                  q.responseDeadline < today;
                                return (
                                  <div
                                    key={q.id}
                                    className={`mon-query-row ${isOverdue ? 'mon-query-row-overdue' : ''}`}
                                  >
                                    <div className="mon-query-info">
                                      <span className="mon-query-type">
                                        {q.queryType}
                                      </span>
                                      <span className="mon-query-dates">
                                        Received: {q.receivedAt} · Deadline:{' '}
                                        <strong
                                          className={
                                            isOverdue
                                              ? 'mon-deadline-overdue'
                                              : ''
                                          }
                                        >
                                          {q.responseDeadline}
                                        </strong>
                                        {q.responseSubmittedAt &&
                                          ` · Responded: ${q.responseSubmittedAt}`}
                                      </span>
                                      {q.notes && (
                                        <span className="mon-query-notes">
                                          {q.notes}
                                        </span>
                                      )}
                                    </div>
                                    <div className="mon-query-status-wrap">
                                      <span
                                        className={`mon-query-status-badge mon-query-status-${q.status.toLowerCase()}`}
                                      >
                                        {isOverdue && q.status === 'Open'
                                          ? '⚠ Overdue'
                                          : q.status}
                                      </span>
                                      {q.status === 'Open' && (
                                        <button
                                          className="mon-btn-responded"
                                          disabled={updatingQueryId === q.id}
                                          onClick={() =>
                                            updateQueryStatus(
                                              client.id,
                                              q.id,
                                              'Responded',
                                              today,
                                            )
                                          }
                                        >
                                          {updatingQueryId === q.id
                                            ? '…'
                                            : 'Mark Responded'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* New query form */}
                          <div className="mon-new-query-form">
                            <h4 className="mon-new-query-title">
                              Log New IRCC Query
                            </h4>
                            <div className="mon-new-query-fields">
                              <div className="mon-field-row">
                                <label className="mon-label">Query Type</label>
                                <select
                                  className="mon-select"
                                  value={qForm.queryType}
                                  onChange={(e) =>
                                    setQueryForms((prev) => ({
                                      ...prev,
                                      [client.id]: {
                                        ...qForm,
                                        queryType: e.target.value,
                                      },
                                    }))
                                  }
                                >
                                  <option value="">Select…</option>
                                  {QUERY_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="mon-field-row">
                                <label className="mon-label">Received</label>
                                <input
                                  type="date"
                                  className="mon-input"
                                  value={qForm.receivedAt}
                                  onChange={(e) =>
                                    setQueryForms((prev) => ({
                                      ...prev,
                                      [client.id]: {
                                        ...qForm,
                                        receivedAt: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                              <div className="mon-field-row">
                                <label className="mon-label">Deadline</label>
                                <input
                                  type="date"
                                  className="mon-input"
                                  value={qForm.responseDeadline}
                                  onChange={(e) =>
                                    setQueryForms((prev) => ({
                                      ...prev,
                                      [client.id]: {
                                        ...qForm,
                                        responseDeadline: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                              <div className="mon-field-row mon-field-row-full">
                                <label className="mon-label">
                                  Notes (optional)
                                </label>
                                <input
                                  type="text"
                                  className="mon-input"
                                  placeholder="Brief internal note…"
                                  value={qForm.notes}
                                  onChange={(e) =>
                                    setQueryForms((prev) => ({
                                      ...prev,
                                      [client.id]: {
                                        ...qForm,
                                        notes: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                            </div>
                            {queryError[client.id] && (
                              <p className="mon-error">
                                {queryError[client.id]}
                              </p>
                            )}
                            <button
                              className="mon-btn-add-query"
                              disabled={queryAdding === client.id}
                              onClick={() => addQuery(client.id)}
                            >
                              {queryAdding === client.id
                                ? 'Adding…'
                                : '+ Add Query'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
