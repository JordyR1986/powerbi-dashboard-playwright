import { defineConfig } from 'allure';

// Failure categories mirror dim_failure_category in the planned data model.
export default defineConfig({
  name: 'Power BI Dashboard for Playwright',
  output: './allure-report',
  historyPath: './allure-history/history.jsonl',
  historyLimit: 60,
  plugins: {
    awesome: {
      options: {
        reportName: 'Power BI Dashboard for Playwright',
        reportLanguage: 'en',
        singleFile: false,
        groupBy: ['parentSuite', 'suite', 'subSuite'],
      },
    },
  },
  categories: [
    {
      name: 'Visual difference',
      matchers: { statuses: ['failed', 'broken'], message: /screenshot|pixels? .*different/i },
    },
    {
      name: 'Network or target unavailable',
      matchers: {
        statuses: ['failed', 'broken'],
        message: /ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|socket hang up|net::ERR_|50[234]/,
      },
    },
    {
      name: 'Locator problem',
      matchers: {
        statuses: ['failed', 'broken'],
        message:
          /strict mode violation|resolved to \d+ elements|element is not (visible|attached)/i,
      },
    },
    {
      name: 'Timeout',
      matchers: { statuses: ['failed', 'broken'], message: /timeout|exceeded/i },
    },
    {
      name: 'Assertion failed',
      matchers: { statuses: ['failed'], message: /expect\(|expected|received|contract/i },
    },
  ],
});
