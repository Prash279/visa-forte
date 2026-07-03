import type { Metadata } from 'next'
import ItaCountdownTool from '../ItaCountdownTool'

export const metadata: Metadata = {
  title: 'Your Countdown Checklist — Visa Forte',
}

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

// Thin wrapper — ItaCountdownTool already knows how to fetch, render, and
// error-state a checklist by token, so the shareable result link reuses it directly.
export default async function ItaCountdownResultPage({ searchParams }: PageProps) {
  const { token } = await searchParams
  return <ItaCountdownTool initialToken={token ?? null} />
}
