import * as http from 'http';
import { stopServer } from './server';

declare const globalThis: typeof global & {
  __E2E_SERVER?: http.Server;
};

export default async function globalTeardown() {
  const server = globalThis.__E2E_SERVER;
  if (server) {
    console.log('Stopping E2E test server...');
    await stopServer(server);
    console.log('E2E teardown complete.');
  }
}
