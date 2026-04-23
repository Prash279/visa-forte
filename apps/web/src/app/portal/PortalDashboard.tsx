'use client'

import { useState, useRef } from 'react'
import type { ChecklistItem } from '@/lib/document-checklist'

interface UploadedDoc {
  id: string
  filename: string
  uploadedAt: Date
}

interface Props {
  client: {
    id: string
    name: string
    serviceTier: string
    stage: string
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

  const uploadedCount = checklist.filter((item) => uploaded[item.id]).length
  const totalCount = checklist.length
  const progressPct = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 0

  const isIta = client.stage === 'ITA Window'

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