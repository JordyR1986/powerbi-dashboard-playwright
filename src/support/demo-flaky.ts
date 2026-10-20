import type { TestInfo } from '@playwright/test';

/**
 * Decides whether the demo flaky test fails on this attempt.
 *
 * It only fails on the first attempt, and only when the project retries, so the
 * final result is always a pass and Playwright reports it as `flaky`. Local runs
 * without retries never fail. The rate can be changed with DEMO_FLAKY_RATE (0 to 1).
 */
export function demoFailsThisAttempt(testInfo: TestInfo, random: () => number = Math.random) {
  const rate = Number(process.env.DEMO_FLAKY_RATE ?? '0.3');
  const firstAttempt = testInfo.retry === 0;
  const canRetry = testInfo.project.retries > 0;
  return firstAttempt && canRetry && random() < rate;
}
