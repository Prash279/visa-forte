import type { Metadata } from 'next'
import ItaCountdownTool from './ItaCountdownTool'

export const metadata: Metadata = {
  title: '60-Day Countdown Planner — Visa Forte',
  description:
    'Enter your Express Entry ITA date and get a personalised day-by-day document preparation timeline — printable and emailed to you.',
}

export default function ItaCountdownPage() {
  return <ItaCountdownTool />
}
