# downloads/

This directory holds the PDF files served by `/api/resources/download/[id]`.

Each file corresponds to a `fileName` value in `src/lib/resources.json`.

## Adding a new resource file

1. Add the PDF here with the exact `fileName` from `resources.json`.
2. The download API will serve it automatically — no code changes needed.

## Current expected files

- `ee-document-checklist.pdf`
- `ielts-clb-crs-cheatsheet.pdf`
- `ita-to-pr-roadmap.pdf`

Until the actual PDFs are uploaded, the download route returns HTTP 503
("File not available yet") — the button still renders but shows a browser error
on click. This is intentional: the page is live, the PDFs are populated separately.
