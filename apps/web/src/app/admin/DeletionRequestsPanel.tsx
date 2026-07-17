'use client';

import { useState } from 'react';

interface PendingDeletion {
  requestId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  requestedAt: string;
}

interface Props {
  initialRequests: PendingDeletion[];
}

type RowMode = 'idle' | 'rejecting' | 'loading';

interface RowState {
  mode: RowMode;
  notes: string;
  error: string;
}

export default function DeletionRequestsPanel({ initialRequests }: Props) {
  const [requests, setRequests] = useState(initialRequests);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  function getRow(id: string): RowState {
    return rowStates[id] ?? { mode: 'idle', notes: '', error: '' };
  }

  function patchRow(id: string, patch: Partial<RowState>) {
    setRowStates((prev) => ({ ...prev, [id]: { ...getRow(id), ...patch } }));
  }

  async function handleAction(requestId: string, action: 'approve' | 'reject') {
    const row = getRow(requestId);
    patchRow(requestId, { mode: 'loading', error: '' });

    try {
      const res = await fetch(`/api/admin/deletion-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          adminNotes: action === 'reject' ? row.notes || undefined : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        patchRow(requestId, {
          mode: action === 'reject' ? 'rejecting' : 'idle',
          error: data.error ?? 'Action failed. Please try again.',
        });
        return;
      }
      setRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    } catch {
      patchRow(requestId, {
        mode: action === 'reject' ? 'rejecting' : 'idle',
        error: 'Network error. Please try again.',
      });
    }
  }

  if (requests.length === 0) {
    return (
      <div className="admin-empty">
        <p className="admin-empty-text">No pending data deletion requests.</p>
      </div>
    );
  }

  return (
    <div className="admin-deletion-list">
      {requests.map((r) => {
        const row = getRow(r.requestId);
        const isLoading = row.mode === 'loading';

        return (
          <div key={r.requestId} className="admin-deletion-row">
            <div className="admin-deletion-info">
              <p className="admin-deletion-name">{r.clientName}</p>
              <a
                href={`mailto:${r.clientEmail}`}
                className="admin-deletion-email"
              >
                {r.clientEmail}
              </a>
              <p className="admin-deletion-date">
                Requested{' '}
                {new Date(r.requestedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="admin-deletion-actions">
              {row.error && <p className="admin-deletion-error">{row.error}</p>}

              {row.mode === 'rejecting' ? (
                <div className="admin-deletion-reject-form">
                  <textarea
                    className="admin-deletion-notes"
                    placeholder="Reason for rejection (optional, sent to audit log)"
                    value={row.notes}
                    onChange={(e) =>
                      patchRow(r.requestId, { notes: e.target.value })
                    }
                    rows={2}
                    maxLength={500}
                  />
                  <div className="admin-deletion-reject-btns">
                    <button
                      className="admin-deletion-confirm-reject-btn"
                      onClick={() => handleAction(r.requestId, 'reject')}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Rejecting…' : 'Confirm Rejection'}
                    </button>
                    <button
                      className="admin-deletion-cancel-btn"
                      onClick={() =>
                        patchRow(r.requestId, { mode: 'idle', error: '' })
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="admin-deletion-btns">
                  <button
                    className="admin-deletion-approve-btn"
                    onClick={() => handleAction(r.requestId, 'approve')}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing…' : 'Approve & Delete'}
                  </button>
                  <button
                    className="admin-deletion-reject-btn-action"
                    onClick={() => patchRow(r.requestId, { mode: 'rejecting' })}
                    disabled={isLoading}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
