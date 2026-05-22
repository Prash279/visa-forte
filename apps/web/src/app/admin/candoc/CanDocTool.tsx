'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import type { FindingsJson } from '@/lib/candoc-types'
import './candoc.css'

type ReviewStatus = 'none' | 'pending' | 'analyzing' | 'analyzed' | 'annotating' | 'complete' | 'error'

interface StatusResponse {
  id?: string
  status: ReviewStatus
  version?: number
  rawFindings?: FindingsJson
  annotatedFindings?: FindingsJson
  signoffChecklist?: Record<string, boolean>
  errorMessage?: string
}

const POLL_MS = 3000

const STATUS_LABEL: Record<ReviewStatus, string> = {
  none: 'No Review',
  pending: 'Pending',
  analyzing: 'Analyzing…',
  analyzed: 'Ready to Annotate',
  annotating: 'Annotating',
  complete: 'Complete',
  error: 'Error',
}

export default function CanDocTool(): React.JSX.Element {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('clientId') ?? ''
  const clientName = searchParams.get('name') ?? 'Client'

  const [status, setStatus] = useState<ReviewStatus>('none')
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [findings, setFindings] = useState<FindingsJson | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!clientId) return
    try {
      const res = await fetch(`/api/admin/candoc/status?clientId=${clientId}`)
      const data: StatusResponse = await res.json()
      setStatus(data.status)
      if (data.annotatedFindings) setFindings(data.annotatedFindings)
      else if (data.rawFindings) setFindings(data.rawFindings)
      if (data.errorMessage) setError(data.errorMessage)
      if (data.id) setReviewId(data.id)
      if (['analyzed', 'annotating', 'complete', 'error', 'none'].includes(data.status)) {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      }
    } catch { /* keep polling on transient network errors */ }
  }, [clientId])

  useEffect(() => { void fetchStatus() }, [fetchStatus])

  const handleTrigger = async (): Promise<void> => {
    setTriggering(true)
    setError(null)
    try {
      const trigRes = await fetch('/api/admin/candoc/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const { reviewId: newId, error: trigErr } = await trigRes.json() as { reviewId?: string; error?: string }
      if (trigErr || !newId) { setError(trigErr ?? 'Trigger failed'); return }

      setReviewId(newId)
      setStatus('analyzing')
      void fetch('/api/admin/candoc/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: newId }),
      })
      pollRef.current = setInterval(() => { void fetchStatus() }, POLL_MS)
    } finally {
      setTriggering(false)
    }
  }

  return (
    <div className="candoc-wrap">
      <div className="candoc-header">
        <button className="candoc-back" onClick={() => history.back()}>← Back</button>
        <h1>CanDoc Review — {clientName}</h1>
        <span className={`candoc-status-badge ${status}`}>{STATUS_LABEL[status]}</span>
      </div>

      {['none', 'error'].includes(status) && (
        <button
          className="candoc-trigger-btn"
          disabled={triggering || !clientId}
          onClick={() => void handleTrigger()}
        >
          {triggering ? 'Starting…' : 'Run CanDoc Review'}
        </button>
      )}

      {status === 'analyzing' && (
        <p style={{ color: 'var(--clr-text-secondary)', marginTop: '1rem' }}>
          Claude is reviewing all documents across 17 SOP layers. This takes up to 2 minutes…
        </p>
      )}

      {error && <div className="candoc-error">{error}</div>}

      {findings && ['analyzed', 'annotating', 'complete'].includes(status) && (
        <FindingsView
          findings={findings}
          reviewId={reviewId!}
          clientId={clientId}
          status={status}
          onStatusChange={setStatus}
          onFindingsChange={setFindings}
        />
      )}
    </div>
  )
}

interface FindingsViewProps {
  findings: FindingsJson
  reviewId: string
  clientId: string
  status: ReviewStatus
  onStatusChange: (s: ReviewStatus) => void
  onFindingsChange: (f: FindingsJson) => void
}

