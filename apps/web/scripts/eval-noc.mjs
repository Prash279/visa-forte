// Runner for the paid NOC golden-corpus eval: `npm run eval:noc`.
//
// Exists only to set NOC_LIVE_EVAL before handing off to vitest. `NOC_LIVE_EVAL=1 vitest`
// works in bash but not in cmd.exe or PowerShell, and Prash's shell is PowerShell — a
// script that silently runs with the flag UNSET would report a green skipped suite and
// look exactly like a passing eval. Setting it in node keeps that impossible without
// adding cross-env as a dependency for one variable.
//
// Pass through any extra vitest args, e.g. `npm run eval:noc -- --reporter=verbose`.
// Set NOC_EVAL_TOPK=30 to score the public shortlist instead of the admin one.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// Read the key from .env.local — the same git-ignored file `next dev` already uses — so
// the eval needs no manual export and the key never reaches shell history or a tracked
// file. Only loaded when the variable is not already set, so a deliberate shell override
// still wins. The value is used, never printed.
if (!process.env.ANTHROPIC_API_KEY && existsSync('.env.local')) {
  process.loadEnvFile('.env.local');
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    '\nANTHROPIC_API_KEY is not set and .env.local does not supply it.\n' +
      'The eval makes one real API call per case. Add the key to apps/web/.env.local\n' +
      '(git-ignored) or export it in your shell, then run again.\n',
  );
  process.exit(1);
}

console.log(
  '\nRunning the NOC golden-corpus eval. This makes one Anthropic API call per case\n' +
    'and takes a few minutes. Ctrl-C to abort.\n',
);

const result = spawnSync(
  'npx',
  ['vitest', 'run', 'src/lib/noc-live-eval.test.ts', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NOC_LIVE_EVAL: '1' },
  },
);

process.exit(result.status ?? 1);
