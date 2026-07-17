import type { FindingsJson } from './candoc-types';

export function buildCandocMarp(
  findings: FindingsJson,
  clientName: string,
): string {
  const riskLevel = findings.overallRiskLevel.toUpperCase();
  const reviewDate = new Date(findings.reviewedAt).toLocaleDateString('en-CA');

  const layerSlides = findings.sopLayers
    .map((layer) => {
      const findingLines =
        layer.findings.length === 0
          ? '> No findings — layer cleared.'
          : layer.findings
              .map((f) => {
                const badge = f.isNew
                  ? '[NEW] '
                  : f.isResolved
                    ? '[RESOLVED] '
                    : '';
                const annotation = f.prashAnnotation
                  ? `\n  > **Note:** ${f.prashAnnotation}`
                  : '';
                return `- ${badge}**[${f.severity.toUpperCase()}]** ${f.description}\n  *${f.documentRef} · ${f.suggestedAction}*${annotation}`;
              })
              .join('\n');

      return `---\n\n## ${layer.layer} — ${layer.layerName}\n\n**Status:** ${layer.status} · **Findings:** ${layer.findings.length}\n\n${findingLines}`;
    })
    .join('\n\n');

  return `---
marp: true
theme: default
paginate: true
style: |
  section {
    background: #0f172a;
    color: #e2e8f0;
    font-family: 'Segoe UI', Inter, sans-serif;
    padding: 2.5rem 3rem;
    font-size: 0.95rem;
  }
  h1 { color: #60a5fa; font-size: 1.8rem; }
  h2 { color: #93c5fd; font-size: 1.2rem; border-bottom: 1px solid #1e3a5f; padding-bottom: 0.3rem; }
  strong { color: #f8fafc; }
  em { color: #94a3b8; font-size: 0.85em; }
  blockquote { border-left: 3px solid #334155; padding-left: 1rem; color: #94a3b8; margin: 0.5rem 0; }
  li { margin: 0.4rem 0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #1e3a5f; padding: 0.4rem 0.8rem; text-align: left; }
  th { background: #1e3a5f; color: #93c5fd; }
---

# CanDoc Review Report
## ${clientName}

| Field | Value |
|---|---|
| Review Date | ${reviewDate} |
| Version | ${findings.version} |
| Overall Risk | **${riskLevel}** |
| Total Gaps | ${findings.totalGaps} |

${layerSlides}

---

## Legal Disclaimer

*This report is for informational and guidance purposes only, based on publicly available IRCC regulations and policies. It does not constitute legal advice and no consultant-client relationship is created. Immigration regulations are subject to change without notice. Verify all information with official IRCC sources at canada.ca/immigration before taking any action.*

---

*CanDoc Review · Visa Forte Consulting · ${reviewDate}*`;
}

export function renderMarpToHtml(marpMarkdown: string, title: string): Buffer {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Marp } = require('@marp-team/marp-core') as {
    Marp: new (opts?: unknown) => {
      render: (md: string) => { html: string; css: string };
    };
  };
  const instance = new Marp({ html: true });
  const { html, css } = instance.render(marpMarkdown);
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${css}</style>
</head>
<body>
${html}
</body>
</html>`;
  return Buffer.from(fullHtml, 'utf-8');
}
