import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RawRun } from './raw-store';
import { playwrightReportSchema, type Attempt, type Spec, type Suite } from './raw-schemas';

/** One row per CI run. */
export type StgRun = {
  run_id: number;
  run_attempt: number;
  event: string;
  ref: string;
  sha: string;
  run_url: string;
  workflow_result: string | null;
  playwright_version: string | null;
  container_image: string | null;
  shard_count: number | null;
  started_at: string;
  wall_clock_ms: number;
  stats_expected: number;
  stats_unexpected: number;
  stats_flaky: number;
  stats_skipped: number;
  junit_testcases: number | null;
};

/** One row per test, per project, per run: the final result after retries. */
export type StgResult = {
  run_id: number;
  test_id: string;
  file: string;
  title: string;
  title_path: string;
  describe_path: string | null;
  tags: string;
  project: string;
  expected_status: string;
  outcome: 'expected' | 'unexpected' | 'flaky' | 'skipped';
  attempt_count: number;
  final_attempt_status: string | null;
  final_duration_ms: number;
  total_duration_ms: number;
  started_at: string | null;
  failure_status: string | null;
  failure_message: string | null;
};

// Playwright error messages carry terminal colour codes.
// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*m/g;

/**
 * The first few meaningful lines of an error, joined with " | ". The first line is
 * the headline; the next lines usually say which matcher failed, which the
 * failure categories need. Code frames and call logs are left out.
 */
function summarize(message: string | undefined): string | null {
  if (!message) return null;
  const lines = message
    .replace(ANSI, '')
    .split('\n')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .filter((part) => !/^(at |\d+ \||>|\||Call log:|- )/.test(part))
    .slice(0, 3);
  return lines.length ? lines.join(' | ').slice(0, 500) : null;
}

function attemptMessage(attempt: Attempt): string | null {
  return summarize(attempt.error?.message ?? attempt.errors[0]?.message);
}

/** Stable id for a test: file plus its title path. It does not change between runs. */
export function testId(file: string, titlePath: string[]): string {
  return createHash('md5')
    .update(`${file}::${titlePath.join(' > ')}`)
    .digest('hex')
    .slice(0, 12);
}

function* walk(suite: Suite, path: string[]): Generator<{ spec: Spec; path: string[] }> {
  // The top-level suite is the file; nested suites are describe blocks.
  for (const spec of suite.specs ?? []) yield { spec, path };
  for (const child of suite.suites ?? []) yield* walk(child, [...path, child.title]);
}

function resultRows(runId: number, report: ReturnType<typeof playwrightReportSchema.parse>) {
  const rows: StgResult[] = [];
  for (const fileSuite of report.suites) {
    for (const { spec, path } of walk(fileSuite, [])) {
      const titlePath = [...path, spec.title];
      for (const test of spec.tests) {
        const attempts = [...test.results].sort((a, b) => a.retry - b.retry);
        const final = attempts.at(-1);
        // For a failed test, keep the error of the last attempt; for a flaky one, the first failure.
        const failing =
          test.status === 'unexpected'
            ? final
            : attempts.find((a) => a.status !== 'passed' && a.status !== 'skipped');

        rows.push({
          run_id: runId,
          test_id: testId(spec.file, titlePath),
          file: spec.file,
          title: spec.title,
          title_path: titlePath.join(' > '),
          describe_path: path.length > 0 ? path.join(' > ') : null,
          tags: [...spec.tags].sort().join(','),
          project: test.projectName,
          expected_status: test.expectedStatus,
          outcome: test.status,
          attempt_count: attempts.length,
          final_attempt_status: final?.status ?? null,
          final_duration_ms: Math.round(final?.duration ?? 0),
          total_duration_ms: Math.round(attempts.reduce((sum, a) => sum + a.duration, 0)),
          started_at: attempts[0]?.startTime ?? null,
          failure_status: failing?.status ?? null,
          failure_message: failing ? attemptMessage(failing) : null,
        });
      }
    }
  }
  return rows;
}

/** Flattens the raw archive into staging rows. */
export function toStaging(runs: RawRun[]): { runs: StgRun[]; results: StgResult[] } {
  const stgRuns: StgRun[] = [];
  const stgResults: StgResult[] = [];

  for (const { meta, report: rawReport, junit } of runs) {
    const report = playwrightReportSchema.parse(rawReport);
    const runId = Number(meta.run_id);

    stgRuns.push({
      run_id: runId,
      run_attempt: Number(meta.run_attempt),
      event: meta.event,
      ref: meta.ref,
      sha: meta.sha,
      run_url: meta.run_url,
      workflow_result: meta.result ?? null,
      playwright_version: meta.playwright ?? null,
      container_image: meta.image ?? null,
      shard_count: meta.shard_count ?? null,
      started_at: report.stats.startTime,
      wall_clock_ms: Math.round(report.stats.duration),
      stats_expected: report.stats.expected,
      stats_unexpected: report.stats.unexpected,
      stats_flaky: report.stats.flaky,
      stats_skipped: report.stats.skipped,
      junit_testcases: junit === undefined ? null : (junit.match(/<testcase\b/g) ?? []).length,
    });
    stgResults.push(...resultRows(runId, report));
  }
  return { runs: stgRuns, results: stgResults };
}

export function writeNdjson(path: string, rows: object[]): void {
  writeFileSync(
    path,
    rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''),
  );
}

export function writeStaging(dir: string, staging: ReturnType<typeof toStaging>): void {
  mkdirSync(dir, { recursive: true });
  writeNdjson(join(dir, 'stg_runs.ndjson'), staging.runs);
  writeNdjson(join(dir, 'stg_results.ndjson'), staging.results);
}
