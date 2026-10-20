import { DuckDBInstance } from '@duckdb/node-api';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { readCommits, readTags } from './git-info';
import { toStaging, writeNdjson, writeStaging } from './load';
import { readStoredRuns } from './raw-store';

/**
 * Rebuilds the star schema from the raw archive.
 *
 *   tsx pipeline/build.ts --raw <archive>/raw --out <archive>/model [--repo .]
 *
 * The whole model is rebuilt from raw files every time, so the output depends only
 * on which runs are in the archive. Running it twice gives the same tables.
 */

const SQL_DIR = resolve(__dirname, 'sql');
const SQL_FILES = ['01_staging.sql', '02_dims.sql', '03_facts.sql'];

// Exported tables and the columns that define their order (keeps files stable between builds).
const TABLES: Record<string, string> = {
  fact_test_result: 'run_key, test_key, project_key',
  fact_run: 'run_key',
  dim_test: 'test_key',
  dim_project: 'project_key',
  dim_environment: 'environment_key',
  dim_release: 'release_order, release_key',
  dim_commit: 'commit_key',
  dim_date: 'date_key',
  dim_failure_category: 'failure_key',
};

type Check = { check: string; violations: number };

function arg(argv: string[], name: string, fallback?: string): string {
  const index = argv.indexOf(name);
  const value = index >= 0 ? argv[index + 1] : fallback;
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function statements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map((part) =>
      part
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter(Boolean);
}

const sqlPath = (path: string) => resolve(path).replaceAll('\\', '/').replaceAll("'", "''");

export async function build(rawRoot: string, outDir: string, repo: string) {
  const runs = readStoredRuns(rawRoot);
  if (runs.length === 0) throw new Error(`No runs found in ${rawRoot}`);

  const staging = mkdtempSync(join(tmpdir(), 'pqd-staging-'));
  try {
    const stg = toStaging(runs);
    writeStaging(staging, stg);
    writeNdjson(join(staging, 'git_tags.ndjson'), readTags(repo));
    writeNdjson(
      join(staging, 'git_commits.ndjson'),
      readCommits(
        repo,
        stg.runs.map((run) => run.sha),
      ),
    );

    const db = await DuckDBInstance.create(':memory:');
    const con = await db.connect();
    await con.run("SET TimeZone = 'UTC'");

    for (const file of SQL_FILES) {
      const sql = readFileSync(join(SQL_DIR, file), 'utf8').replaceAll(
        '{{staging}}',
        sqlPath(staging),
      );
      for (const statement of statements(sql)) await con.run(statement);
    }

    const checks: Check[] = [];
    for (const statement of statements(readFileSync(join(SQL_DIR, '99_checks.sql'), 'utf8'))) {
      const reader = await con.runAndReadAll(statement);
      const [row] = reader.getRows();
      checks.push({ check: String(row?.[0]), violations: Number(row?.[1]) });
    }
    const failed = checks.filter((c) => c.violations > 0);
    if (failed.length > 0) {
      const list = failed.map((c) => `  - ${c.check} (${c.violations})`).join('\n');
      throw new Error(`Data quality checks failed; nothing was written:\n${list}`);
    }

    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(join(outDir, 'csv'), { recursive: true });
    const rowCounts: Record<string, number> = {};
    for (const [table, order] of Object.entries(TABLES)) {
      const query = `SELECT * FROM ${table} ORDER BY ${order}`;
      const target = sqlPath(join(outDir, table));
      const csvTarget = sqlPath(join(outDir, 'csv', table));
      await con.run(`COPY (${query}) TO '${target}.parquet' (FORMAT parquet, COMPRESSION zstd)`);
      await con.run(`COPY (${query}) TO '${csvTarget}.csv' (HEADER, DELIMITER ',')`);
      const count = await con.runAndReadAll(`SELECT count(*) FROM ${table}`);
      rowCounts[table] = Number(count.getRows()[0]?.[0]);
    }

    const span = await con.runAndReadAll(
      'SELECT CAST(min(started_at) AS VARCHAR), CAST(max(started_at) AS VARCHAR) FROM fact_run',
    );
    const [first, last] = span.getRows()[0] ?? [];
    const manifest = {
      built_at: new Date().toISOString(),
      runs: rowCounts.fact_run,
      first_run_at: first,
      last_run_at: last,
      tables: rowCounts,
      checks,
    };
    writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    con.closeSync();
    return manifest;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

async function main(argv: string[]) {
  const manifest = await build(
    arg(argv, '--raw'),
    arg(argv, '--out'),
    arg(argv, '--repo', process.cwd()),
  );
  for (const { check } of manifest.checks) console.log(`ok  ${check}`);
  console.log(
    `built ${manifest.runs} run(s): ${Object.entries(manifest.tables)
      .map(([t, n]) => `${t}=${n}`)
      .join(', ')}`,
  );
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
