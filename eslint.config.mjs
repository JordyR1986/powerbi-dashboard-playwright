import eslint from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'blob-report/**',
      'allure-results/**',
      'allure-report/**',
      'allure-history/**',
      'raw-results/**',
      'all-blob-reports/**',
      'site/**',
      '.data-branch/**',
      '.data/**',
      'pipeline/tests/fixtures/**',
      'package-lock.json',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-skipped-test': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-focused-test': 'error',
    },
  },
);
