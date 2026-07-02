import type { Metadata } from 'next'
import type { JSX } from 'react'
import CanVisaLite from './CanVisaLite'

export const metadata: Metadata = {
  title: 'Free CRS Score Check — Visa Forte | CanVisa Pro Lite',
  description:
    'Check your CRS score instantly with CanVisa Pro Lite — Visa Forte\'s free Express Entry assessment tool. Get your score, top improvement tips, and best pathway in under 3 minutes. No login required.',
}

export default function CanVisaPage(): JSX.Element {
  return (
    <main>
      <section style={{ background: 'var(--prussian)', padding: '10rem 1.25rem 4rem' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <p className="eyebrow" style={{ color: 'var(--saffron)' }}>CanVisa Pro Lite</p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.4rem, 5vw, 4rem)',
            fontWeight: 400,
            color: 'var(--pearl)',
            lineHeight: 1.1,
            letterSpacing: '-0.015em',
            margin: '0.75rem 0 1rem',
          }}>
            Your Free CRS Score Check
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            fontWeight: 300,
            lineHeight: 1.8,
            color: 'rgba(248,244,238,0.78)',
            maxWidth: '540px',
            margin: 0,
          }}>
            Fill in your profile below. Your score, top weakness areas, and best
            pathway appear instantly — no login, no cost.
          </p>
        </div>
      </section>
      <CanVisaLite />
    </main>
  )
}
