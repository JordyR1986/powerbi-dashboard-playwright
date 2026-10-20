import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { runMetaSchema, type RunMeta } from './raw-schemas';

/**
 * The raw archive keeps one folder per CI run, named after the run id:
 *
 *   raw/<run_id>/run-meta.json
 *   raw/<run_id>/playwright-results.json.gz
 *   raw/<run_id>/junit.xml.gz
 *
 * Storing a run again replaces its folder, so ingesting the same run twice
 * (or a re-run attempt) never creates duplicates.
 */
export type RawRun = {
  meta: RunMeta;
  report: unknown;
  junit: string | undefined;
};

export function readRunMeta(dir: string): RunMeta {
  const raw: unknown = JSON.parse(readFileSync(join(dir, 'run-meta.json'), 'utf8'));
  return runMetaSchema.parse(raw);
}

export function storeRun(sourceDir: string, rawRoot: string): RunMeta {
  const meta = readRunMeta(sourceDir);
  const report = readFileSync(join(sourceDir, 'playwright-results.json'));
  const target = join(rawRoot, meta.run_id);

  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, 'run-meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
  writeFileSync(join(target, 'playwright-results.json.gz'), gzipSync(report));

  const junitPath = join(sourceDir, 'junit.xml');
  if (existsSync(junitPath)) {
    writeFileSync(join(target, 'junit.xml.gz'), gzipSync(readFileSync(junitPath)));
  }
  return meta;
}

export function readStoredRuns(rawRoot: string): RawRun[] {
  if (!existsSync(rawRoot)) return [];
  return readdirSync(rawRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
    .map((entry) => join(rawRoot, entry.name))
    .sort()
    .map((dir) => {
      const junitPath = join(dir, 'junit.xml.gz');
      return {
        meta: readRunMeta(dir),
        report: JSON.parse(
          gunzipSync(readFileSync(join(dir, 'playwright-results.json.gz'))).toString('utf8'),
        ) as unknown,
        junit: existsSync(junitPath)
          ? gunzipSync(readFileSync(junitPath)).toString('utf8')
          : undefined,
      };
    });
}
