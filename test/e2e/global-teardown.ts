import { stopServer } from './server';

export default async function globalTeardown() {
  const server = (globalThis as any).__E2E_SERVER;
  if (server) {
    console.log('Stopping E2E test server...');
    await stopServer(server);
    console.log('E2E teardown complete.');
  }
}
