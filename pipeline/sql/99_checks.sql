-- Data quality checks. Every query returns the number of violations; anything above 0 fails the build.

SELECT 'fact_test_result grain is unique' AS check_name, count(*) AS violations
FROM (SELECT run_key, test_key, project_key FROM fact_test_result GROUP BY ALL HAVING count(*) > 1);

SELECT 'fact_run has one row per run', count(*)
FROM (SELECT run_key FROM fact_run GROUP BY run_key HAVING count(*) > 1);

SELECT 'every run has at least one result', count(*)
FROM fact_run WHERE tests = 0;

SELECT 'durations are not negative', count(*)
FROM fact_test_result WHERE duration_ms < 0 OR total_duration_ms < duration_ms;

SELECT 'status is a known value', count(*)
FROM fact_test_result WHERE status NOT IN ('passed', 'failed', 'flaky', 'skipped');

SELECT 'is_flaky matches status', count(*)
FROM fact_test_result WHERE is_flaky <> (status = 'flaky');

SELECT 'failed and flaky results have a failure category', count(*)
FROM fact_test_result WHERE status IN ('failed', 'flaky') AND failure_key = left(md5('none|'), 12);

SELECT 'run totals add up', count(*)
FROM fact_run WHERE passed + failed + flaky + skipped <> tests;

SELECT 'run totals match the Playwright summary', count(*)
FROM fact_run AS f JOIN stg_runs AS s ON s.run_id = f.run_key
WHERE f.passed + f.skipped <> s.stats_expected + s.stats_skipped
   OR f.failed <> s.stats_unexpected
   OR f.flaky <> s.stats_flaky;

SELECT 'JUnit testcase count matches results', count(*)
FROM fact_run AS f JOIN stg_runs AS s ON s.run_id = f.run_key
WHERE s.junit_testcases IS NOT NULL AND s.junit_testcases <> f.tests;

SELECT 'no orphan test keys', count(*)
FROM fact_test_result f ANTI JOIN dim_test d ON d.test_key = f.test_key;

SELECT 'no orphan project keys', count(*)
FROM fact_test_result f ANTI JOIN dim_project d ON d.project_key = f.project_key;

SELECT 'no orphan environment keys', count(*)
FROM (SELECT environment_key FROM fact_test_result UNION ALL SELECT environment_key FROM fact_run) f
ANTI JOIN dim_environment d ON d.environment_key = f.environment_key;

SELECT 'no orphan release keys', count(*)
FROM (SELECT release_key FROM fact_test_result UNION ALL SELECT release_key FROM fact_run) f
ANTI JOIN dim_release d ON d.release_key = f.release_key;

SELECT 'no orphan commit keys', count(*)
FROM (SELECT commit_key FROM fact_test_result UNION ALL SELECT commit_key FROM fact_run) f
ANTI JOIN dim_commit d ON d.commit_key = f.commit_key;

SELECT 'no orphan date keys', count(*)
FROM (SELECT date_key FROM fact_test_result UNION ALL SELECT date_key FROM fact_run) f
ANTI JOIN dim_date d ON d.date_key = f.date_key;

SELECT 'no orphan failure keys', count(*)
FROM fact_test_result f ANTI JOIN dim_failure_category d ON d.failure_key = f.failure_key;

SELECT 'no orphan run keys', count(*)
FROM fact_test_result f ANTI JOIN fact_run r ON r.run_key = f.run_key;

SELECT 'dimension keys are unique', count(*)
FROM (
  SELECT 'test', test_key FROM dim_test GROUP BY ALL HAVING count(*) > 1
  UNION ALL SELECT 'project', project_key FROM dim_project GROUP BY ALL HAVING count(*) > 1
  UNION ALL SELECT 'environment', environment_key FROM dim_environment GROUP BY ALL HAVING count(*) > 1
  UNION ALL SELECT 'release', release_key FROM dim_release GROUP BY ALL HAVING count(*) > 1
  UNION ALL SELECT 'commit', commit_key FROM dim_commit GROUP BY ALL HAVING count(*) > 1
  UNION ALL SELECT 'date', CAST(date_key AS VARCHAR) FROM dim_date GROUP BY ALL HAVING count(*) > 1
  UNION ALL SELECT 'failure', failure_key FROM dim_failure_category GROUP BY ALL HAVING count(*) > 1
);
