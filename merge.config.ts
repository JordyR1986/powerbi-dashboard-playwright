// Used by `playwright merge-reports` in CI to combine the blob reports of all shards.
// The JSON and JUnit files are kept as raw results for the data pipeline.
export default {
  testDir: './tests',
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'raw-results/playwright-results.json' }],
    ['junit', { outputFile: 'raw-results/junit.xml' }],
  ],
};
