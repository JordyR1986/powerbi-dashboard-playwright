import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { storeRun } from './raw-store';

/**
 * Copies one or more downloaded `raw-results` folders into the raw archive.
 *
 *   tsx pipeline/ingest.ts --raw <archive>/raw <raw-results-dir> [more dirs...]
 */
function main(argv: string[]): void {
  const rawIndex = argv.indexOf('--raw');
  const rawRoot = rawIndex >= 0 ? argv[rawIndex + 1] : undefined;
  const sources = argv.filter((_, i) => i !== rawIndex && i !== rawIndex + 1);

  if (!rawRoot || sources.length === 0) {
    throw new Error('Usage: ingest.ts --raw <archive>/raw <raw-results-dir> [more dirs...]');
  }

  let stored = 0;
  for (const source of sources) {
    if (!existsSync(join(source, 'run-meta.json'))) {
      console.warn(`skip ${source}: no run-meta.json`);
      continue;
    }
    const meta = storeRun(source, rawRoot);
    console.log(`stored run ${meta.run_id} (${meta.event}, ${meta.sha.slice(0, 7)})`);
    stored += 1;
  }
  console.log(`${stored} run(s) stored in ${rawRoot}`);
}

main(process.argv.slice(2));
