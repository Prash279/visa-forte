#!/usr/bin/env node
// Re-scores past assessments against the corrected CRS engine.
//
// WHY THIS EXISTS
// The 2026-08-12 canada.ca re-verification found the engine over-scored some
// profiles by up to 25 CRS points (a single bachelor's was put in the top Section C
// skill-transferability tier) and up to 50 more where the per-group cap was missing.
// Any assessment issued before that fix may be too high. This script tells you which
// ones moved, and by how much.
//
// WHY YOU HAVE TO SUPPLY THE PROFILES
// crs_audit_log deliberately stores only the RESULT (total, section subtotals,
// streams) and no applicant inputs — it is a non-PII audit trail. Nothing anywhere
// persists an ApplicantProfile. So the old scores cannot be recomputed from the
// database; you feed in the profiles from your own client files.
//
// HOW IT WORKS
// It builds the CRS engine twice — once from your working tree (the fixed version)
// and once from a git ref you name (the version that produced the original report) —
// then runs every profile through both and diffs. The "before" numbers are the real
// old code, not a reconstruction.
//
// USAGE
//   node scripts/rescore-assessments.mjs --profiles ./my-clients.json
//   node scripts/rescore-assessments.mjs --profiles ./my-clients.json --before 9405e39
//   node scripts/rescore-assessments.mjs --profiles ./my-clients.json --json ./out.json
//
// See rescore-profiles.example.json for the input format.
//
// PRIVACY: runs entirely on this machine. Reads your file, prints to your terminal,
// writes only where you point --json. Nothing is sent anywhere. The input file holds
// client data — keep it out of the repo and delete it when you are done.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, cpSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIB = join(WEB_ROOT, 'src', 'lib');

// The commit that shipped the corrections. Anything scored before it is suspect.
const DEFAULT_BEFORE_REF = '269d85a~1';

// ── Arguments ────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { before: DEFAULT_BEFORE_REF };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    const value = argv[i + 1];
    if (!key || value === undefined) continue;
    args[key] = value;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.profiles) {
  console.error(
    'Usage: node scripts/rescore-assessments.mjs --profiles <file.json> [--before <git-ref>] [--json <out.json>]',
  );
  process.exit(1);
}

// ── Input validation ─────────────────────────────────────────────────────────
// A missing field must not silently score as zero — that would produce a wrong
// report, which is worse than no report. Only scoring-relevant fields are required;
// cosmetic ones (occupation title, countries) are defaulted since they never affect
// a single point.

const REQUIRED = [
  'age',
  'education',
  'firstLanguageScores',
  'foreignWorkExperienceYears',
  'canadianWorkExperienceYears',
  'hasSpouse',
];

const LANGUAGE_ABILITIES = ['listening', 'reading', 'writing', 'speaking'];

function validateAndFill(raw, index) {
  const label = raw.name ?? `profile[${index}]`;
  const missing = REQUIRED.filter((k) => raw[k] === undefined);
  if (missing.length > 0) {
    throw new Error(`${label}: missing required field(s): ${missing.join(', ')}`);
  }

  const lang = raw.firstLanguageScores;
  if (typeof lang !== 'object' || lang === null || !lang.testType) {
    throw new Error(`${label}: firstLanguageScores needs a testType`);
  }
  for (const ability of LANGUAGE_ABILITIES) {
    if (typeof lang[ability] !== 'number') {
      throw new Error(
        `${label}: firstLanguageScores.${ability} must be a number (got ${JSON.stringify(lang[ability])})`,
      );
    }
  }
  if (raw.hasSpouse && raw.spouseEducation === undefined) {
    throw new Error(
      `${label}: hasSpouse is true, so spouseEducation is required (Section B scores it)`,
    );
  }

  return {
    // Cosmetic — never scored. Defaulted so you only type what matters.
    name: label,
    nocCode: '00000',
    nocTeer: 1,
    occupationTitle: '',
    countryOfCitizenship: '',
    countryOfResidence: '',
    reportDate: new Date().toISOString().slice(0, 10),
    // Scored, but safe to default off.
    hasEca: true,
    hasSecondLanguage: false,
    hasProvincialNomination: false,
    hasCanadianEducation: false,
    hasFamilyInCanada: false,
    settlementFunds: 0,
    familySize: 1,
    hasCriminalRecord: false,
    hasMedicalCondition: false,
    hasPriorRefusal: false,
    ...raw,
  };
}

// ── Build both engines ───────────────────────────────────────────────────────

const workDir = mkdtempSync(join(tmpdir(), 'crs-rescore-'));

// esbuild ships with vite, which is already a dependency — nothing new to install.
// Its Node API is used rather than the CLI: spawning npx fails with EINVAL on Windows.
const { buildSync } = await import('esbuild');

function bundle(entry, outfile) {
  buildSync({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'silent',
  });
  return pathToFileURL(outfile).href;
}

// The "before" engine: today's lib directory with the two changed files reverted to
// the named ref. Copying the whole directory first means generated and unchanged
// siblings (crs-rules.version.ts, proof-of-funds.json) resolve without special cases.
function buildBeforeEngine(ref) {
  const src = join(workDir, 'before-src');
  cpSync(LIB, src, { recursive: true });
  for (const file of ['crs-calculator.ts', 'crs-rules.json']) {
    const old = execFileSync(
      'git',
      ['show', `${ref}:apps/web/src/lib/${file}`],
      { cwd: resolve(WEB_ROOT, '..', '..'), maxBuffer: 32 * 1024 * 1024 },
    );
    writeFileSync(join(src, file), old);
  }
  return bundle(join(src, 'crs-calculator.ts'), join(workDir, 'before.mjs'));
}

