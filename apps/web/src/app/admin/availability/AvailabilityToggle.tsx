'use client';

import { useState } from 'react';

interface Props {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Mon 14 Apr"
  initialIsAvailable: boolean;
}

// Single day toggle. Fires POST /api/availability on change.
export default function AvailabilityToggle({
  date,
  label,
  initialIsAvailable,
}: Props) {
  const [isAvailable, setIsAvailable] = useState(initialIsAvailable);
  const [saving, setSaving] = useState(false);

  async function handleToggle() {
    const next = !isAvailable;
    setIsAvailable(next); // optimistic update
    setSaving(true);

    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, isAvailable: next }),
      });

      if (!res.ok) {
        // Revert if the server rejected it
        setIsAvailable(!next);
        console.error('Availability toggle failed');
      }
    } catch {
      setIsAvailable(!next);
      console.error('Availability toggle network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`avail-day${isAvailable ? ' avail-day--on' : ''}`}>
      <span className="avail-day-label">{label}</span>
      <button
        className={`avail-toggle${isAvailable ? ' avail-toggle--on' : ''}`}
        onClick={handleToggle}
        disabled={saving}
        aria-pressed={isAvailable}
        aria-label={`Toggle availability for ${label}`}
        type="button"
      >
        <span className="avail-toggle-knob" />
      </button>
      <span className="avail-day-status">
        {isAvailable ? 'Open' : 'Closed'}
      </span>
    </div>
  );
}
