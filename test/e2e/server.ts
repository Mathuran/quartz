import * as http from 'http';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_PORT = 3100;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.md': 'text/plain',
  '.map': 'application/json',
};

/** Check if a port is available */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

/** Find a free port starting from the default */
async function findFreePort(startPort = DEFAULT_PORT): Promise<number> {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No free port found in range ${startPort}-${startPort + 99}`);
}

export async function startServer(): Promise<{ server: http.Server; port: number }> {
  const port = await findFreePort();
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = req.url || '/';
      const filePath = path.join(ROOT, url);
      const ext = path.extname(filePath);
      const mime = MIME_TYPES[ext] || 'application/octet-stream';

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.writeHead(200, { 'Content-Type': mime });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(port, () => {
      console.log(`E2E test server running on http://localhost:${port}`);
      resolve({ server, port });
    });
  });
}

export function stopServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

// Allow running directly for manual testing
if (require.main === module) {
  startServer().then(({ port }) => {
    console.log(`Server started. Open http://localhost:${port}/test/e2e/harness.html`);
    console.log('Press Ctrl+C to stop.');
  });
}
