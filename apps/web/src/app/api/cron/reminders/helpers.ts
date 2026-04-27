// Pure utility functions for the reminders cron — extracted so they can be
// unit-tested without importing the Resend module.

// Returns tomorrow's date as a YYYY-MM-DD string in IST (UTC+5:30).
// The cron fires at 00:30 UTC = 06:00 IST, so "tomorrow IST" is the
// correct next consultation day to check.
export function tomorrowIST(): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  nowIST.setUTCDate(nowIST.getUTCDate() + 1);
  return nowIST.toISOString().slice(0, 10);
}

// Returns the SLA threshold in milliseconds for a given CRM stage.
// ITA Window clients get a tighter 12-hour window; all others get 24 hours.
export function slaThresholdMs(stage: string): number {
  return stage === 'ITA Window' ? 12 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
}
