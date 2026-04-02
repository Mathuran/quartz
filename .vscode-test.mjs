import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'dist/test/integration/**/*.test.js',
  mocha: {
    timeout: 30000,
  },
  workspaceFolder: './test/integration/fixtures',
  launchArgs: ['--profile-temp', '--theme', 'Default Light Modern'],
});
