'use client';

import { useState } from 'react';
import PromoteButton from './PromoteButton';

interface SerializedLead {
  id: string;
  name: string;
  email: string;
  serviceInterest: string;
  notes: string | null;
  referralSource: string | null;
  resumeFilename: string | null;
  status: string;
  createdAt: string;
}

interface Props {
  leads: SerializedLead[];
}

export default function LeadsTable({ leads: initialLeads }: Props) {
  const [leads, setLeads] = useState(initialLeads);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openDeleteModal(id: string, name: string) {
    setDeleteTarget({ id, name });
    setDeletePassword('');
    setDeleteError('');
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setDeleteError('');
    try {
      const res = await fetch(`/api/admin/leads/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-delete-password': deletePassword },
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setDeleteError(data.error ?? 'Delete failed. Check your password.');
        return;
      }
      setLeads((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeletePassword('');
    } catch {
      setDeleteError('Network error. Try again.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {[
                'Name',
                'Email',
                'Service Interest',
                'Source',
                'CRS Score',
                'Resume',
                'Submitted',
                'Status',
                'Action',
                '',
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const crsMatch = lead.notes?.match(/CRS Score:\s*(\d+)/);
              const crsScore = crsMatch ? crsMatch[1] : null;
              const resumeDownloadUrl = lead.resumeFilename
                ? `/api/admin/resume/${lead.id}`
                : null;
              return (
                <tr key={lead.id}>
                  <td>
                    <span className="admin-td-name">{lead.name}</span>
                  </td>
                  <td>
                    <a href={`mailto:${lead.email}`} className="admin-td-email">
                      {lead.email}
                    </a>
                  </td>
                  <td>
                    <span
                      className="admin-td-service"
                      title={lead.serviceInterest}
                    >
                      {lead.serviceInterest}
                    </span>
                  </td>
                  <td>
                    <span
                      className="admin-td-date"
                      title={lead.referralSource ?? undefined}
                    >
                      {lead.referralSource ?? (
                        <span style={{ color: 'var(--muted, #aaa)' }}>—</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <span
                      className="admin-td-date"
                      title={lead.notes ?? undefined}
                    >
                      {crsScore ?? (
                        <span style={{ color: 'var(--muted, #aaa)' }}>—</span>
                      )}
                    </span>
                  </td>
                  <td>
                    {resumeDownloadUrl ? (
                      <a
                        href={resumeDownloadUrl}
                        className="admin-td-email"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Download{' '}
                        <span
                          style={{
                            fontSize: '0.5rem',
                            fontWeight: 600,
                            letterSpacing: '0.12em',
                            verticalAlign: 'middle',
                          }}
                        >
                          ↓
                        </span>
                      </a>
                    ) : (
                      <span style={{ color: 'var(--muted, #aaa)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className="admin-td-date">
                      {new Date(lead.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${lead.status === 'new' ? 'admin-badge-new' : lead.status === 'converted' ? 'admin-badge-paid' : 'admin-badge-other'}`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td>
                    <PromoteButton
                      leadId={lead.id}
                      alreadyPromoted={lead.status === 'converted'}
                    />
                  </td>
                  <td className="crm-delete-col">
                    <button
                      className="crm-delete-btn"
                      onClick={() => openDeleteModal(lead.id, lead.name)}
                      disabled={deletingId === lead.id}
                      title="Delete lead permanently"
                    >
                      {deletingId === lead.id ? '…' : '✕'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(12, 35, 64, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteTarget(null);
              setDeletePassword('');
            }
          }}
        >
          <div className="crm-modal crm-delete-modal">
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">Delete Lead</h2>
              <button
                className="crm-modal-close"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeletePassword('');
                }}
              >
                ✕
              </button>
            </div>
            <div className="crm-delete-modal-body">
              <p className="crm-delete-warning">
                You are about to permanently delete{' '}
                <strong>{deleteTarget.name}</strong>. This cannot be undone.
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && deletePassword)
                      handleConfirmDelete();
                  }}
                />
              </label>
              {deleteError && <p className="crm-form-error">{deleteError}</p>}
            </div>
            <div className="crm-modal-footer">
              <button
                type="button"
                className="crm-modal-cancel-btn"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeletePassword('');
                }}
              >
                Cancel
              </button>
              <button
                className="crm-delete-confirm-btn"
                onClick={handleConfirmDelete}
                disabled={!deletePassword || deletingId === deleteTarget.id}
              >
                {deletingId === deleteTarget.id
                  ? 'Deleting…'
                  : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
