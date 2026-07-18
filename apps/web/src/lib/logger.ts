// logger.ts — structured JSON logger for all server-side events.
// Every important action (booking saved, payment verified, error thrown) writes
// a log entry in a consistent shape so debugging is fast and searchable.
// Output is JSON so Vercel log drains and Sentry can parse it automatically.

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string; // which part of the app — e.g. 'booking', 'payment', 'health'
  action: string; // what was attempted — e.g. 'create_booking', 'verify_payment'
  actorId?: string; // user email or system identifier, if known
  result: 'success' | 'failure';
  metadata?: Record<string, unknown>; // any extra context — never include PII here
}

export function log(entry: Omit<LogEntry, 'timestamp'>): void {
  const record: LogEntry = {
    timestamp: new Date().toISOString(),
    ...entry,
  };
  // JSON.stringify keeps log entries machine-readable for aggregation tools
  console.log(JSON.stringify(record));
}
