'use client'

import { useState } from 'react'

export interface BookingForCalendar {
  id: string
  name: string
  email: string
  serviceTier: string
  bookingDate: string   // YYYY-MM-DD string from DB text column — always safe to serialize
  paymentStatus: string
  status: string
  amountPaid: number
  currency: string
}

interface Props {
  bookings: BookingForCalendar[]
  initialYear: number
  initialMonth: number  // 0-indexed (0 = January)
  today: string         // YYYY-MM-DD in IST — used for the "today" day highlight
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Returns an array of day numbers (1..N) padded with nulls at the start to align
// the first day of the month to its correct day-of-week column (Sunday = 0).
// Nulls are also appended at the end to fill out the final week row.
function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDate = new Date(year, month + 1, 0).getDate()
  const startPad = firstDay.getDay() // 0 = Sunday
  const days: (number | null)[] = Array(startPad).fill(null)
  for (let d = 1; d <= lastDate; d++) days.push(d)
  while (days.length % 7 !== 0) days.push(null)
  return days
}

export default function BookingCalendar({ bookings, initialYear, initialMonth, today }: Props) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Build a lookup: dateString → bookings array for fast day-cell rendering.
  const bookingsByDate: Record<string, BookingForCalendar[]> = {}
  for (const b of bookings) {
    if (!bookingsByDate[b.bookingDate]) bookingsByDate[b.bookingDate] = []
    bookingsByDate[b.bookingDate].push(b)
  }

  const days = getCalendarDays(year, month)

  const prevMonth = () => {
    setSelectedDate(null)
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    setSelectedDate(null)
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const selectedBookings = selectedDate ? (bookingsByDate[selectedDate] ?? []) : []

  return (
    <div className="booking-calendar">

      {/* ── Month navigation ── */}
      <div className="booking-cal-nav">
        <button className="booking-cal-nav-btn" onClick={prevMonth}>← Prev</button>
        <span className="booking-cal-month-label">{MONTH_NAMES[month]} {year}</span>
        <button className="booking-cal-nav-btn" onClick={nextMonth}>Next →</button>
      </div>

      {/* ── Calendar grid (day-of-week headers + day cells) ── */}
      <div className="booking-cal-grid">

        {/* Day-of-week header row */}
        {DOW.map(d => (
          <div key={d} className="booking-cal-dow">{d}</div>
        ))}

        {/* Day cells */}
        {days.map((day, i) => {
          if (day === null) {
            return <div key={`pad-${i}`} className="booking-cal-cell booking-cal-cell-empty" />
          }

          const dateStr = toDateStr(year, month, day)
          const dayBookings = bookingsByDate[dateStr] ?? []
          const hasBookings = dayBookings.length > 0
          const isSelected = selectedDate === dateStr
          const isToday = dateStr === today

          const cellClass = [
            'booking-cal-cell',
            hasBookings ? 'booking-cal-cell-has-bookings' : '',
            isSelected ? 'booking-cal-cell-selected' : '',
            isToday ? 'booking-cal-cell-today' : '',
          ].filter(Boolean).join(' ')

          return (
            <div
              key={dateStr}
              className={cellClass}
              onClick={() => hasBookings && setSelectedDate(isSelected ? null : dateStr)}
              role={hasBookings ? 'button' : undefined}
              tabIndex={hasBookings ? 0 : undefined}
              onKeyDown={e => {
                if (hasBookings && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  setSelectedDate(isSelected ? null : dateStr)
                }
              }}
              aria-label={hasBookings
                ? `${day} — ${dayBookings.length} booking${dayBookings.length !== 1 ? 's' : ''}`
                : undefined
              }
              aria-pressed={hasBookings ? isSelected : undefined}
            >
              <span className="booking-cal-day-num">{day}</span>
              {hasBookings && (
                <span className="booking-cal-count">{dayBookings.length}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Selected day detail panel ── */}
      {selectedDate !== null && (
        <div className="booking-cal-detail">
          <p className="booking-cal-detail-heading">
            {selectedBookings.length === 0
              ? 'No bookings on this date'
              : `${selectedBookings.length} booking${selectedBookings.length !== 1 ? 's' : ''} — ${
                  new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })
                }`
            }
          </p>

          {selectedBookings.length > 0 && (
            <div className="booking-cal-detail-list">
              {selectedBookings.map(b => {
                const amount = b.amountPaid > 0
                  ? (b.currency === 'INR'
                      ? `₹${(b.amountPaid / 100).toLocaleString('en-IN')}`
                      : `$${(b.amountPaid / 100)}`)
                  : '—'

                return (
                  <div key={b.id} className="booking-cal-detail-row">
                    <div className="booking-cal-detail-client">
                      <span className="booking-cal-detail-name">{b.name}</span>
                      <a href={`mailto:${b.email}`} className="booking-cal-detail-email">{b.email}</a>
                    </div>
                    <span className="booking-cal-detail-service">{b.serviceTier}</span>
                    <div className="booking-cal-detail-meta">
                      <span className={`admin-badge ${b.paymentStatus === 'paid' ? 'admin-badge-paid' : 'admin-badge-new'}`}>
                        {b.paymentStatus}
                      </span>
                      <span className="booking-cal-detail-amount">{amount}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}