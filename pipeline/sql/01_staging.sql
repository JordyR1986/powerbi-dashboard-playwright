-- Staging: typed copies of the NDJSON files written by load.ts.
-- {{staging}} is replaced with the staging folder by build.ts.

CREATE OR REPLACE TABLE stg_runs AS
SELECT *
FROM read_json('{{staging}}/stg_runs.ndjson', format = 'newline_delimited', columns = {
  run_id: 'BIGINT', run_attempt: 'INTEGER', event: 'VARCHAR', ref: 'VARCHAR', sha: 'VARCHAR',
  run_url: 'VARCHAR', workflow_result: 'VARCHAR', playwright_version: 'VARCHAR',
  container_image: 'VARCHAR', shard_count: 'INTEGER',
  started_at: 'TIMESTAMPTZ', wall_clock_ms: 'BIGINT', stats_expected: 'INTEGER',
  stats_unexpected: 'INTEGER', stats_flaky: 'INTEGER', stats_skipped: 'INTEGER',
  junit_testcases: 'INTEGER'
})
-- A re-run of the same CI run replaces the earlier attempt.
QUALIFY row_number() OVER (PARTITION BY run_id ORDER BY run_attempt DESC) = 1;

CREATE OR REPLACE TABLE stg_results AS
SELECT r.*
FROM read_json('{{staging}}/stg_results.ndjson', format = 'newline_delimited', columns = {
  run_id: 'BIGINT', test_id: 'VARCHAR', file: 'VARCHAR', title: 'VARCHAR',
  title_path: 'VARCHAR', describe_path: 'VARCHAR', tags: 'VARCHAR', project: 'VARCHAR',
  expected_status: 'VARCHAR', outcome: 'VARCHAR', attempt_count: 'INTEGER',
  final_attempt_status: 'VARCHAR', final_duration_ms: 'BIGINT', total_duration_ms: 'BIGINT',
  started_at: 'TIMESTAMPTZ', failure_status: 'VARCHAR', failure_message: 'VARCHAR'
}) AS r
SEMI JOIN stg_runs USING (run_id);

CREATE OR REPLACE TABLE stg_git_tags AS
SELECT *
FROM read_json('{{staging}}/git_tags.ndjson', format = 'newline_delimited', columns = {
  tag: 'VARCHAR', sha: 'VARCHAR', tagged_at: 'TIMESTAMPTZ'
});

CREATE OR REPLACE TABLE stg_git_commits AS
SELECT *
FROM read_json('{{staging}}/git_commits.ndjson', format = 'newline_delimited', columns = {
  sha: 'VARCHAR', committed_at: 'TIMESTAMPTZ', release_tag: 'VARCHAR'
});
