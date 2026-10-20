import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { build } from '../build';
import { testId, toStaging } from '../load';
import { readStoredRuns, storeRun } from '../raw-store';

const fixtures = join(__dirname, 'fixtures');
const work = mkdtempSync(join(tmpdir(), 'pqd-test-'));
// A folder that is not a Git repository: every run is "untagged".
const noRepo = mkdtempSync(join(tmpdir(), 'pqd-norepo-'));
after(() => {
  rmSync(work, { recursive: true, force: true });
  rmSync(noRepo, { recursive: true, force: true });
});

function csv(dir: string, table: string): string[][] {
  return readFileSync(join(dir, 'csv', `${table}.csv`), 'utf8')
    .trim()
    .split('\n')
    .map((line) => line.split(','));
}

function hashes(dir: string): string {
  const files = [
    ...readdirSync(dir).filter((f) => f.endsWith('.parquet')),
    ...readdirSync(join(dir, 'csv')).map((f) => join('csv', f)),
  ].sort();
  return files
    .map(
      (f) =>
        `${f}:${createHash('sha256')
          .update(readFileSync(join(dir, f)))
          .digest('hex')}`,
    )
    .join('\n');
}

describe('load', () => {
  it('gives a test the same id in every run', () => {
    assert.equal(
      testId('ui/login.spec.ts', ['Login', 'signs in']),
      testId('ui/login.spec.ts', ['Login', 'signs in']),
    );
    assert.notEqual(
      testId('ui/login.spec.ts', ['Login', 'signs in']),
      testId('ui/cart.spec.ts', ['Login', 'signs in']),
    );
  });

  it('flattens one row per test and project with the final outcome', () => {
    const raw = join(work, 'raw-load');
    storeRun(join(fixtures, 'run-1002'), raw);
    const { runs, results } = toStaging(readStoredRuns(raw));

    assert.equal(runs.length, 1);
    assert.equal(runs[0]?.junit_testcases, 6);
    assert.equal(results.length, 6);

    const flaky = results.find((r) => r.project === 'firefox');
    assert.equal(flaky?.outcome, 'flaky');
    assert.equal(flaky?.attempt_count, 2);
    assert.equal(flaky?.final_duration_ms, 1200);
    assert.equal(flaky?.total_duration_ms, 46200);
    // Colour codes are removed from error messages.
    assert.equal(flaky?.failure_message, 'Test timeout of 45000ms exceeded.');

    const failed = results.find((r) => r.outcome === 'unexpected');
    assert.equal(failed?.attempt_count, 3);
    assert.match(
      failed?.failure_message ?? '',
      /^Error: expect\(received\)\.toBe\(expected\) \| Expected: 200/,
    );
  });
});

describe('build', () => {
  const raw = join(work, 'raw');
  const model = join(work, 'model');

  it('builds the star schema and passes every data quality check', async () => {
    storeRun(join(fixtures, 'run-1001'), raw);
    storeRun(join(fixtures, 'run-1002'), raw);
    const manifest = await build(raw, model, noRepo);

    assert.equal(manifest.runs, 2);
    assert.equal(manifest.tables.fact_test_result, 12);
    assert.equal(manifest.tables.dim_test, 5);
    assert.equal(manifest.tables.dim_date, 2);
    assert.ok(manifest.checks.length >= 15);
    assert.ok(manifest.checks.every((c) => c.violations === 0));

    const runs = csv(model, 'fact_run');
    const header = runs[0] ?? [];
    const col = (name: string) => header.indexOf(name);
    const run1002 = runs.find((row) => row[0] === '1002') ?? [];
    assert.equal(run1002[col('trigger')], 'schedule');
    assert.equal(run1002[col('release_key')], 'untagged');
    assert.deepEqual(
      ['tests', 'passed', 'failed', 'flaky', 'skipped'].map((c) => run1002[col(c)]),
      ['6', '3', '1', '1', '1'],
    );

    const categories = csv(model, 'dim_failure_category').map((row) => row[1]);
    assert.ok(categories.includes('timeout'));
    assert.ok(categories.includes('network'));
    assert.ok(categories.includes('none'));
  });

  it('is idempotent: storing the same run again changes nothing', async () => {
    const before = hashes(model);
    storeRun(join(fixtures, 'run-1002'), raw);
    storeRun(join(fixtures, 'run-1002'), raw);
    const manifest = await build(raw, model, noRepo);

    assert.equal(manifest.runs, 2);
    assert.equal(manifest.tables.fact_test_result, 12);
    assert.equal(hashes(model), before);
  });

  it('stops without writing anything when a check fails', async () => {
    const broken = join(work, 'broken-source');
    cpSync(join(fixtures, 'run-1001'), broken, { recursive: true });
    // One testcase short: the JUnit count no longer matches the JSON results.
    writeFileSync(join(broken, 'junit.xml'), '<testsuites><testcase/></testsuites>');
    const brokenRaw = join(work, 'raw-broken');
    const brokenModel = join(work, 'model-broken');
    storeRun(broken, brokenRaw);

    await assert.rejects(
      build(brokenRaw, brokenModel, noRepo),
      /JUnit testcase count matches results/,
    );
    assert.equal(existsSync(brokenModel), false);
  });
});
