import { expect, test } from '@playwright/test';
import { demoFailsThisAttempt } from '../../src/support/demo-flaky';

/*
 * Deliberately flaky demo test. It is NOT a real check of the demo apps.
 *
 * It exists so the dashboard has a known, labelled example of flakiness: in CI it
 * fails on roughly 30% of first attempts and always passes on the retry. Filter it
 * out with the @demo-flaky tag (for example `--grep-invert @demo-flaky`).
 */
test.describe('Demo', { tag: '@demo-flaky' }, () => {
  test('recovers on retry after a simulated first-attempt failure', async () => {
    const fails = demoFailsThisAttempt(test.info());

    expect(fails, 'simulated first-attempt failure (demo)').toBe(false);
  });
});
