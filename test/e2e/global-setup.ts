import { execSync } from 'child_process';
import * as http from 'http';
import { startServer } from './server';

declare const globalThis: typeof global & {
  __E2E_SERVER?: http.Server;
  __E2E_PORT?: number;
};

export default async function globalSetup() {
  console.log('Building webview...');
  execSync('npm run build:webview', { stdio: 'inherit' });

  console.log('Starting E2E test server...');
  const { server, port } = await startServer();

  // Store port in env for Playwright tests
  process.env.E2E_BASE_URL = `http://localhost:${port}`;

  // Store server reference on globalThis for teardown
  globalThis.__E2E_SERVER = server;
  globalThis.__E2E_PORT = port;

  console.log(`E2E setup complete. Base URL: ${process.env.E2E_BASE_URL}`);
}
