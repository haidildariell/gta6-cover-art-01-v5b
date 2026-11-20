// main.ts — hands the Vice Coast Cover Lab entry in.
// Copies app/ and screenshots/ into the output directory and writes
// dossier.json with buildDossier from vendor/makefun-app.ts.
//
// The output directory is NEVER cleaned: on the grader /output is a mount
// point, and any recursive delete of it throws EBUSY. This
// program only creates directories with mkdirSync and writes files into
// them, so it runs fine on a mount point. Two runs write byte-identical
// output: no timestamps, no randomness, stable file order.

import { buildDossier } from './vendor/makefun-app.ts';
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function copyTree(sourceDir: string, targetDir: string): void {
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true, dereference: false });
}

function main(): void {
  mkdirSync(outDir, { recursive: true });

  copyTree(join(repoRoot, 'app'), join(outDir, 'app'));

  const shotsDir = join(repoRoot, 'screenshots');
  if (existsSync(shotsDir)) {
    copyTree(shotsDir, join(outDir, 'screenshots'));
  }

  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
}

main();
