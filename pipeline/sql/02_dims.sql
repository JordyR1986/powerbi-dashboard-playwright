-- Dimensions. Keys are natural or hashed values, so they stay the same on every rebuild.

-- Releases: every Git tag, plus 'untagged' for commits before the first tag.
CREATE OR REPLACE TABLE dim_release AS
WITH tags AS (
  SELECT tag AS release_key, tag AS git_tag, sha AS tag_sha, tagged_at
  FROM stg_git_tags
)
SELECT
  release_key,
  git_tag,
  tag_sha,
  CAST(tagged_at AS DATE) AS release_date,
  CAST(dense_rank() OVER (ORDER BY tagged_at, release_key) AS INTEGER) AS release_order
FROM tags
UNION ALL
SELECT 'untagged', NULL, NULL, NULL, 0;

-- Commits that were tested, with the release they belong to.
CREATE OR REPLACE TABLE dim_commit AS
SELECT
  r.sha AS commit_key,
  left(r.sha, 7) AS short_sha,
  c.committed_at,
  coalesce(c.release_tag, 'untagged') AS release_key
FROM (SELECT DISTINCT sha FROM stg_runs) AS r
LEFT JOIN stg_git_commits AS c USING (sha);

-- Playwright projects: browser, device and test layer.
CREATE OR REPLACE TABLE dim_project AS
SELECT
  project AS project_key,
  CASE
    WHEN project IN ('chromium', 'mobile-chrome', 'visual') THEN 'chromium'
    WHEN project = 'firefox' THEN 'firefox'
    WHEN project = 'webkit' THEN 'webkit'
    ELSE 'none'
  END AS browser,
  CASE
    WHEN project = 'mobile-chrome' THEN 'mobile'
    WHEN project IN ('chromium', 'firefox', 'webkit', 'visual') THEN 'desktop'
    ELSE 'none'
  END AS device,
  CASE
    WHEN project IN ('api', 'visual', 'demo') THEN project
    ELSE 'ui'
  END AS layer
FROM (SELECT DISTINCT project FROM stg_results);

-- Where the tests ran.
CREATE OR REPLACE TABLE dim_environment AS
SELECT DISTINCT
  left(md5(concat_ws('|', container_image, playwright_version)), 12) AS environment_key,
  coalesce(container_image, 'unknown') AS container_image,
  coalesce(playwright_version, 'unknown') AS playwright_version,
  -- Tests run inside the container, so its Ubuntu release is the operating system.
  CASE
    WHEN container_image LIKE '%-noble' THEN 'Ubuntu 24.04'
    WHEN container_image LIKE '%-jammy' THEN 'Ubuntu 22.04'
    WHEN container_image LIKE '%-resolute' THEN 'Ubuntu 26.04'
    ELSE 'unknown'
  END AS os
FROM stg_runs;

-- Tests. Title and tags come from the most recent run that saw the test.
CREATE OR REPLACE TABLE dim_test AS
WITH seen AS (
  SELECT r.*, s.started_at AS run_started_at
  FROM stg_results AS r
  JOIN stg_runs AS s USING (run_id)
),
latest AS (
  SELECT *
  FROM seen
  QUALIFY row_number() OVER (PARTITION BY test_id ORDER BY run_started_at DESC, run_id DESC) = 1
)
SELECT
  l.test_id AS test_key,
  l.title,
  l.title_path,
  l.file,
  l.describe_path AS suite,
  split_part(l.file, '/', 1) AS test_type,
  l.tags,
  list_contains(string_split(l.tags, ','), 'smoke') AS is_smoke,
  list_contains(string_split(l.tags, ','), 'demo-flaky') AS is_demo,
  f.first_seen,
  f.last_seen
FROM latest AS l
JOIN (
  SELECT test_id, CAST(min(run_started_at) AS DATE) AS first_seen, CAST(max(run_started_at) AS DATE) AS last_seen
  FROM seen
  GROUP BY test_id
) AS f USING (test_id);

-- Failure categories. The order of the CASE decides which category wins.
CREATE OR REPLACE TABLE stg_failures AS
SELECT
  run_id,
  test_id,
  project,
  failure_message,
  CASE
    WHEN failure_status IS NULL AND failure_message IS NULL THEN 'none'
    WHEN failure_message IS NULL THEN 'other'
    WHEN regexp_matches(failure_message, '(?i)screenshot|snapshot|pixels? .*different') THEN 'visual diff'
    WHEN regexp_matches(failure_message, 'ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|net::ERR_|\b50[234]\b') THEN 'network'
    WHEN regexp_matches(failure_message, '(?i)strict mode violation|resolved to \d+ elements|not attached|not visible') THEN 'locator'
    WHEN failure_status = 'timedOut' OR regexp_matches(failure_message, '(?i)timeout|timed out|exceeded') THEN 'timeout'
    WHEN regexp_matches(failure_message, '(?i)expect\(|expected|received|contract') THEN 'assertion'
    ELSE 'other'
  END AS category,
  -- Numbers, ids and quoted values vary between runs; take them out so equal problems group.
  CASE
    WHEN failure_message IS NULL THEN ''
    ELSE left(
      trim(regexp_replace(regexp_replace(regexp_replace(
        failure_message, '"[^"]*"', '"…"', 'g'), '\d+', 'N', 'g'), '\s+', ' ', 'g')),
      200)
  END AS normalized_message
FROM stg_results;

CREATE OR REPLACE TABLE dim_failure_category AS
SELECT
  left(md5(category || '|' || normalized_message), 12) AS failure_key,
  category,
  normalized_message,
  any_value(failure_message) AS example_message
FROM stg_failures
GROUP BY ALL
UNION ALL
-- Always keep the 'none' row, even when every result in the data failed.
SELECT left(md5('none|'), 12), 'none', '', NULL
WHERE NOT EXISTS (SELECT 1 FROM stg_failures WHERE category = 'none');

-- Calendar from the first to the last run day (UTC), without gaps.
CREATE OR REPLACE TABLE dim_date AS
WITH bounds AS (
  SELECT CAST(min(started_at) AS DATE) AS first_day, CAST(max(started_at) AS DATE) AS last_day
  FROM stg_runs
)
SELECT
  CAST(strftime(d, '%Y%m%d') AS INTEGER) AS date_key,
  CAST(d AS DATE) AS date,
  year(d) AS year,
  month(d) AS month,
  strftime(d, '%B') AS month_name,
  strftime(d, '%Y-%m') AS year_month,
  CAST(isoyear(d) AS INTEGER) * 100 + week(d) AS iso_year_week,
  isodow(d) AS weekday,
  strftime(d, '%A') AS weekday_name,
  isodow(d) >= 6 AS is_weekend
FROM bounds, range(first_day, last_day + INTERVAL 1 DAY, INTERVAL 1 DAY) AS t(d);
