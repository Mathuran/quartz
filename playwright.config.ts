import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  retries: 1,
  globalSetup: './test/e2e/global-setup.ts',
  globalTeardown: './test/e2e/global-teardown.ts',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3100',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  outputDir: './playwright-results',
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
});
