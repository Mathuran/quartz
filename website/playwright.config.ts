import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
  fullyParallel: true,
  retries: 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:8091',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node serve.js 8091',
    port: 8091,
    reuseExistingServer: true,
    timeout: 10_000,
  },
  projects: [
    {
      name: 'desktop-light',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        colorScheme: 'light',
      },
    },
    {
      name: 'desktop-dark',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark',
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['iPad (gen 7)'],
        colorScheme: 'light',
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        colorScheme: 'light',
      },
    },
  ],
});
