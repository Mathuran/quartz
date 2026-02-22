import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  retries: 0,
  fullyParallel: true,
  workers: '50%',
  globalSetup: './test/e2e/global-setup.ts',
  globalTeardown: './test/e2e/global-teardown.ts',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3100',
    browserName: 'chromium',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    // Level 1: Foundational — does the editor load and render?
    {
      name: 'foundational',
      testMatch: [
        'specs/editor-load.spec.ts',
        'specs/block-rendering.spec.ts',
        'specs/inline-formatting.spec.ts',
      ],
    },
    // Level 2: Basic interactions — can the user type and use shortcuts?
    {
      name: 'interactions',
      testMatch: [
        'specs/editing.spec.ts',
        'specs/keyboard-shortcuts.spec.ts',
        'specs/theme.spec.ts',
        'specs/page-layout.spec.ts',
        'specs/sidebar-alignment.spec.ts',
      ],
      dependencies: ['foundational'],
    },
    // Level 3: Feature-specific — do individual features work?
    {
      name: 'features',
      testMatch: [
        'specs/block-movement.spec.ts',
        'specs/external-change.spec.ts',
        'specs/roundtrip.spec.ts',
        'specs/slash-commands.spec.ts',
      ],
      dependencies: ['interactions'],
    },
    // Level 4: Edge cases & integration — does everything hold together?
    {
      name: 'integration',
      testMatch: [
        'specs/edge-cases.spec.ts',
        'specs/edge-cases-2.spec.ts',
        'specs/comprehensive-editing-workflow.spec.ts',
      ],
      dependencies: ['features'],
    },
  ],
  outputDir: './playwright-results',
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
});
