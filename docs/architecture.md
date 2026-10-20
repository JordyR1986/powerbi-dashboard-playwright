# Architecture

```mermaid
flowchart LR
  subgraph Apps["Public demo apps"]
    SD[Sauce Demo<br/>UI]
    RB[Restful Booker<br/>API]
  end
  subgraph CI["GitHub Actions (push, PR, cron)"]
    T[Playwright + TS<br/>UI / API / visual<br/>in Docker, shards x browsers]
    M[Merge reports]
    AL[Allure report]
    J[JSON results]
  end
  subgraph Data["Data layer"]
    L[TS loader<br/>raw → staging]
    D[(DuckDB<br/>SQL transforms<br/>+ data quality checks)]
    P[Parquet star schema<br/>on data branch]
  end
  subgraph BI["Power BI"]
    PQ[Power Query M]
    SM[Semantic model<br/>star schema + DAX]
    R[Report pages]
  end
  SD --> T
  RB --> T
  T --> M --> AL --> GP[GitHub Pages]
  M --> J --> L --> D --> P --> PQ --> SM --> R
  R --> PUB[Screenshots, video,<br/>optional publish to web]
```

## Design decisions

- **Real data, not mock data.** A scheduled workflow runs the suite a few times a day. After a few weeks there are enough runs to show trends. Every Git tag (`v1.0`, `v1.1`, ...) counts as a release.
- **Flaky means Playwright's `flaky` status.** A test that failed first and passed on a retry. That is a real signal, not a home-made definition.
- **One clearly marked demo flaky test** (`@demo-flaky`) will show what flakiness looks like on the dashboard. A filter on the dashboard can hide it.
- **Storage without a server.** Parquet files on a separate `data` branch. Power BI reads them through Power Query's Web connector, so there is no database to run or pay for.
- **One container image everywhere.** Local Docker runs and CI use the official Playwright image at the same version as `@playwright/test`, so screenshots and browser behaviour match.

## Planned data model

Grain of `fact_test_result`: one test, on one browser project, in one CI run (final result after retries).

| Table                  | Main columns                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `fact_test_result`     | run, test, environment, release, date, failure category, status, is_flaky, retries, duration_ms |
| `fact_run`             | run, release, date, trigger (push/pr/cron), shard count, wall clock, commit sha, run url        |
| `dim_test`             | test id (hash of file + title), title, file, suite, type (ui/api/visual), tags, first seen      |
| `dim_release`          | git tag, commit sha, release date, release order                                                |
| `dim_date`             | date, week, month, weekday                                                                      |
| `dim_environment`      | project (chromium/firefox/webkit/mobile-chrome/api), os, runner, image version                  |
| `dim_failure_category` | category (timeout, assertion, locator, network, visual diff, other), normalized message         |

Pass rate excludes skipped results: `passed / (passed + failed)`, where `flaky` counts as passed. The full model and measures will be documented in `docs/data-model.md` in phase 3.
