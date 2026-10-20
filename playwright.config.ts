import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { env } from './src/config/env';

const isCI = Boolean(process.env.CI);

// Allure results are written by every run; CI merges them across shards into one report.
const allure: ReporterDescription = [
  'allure-playwright',
  {
    resultsDir: 'allure-results',
    suiteTitle: true,
    environmentInfo: {
      node: process.version,
      os: `${process.platform} ${process.arch}`,
      ui_target: env.baseURL,
      api_target: env.apiBaseURL,
      git_sha: process.env.GITHUB_SHA ?? 'local',
      ci_run: process.env.GITHUB_RUN_ID ?? 'local',
    },
  },
];

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.01,
    },
  },
  // In CI every shard writes a blob report; the report job merges them into HTML, JSON and JUnit.
  // The HTML reporter stays on so a single Docker run also leaves a readable report.
  reporter: isCI
    ? [
        ['blob'],
        ['github'],
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        allure,
      ]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }], allure],
  use: {
    baseURL: env.baseURL,
    // Sauce Demo marks controls with data-test, not the Playwright default data-testid.
    testIdAttribute: 'data-test',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        screenshot: 'off',
        video: 'off',
      },
    },
    {
      name: 'chromium',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testDir: './tests/ui',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testDir: './tests/ui',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      testDir: './tests/ui',
      use: { ...devices['Pixel 5'] },
    },
    {
      // Baselines are only valid inside the official Playwright image (see docs/visual-testing.md).
      // Outside CI or Docker the pages are still checked, but screenshot assertions are skipped.
      name: 'visual',
      testDir: './tests/visual',
      snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
      ignoreSnapshots: !isCI,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'demo',
      testDir: './tests/demo',
      use: {
        screenshot: 'off',
        video: 'off',
      },
    },
  ],
});
