// Required documents per service tier.
// Each id is a stable machine key used as docType in the clientDocuments table.
// Labels are shown verbatim in the client portal UI.

export interface ChecklistItem {
  id: string;
  label: string;
}

export const DOCUMENT_CHECKLIST: Record<string, ChecklistItem[]> = {
  'Pre-Application Eligibility Assessment': [
    { id: 'passport_bio', label: 'Passport — biographical data page' },
    {
      id: 'language_test',
      label: 'Language test results (IELTS / CELPIP / TEF)',
    },
    { id: 'resume', label: 'Updated resume / CV' },
    {
      id: 'employment_letter',
      label: 'Employment letter (most recent employer)',
    },
    {
      id: 'eca_certificate',
      label: 'Educational Credential Assessment (ECA) — if applicable',
    },
  ],
  'PNP Stream Matching': [
    { id: 'passport_bio', label: 'Passport — biographical data page' },
    {
      id: 'language_test',
      label: 'Language test results (IELTS / CELPIP / TEF)',
    },
    { id: 'resume', label: 'Updated resume / CV' },
    { id: 'employment_letter', label: 'Employment letter (current employer)' },
    { id: 'eca_certificate', label: 'Educational Credential Assessment (ECA)' },
    {
      id: 'noc_confirmation',
      label: 'NOC code confirmation / job duties description',
    },
    { id: 'work_permit', label: 'Work permit (if currently in Canada)' },
  ],
  'Document Review & Compliance Audit': [
    { id: 'passport_all', label: 'Passport — all pages' },
    { id: 'language_test', label: 'Language test results' },
    { id: 'eca_certificate', label: 'Educational Credential Assessment (ECA)' },
    {
      id: 'employment_records',
      label: 'Employment records (letters + pay stubs)',
    },
    { id: 'police_clearance', label: 'Police clearance certificate(s)' },
    { id: 'medical_exam', label: 'Medical exam results (if completed)' },
    { id: 'photos', label: 'Photos (IRCC-compliant specifications)' },
    { id: 'bank_statements', label: 'Bank statements (last 6 months)' },
  ],
  'Refusal Analysis & Reapplication Strategy': [
    { id: 'refusal_letter', label: 'Original IRCC refusal letter' },
    { id: 'previous_application', label: 'Previous application documents' },
    { id: 'passport_bio', label: 'Passport — biographical data page' },
    { id: 'language_test', label: 'Updated language test results' },
    { id: 'employment_letter', label: 'Updated employment letter' },
    { id: 'eca_certificate', label: 'Updated ECA (if expired)' },
  ],
  'ITA Response Preparation': [
    {
      id: 'passport_all',
      label: 'Passport — all pages (including blank pages)',
    },
    { id: 'language_test', label: 'Language test results (all modules)' },
    { id: 'eca_certificate', label: 'Educational Credential Assessment (ECA)' },
    {
      id: 'degree_transcripts',
      label: 'Degree certificates and academic transcripts',
    },
    {
      id: 'employment_letter',
      label: 'Employment verification letter (on company letterhead)',
    },
    { id: 'pay_stubs', label: 'Pay stubs (last 6 months)' },
    {
      id: 'police_clearance',
      label: 'Police clearance certificate(s) — all countries lived 6+ months',
    },
    { id: 'medical_exam', label: 'Medical exam results' },
    {
      id: 'bank_statements',
      label: 'Settlement funds — bank statements (last 6 months)',
    },
    { id: 'photos', label: 'Photos (IRCC-compliant)' },
  ],
  'Full Application File Management': [
    { id: 'passport_all', label: 'Passport — all pages' },
    { id: 'language_test', label: 'Language test results' },
    { id: 'eca_certificate', label: 'Educational Credential Assessment (ECA)' },
    { id: 'degree_transcripts', label: 'Degree certificates and transcripts' },
    { id: 'employment_letter', label: 'Employment verification letter' },
    { id: 'pay_stubs', label: 'Pay stubs (last 6 months)' },
    { id: 'police_clearance', label: 'Police clearance certificate(s)' },
    { id: 'medical_exam', label: 'Medical exam results' },
    { id: 'bank_statements', label: 'Bank statements — settlement funds' },
    {
      id: 'marriage_certificate',
      label: 'Marriage certificate (if applicable)',
    },
    {
      id: 'birth_certificates',
      label: 'Birth certificates — dependants (if applicable)',
    },
    { id: 'photos', label: 'Photos (IRCC-compliant)' },
  ],
  'Post-Submission Monitoring': [
    {
      id: 'aor_confirmation',
      label: 'Acknowledgement of Receipt (AOR) confirmation',
    },
    {
      id: 'passport_bio',
      label: 'Passport — biographical data page (current)',
    },
    {
      id: 'updated_language_test',
      label: 'Updated language test (if requested by IRCC)',
    },
    { id: 'ircc_correspondence', label: 'Any IRCC correspondence received' },
  ],
};

// Returns the checklist for a given service tier, or an empty array if not found.
export function getChecklist(serviceTier: string): ChecklistItem[] {
  return DOCUMENT_CHECKLIST[serviceTier] ?? [];
}
