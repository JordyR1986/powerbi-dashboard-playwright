-- Facts.

-- Grain: one test, on one project, in one CI run (final result after retries).
CREATE OR REPLACE TABLE fact_test_result AS
SELECT
  r.run_id AS run_key,
  r.test_id AS test_key,
  r.project AS project_key,
  left(md5(concat_ws('|', s.container_image, s.playwright_version)), 12) AS environment_key,
  coalesce(c.release_key, 'untagged') AS release_key,
  s.sha AS commit_key,
  CAST(strftime(CAST(s.started_at AS DATE), '%Y%m%d') AS INTEGER) AS date_key,
  left(md5(f.category || '|' || f.normalized_message), 12) AS failure_key,
  CASE r.outcome
    WHEN 'expected' THEN CASE WHEN r.final_attempt_status = 'skipped' THEN 'skipped' ELSE 'passed' END
    WHEN 'unexpected' THEN 'failed'
    ELSE r.outcome
  END AS status,
  r.outcome = 'flaky' AS is_flaky,
  greatest(r.attempt_count - 1, 0) AS retries,
  r.attempt_count,
  r.final_duration_ms AS duration_ms,
  r.total_duration_ms,
  r.started_at
FROM stg_results AS r
JOIN stg_runs AS s USING (run_id)
LEFT JOIN dim_commit AS c ON c.commit_key = s.sha
JOIN stg_failures AS f USING (run_id, test_id, project);

-- Grain: one CI run.
CREATE OR REPLACE TABLE fact_run AS
SELECT
  s.run_id AS run_key,
  coalesce(c.release_key, 'untagged') AS release_key,
  s.sha AS commit_key,
  left(md5(concat_ws('|', s.container_image, s.playwright_version)), 12) AS environment_key,
  CAST(strftime(CAST(s.started_at AS DATE), '%Y%m%d') AS INTEGER) AS date_key,
  CASE s.event
    WHEN 'pull_request' THEN 'pr'
    WHEN 'workflow_dispatch' THEN 'manual'
    ELSE s.event
  END AS trigger,
  s.ref,
  s.run_attempt,
  s.shard_count,
  s.started_at,
  s.wall_clock_ms,
  s.workflow_result,
  s.run_url,
  count(t.test_key) AS tests,
  count(*) FILTER (WHERE t.status = 'passed') AS passed,
  count(*) FILTER (WHERE t.status = 'failed') AS failed,
  count(*) FILTER (WHERE t.status = 'flaky') AS flaky,
  count(*) FILTER (WHERE t.status = 'skipped') AS skipped
FROM stg_runs AS s
LEFT JOIN dim_commit AS c ON c.commit_key = s.sha
LEFT JOIN fact_test_result AS t ON t.run_key = s.run_id
GROUP BY ALL;