// ── Report helpers ───────────────────────────────────────────────────────────

// Recent draw cutoffs, so we can say whether a drop actually costs an invitation.
function recentCutoffs(limit = 12) {
  const history = JSON.parse(
    readFileSync(join(LIB, 'crs-draw-history.json'), 'utf8'),
  );
  return [...history.draws]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((d) => d.cutoffScore);
}

// The highest recent cutoff the applicant used to clear but no longer does.
function cutoffLost(before, after, cutoffs) {
  const lost = cutoffs.filter((c) => before >= c && after < c);
  return lost.length > 0 ? Math.max(...lost) : null;
}

function streamsOf(result) {
  return Object.entries(result.eligibility)
    .filter(([, v]) => v.eligible)
    .map(([k]) => k)
    .sort()
    .join(',');
}

function pad(value, width) {
  return String(value).padEnd(width);
}

// ── Run ──────────────────────────────────────────────────────────────────────

try {
  const rawProfiles = JSON.parse(readFileSync(resolve(args.profiles), 'utf8'));
  if (!Array.isArray(rawProfiles)) {
    throw new Error('Profiles file must contain a JSON array of profiles.');
  }
  const profiles = rawProfiles.map(validateAndFill);

  console.log(`Building corrected engine from working tree…`);
  const afterUrl = bundle(
    join(LIB, 'crs-calculator.ts'),
    join(workDir, 'after.mjs'),
  );
  console.log(`Building previous engine from ${args.before}…`);
  const beforeUrl = buildBeforeEngine(args.before);

  const { calculate: calcAfter } = await import(afterUrl);
  const { calculate: calcBefore } = await import(beforeUrl);

  const cutoffs = recentCutoffs();
  const rows = profiles.map((profile) => {
    const before = calcBefore(profile);
    const after = calcAfter(profile);
    return {
      name: profile.name,
      crsBefore: before.breakdown.total,
      crsAfter: after.breakdown.total,
      crsDelta: after.breakdown.total - before.breakdown.total,
      transferBefore: before.breakdown.transferTotal,
      transferAfter: after.breakdown.transferTotal,
      fswBefore: before.fswGrid.total,
      fswAfter: after.fswGrid.total,
      fswDelta: after.fswGrid.total - before.fswGrid.total,
      streamsBefore: streamsOf(before),
      streamsAfter: streamsOf(after),
      cutoffLost: cutoffLost(
        before.breakdown.total,
        after.breakdown.total,
        cutoffs,
      ),
    };
  });

  const nameWidth = Math.max(4, ...rows.map((r) => r.name.length));
  console.log('');
  console.log(
    `${pad('NAME', nameWidth)}  ${pad('CRS BEFORE', 11)}${pad('CRS AFTER', 10)}${pad('DELTA', 7)}${pad('FSW', 10)}NOTES`,
  );
  console.log('─'.repeat(nameWidth + 50));

  for (const r of rows) {
    const notes = [];
    if (r.streamsBefore !== r.streamsAfter) {
      notes.push(`eligibility changed: ${r.streamsBefore || 'none'} → ${r.streamsAfter || 'none'}`);
    }
    if (r.cutoffLost !== null) {
      notes.push(`NO LONGER CLEARS a recent cutoff of ${r.cutoffLost}`);
    }
    if (r.transferBefore !== r.transferAfter) {
      notes.push(`Section C ${r.transferBefore} → ${r.transferAfter}`);
    }
    console.log(
      `${pad(r.name, nameWidth)}  ${pad(r.crsBefore, 11)}${pad(r.crsAfter, 10)}${pad(
        r.crsDelta > 0 ? `+${r.crsDelta}` : r.crsDelta,
        7,
      )}${pad(`${r.fswBefore}→${r.fswAfter}`, 10)}${notes.join('; ')}`,
    );
  }

  const moved = rows.filter((r) => r.crsDelta !== 0);
  const lostCutoff = rows.filter((r) => r.cutoffLost !== null);
  const streamChanged = rows.filter((r) => r.streamsBefore !== r.streamsAfter);

  console.log('');
  console.log(`${rows.length} profile(s) re-scored against ${args.before}.`);
  console.log(`  ${moved.length} changed score.`);
  if (moved.length > 0) {
    const worst = moved.reduce((a, b) => (a.crsDelta < b.crsDelta ? a : b));
    console.log(`  Largest movement: ${worst.name} ${worst.crsDelta} (${worst.crsBefore} → ${worst.crsAfter}).`);
  }
  console.log(`  ${streamChanged.length} had a stream eligibility verdict change.`);
  console.log(`  ${lostCutoff.length} no longer clear a cutoff they previously cleared — contact these first.`);

  if (args.json) {
    writeFileSync(resolve(args.json), JSON.stringify(rows, null, 2));
    console.log(`\nWrote ${args.json}`);
  }
} catch (error) {
  console.error(`\nFailed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
