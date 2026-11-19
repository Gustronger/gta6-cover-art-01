// Vice Coast Cover Studio's entry program (Node 22, standard library only).
//
// It hands the app in: it copies this repository's app/ (the offline cover
// maker) and screenshots/ into the output directory and writes
// dossier.json there, using the vendored make.fun library. It never deletes or
// recreates the output directory — it creates it only when it is missing and
// copies files into it — and it writes the same bytes on every run, so the
// grader's two runs agree.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Create the output directory only when it is missing; never remove it.
mkdirSync(outDir, { recursive: true });

// Copy the app in whole, then the screenshots beside it.
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The dossier the judge reads, built from exactly what was copied in. The
// caps are the scorer's own (reference/gate.json): only text_max_bytes shapes
// the bytes; the rest refuse an entry the scorer would refuse anyway.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
