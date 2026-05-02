'use client';

// Per security.md §8.1 — rendered before any data-collection form.
// Consent state is stored in the DB with a timestamp when the record is created.
export function ConsentCheckbox({
  onConsent,
  checked,
}: {
  onConsent: (given: boolean) => void;
  checked: boolean;
}) {
  return (
    <label className="consent-checkbox-label">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onConsent(e.target.checked)}
        className="consent-checkbox-input"
      />
      <span className="consent-checkbox-text">
        I agree that Visa Forte may collect and store the information I provide
        to deliver immigration documentation services. I can request deletion
        of my data at any time from my account settings.
      </span>
    </label>
  );
}