function FindingsView({ findings, reviewId, clientId, status, onStatusChange, onFindingsChange }: FindingsViewProps) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [signingOff, setSigningOff] = useState(false)
  const [signoffError, setSignoffError] = useState<string | null>(null)
  const [local, setLocal] = useState<FindingsJson>(findings)

  const allLayersChecked = findings.sopLayers.every((l) => checklist[l.layer])

  const handleAnnotation = (li: number, fi: number, value: string): void => {
    const updated: FindingsJson = {
      ...local,
      sopLayers: local.sopLayers.map((layer, i) =>
        i !== li ? layer : {
          ...layer,
          findings: layer.findings.map((f, j) =>
            j !== fi ? f : { ...f, prashAnnotation: value }
          ),
        }
      ),
    }
    setLocal(updated)
    onFindingsChange(updated)
  }

  const handleSaveAnnotations = async (): Promise<void> => {
    setSaving(true)
    try {
      await fetch('/api/admin/candoc/findings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, annotatedFindings: local }),
      })
      onStatusChange('annotating')
    } finally { setSaving(false) }
  }

  const handleSignOff = async (): Promise<void> => {
    setSigningOff(true)
    setSignoffError(null)
    try {
      const res = await fetch('/api/admin/candoc/signoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, clientId, signoffChecklist: checklist, annotatedFindings: local }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (data.error) { setSignoffError(data.error); return }
      onStatusChange('complete')
    } finally { setSigningOff(false) }
  }

  const handleDownload = async (): Promise<void> => {
    const res = await fetch(`/api/admin/candoc/report?reviewId=${reviewId}`)
    const { downloadUrl } = await res.json() as { downloadUrl?: string }
    if (downloadUrl) window.open(downloadUrl, '_blank')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--clr-text-secondary)' }}>
          Reviewed: {new Date(findings.reviewedAt).toLocaleString()} · v{findings.version} ·
          Risk: <strong>{findings.overallRiskLevel.toUpperCase()}</strong> · Gaps: {findings.totalGaps}
        </span>
        {status !== 'complete' && (
          <button className="candoc-trigger-btn" onClick={() => void handleSaveAnnotations()} disabled={saving}>
            {saving ? 'Saving…' : 'Save Annotations'}
          </button>
        )}
        {status === 'complete' && (
          <button className="candoc-trigger-btn" onClick={() => void handleDownload()}>
            Download Report PDF
          </button>
        )}
      </div>

      <div className="candoc-layer-grid">
        {local.sopLayers.map((layer, li) => (
          <div key={layer.layer} className="candoc-layer-card">
            <div className="candoc-layer-header">
              <span className="candoc-layer-title">{layer.layer} — {layer.layerName}</span>
              <span className={`candoc-layer-badge ${layer.status}`}>{layer.status}</span>
            </div>
            {layer.findings.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-secondary)', margin: '0.25rem 0 0' }}>
                No findings — layer cleared.
              </p>
            )}
            {layer.findings.map((finding, fi) => (
              <div key={finding.id} className={`candoc-finding ${finding.severity}${finding.isResolved ? ' resolved' : ''}`}>
                {finding.isNew && (
                  <span style={{ background: '#1e3a5f', color: '#60a5fa', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '3px', marginRight: '0.4rem' }}>NEW</span>
                )}
                {finding.isResolved && (
                  <span style={{ background: '#1a3a2a', color: '#4ade80', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '3px', marginRight: '0.4rem' }}>RESOLVED</span>
                )}
                <strong>[{finding.severity.toUpperCase()}]</strong> {finding.description}
                <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-secondary)', marginTop: '0.2rem' }}>
                  Doc: {finding.documentRef} · Action: {finding.suggestedAction}
                </div>
                {status !== 'complete' && (
                  <textarea
                    className="candoc-annotation-input"
                    placeholder="Prash annotation (optional)"
                    value={finding.prashAnnotation ?? ''}
                    onChange={(e) => handleAnnotation(li, fi, e.target.value)}
                  />
                )}
                {status === 'complete' && finding.prashAnnotation && (
                  <div style={{ marginTop: '0.3rem', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--clr-text-secondary)' }}>
                    Note: {finding.prashAnnotation}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {status !== 'complete' && (
        <div className="candoc-signoff-section">
          <div className="candoc-signoff-title">Sign-off Checklist</div>
          {findings.sopLayers.map((layer) => (
            <label key={layer.layer} className="candoc-checklist-item">
              <input
                type="checkbox"
                checked={checklist[layer.layer] ?? false}
                onChange={(e) => setChecklist((prev) => ({ ...prev, [layer.layer]: e.target.checked }))}
              />
              {layer.layer} — {layer.layerName}
            </label>
          ))}
          <button
            className="candoc-signoff-btn"
            disabled={!allLayersChecked || signingOff}
            onClick={() => void handleSignOff()}
          >
            {signingOff ? 'Generating report…' : 'Sign Off & Send Report'}
          </button>
          {signoffError && <div className="candoc-error">{signoffError}</div>}
        </div>
      )}

      {status === 'complete' && (
        <div style={{ marginTop: '1.5rem', color: '#4ade80', fontWeight: 700 }}>
          ✓ Review complete. Report sent to client.
        </div>
      )}
    </div>
  )
}
