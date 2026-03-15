#!/usr/bin/env node

import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const PORT = process.argv[2] || 8090;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
  '.map': 'application/json',
};

createServer(async (req, res) => {
  let path = req.url.split('?')[0];
  if (path === '/') path = '/index.html';
  if (!extname(path)) path += '/index.html';

  // Resolve file: /dist/*, /images/* from project root, everything else from website/
  let filePath;
  if (path.startsWith('/dist/') || path.startsWith('/images/')) {
    filePath = join(PROJECT_ROOT, path);
  } else {
    filePath = join(__dirname, path);
  }

  // Fallback: if not found locally, try project root (for images/ without leading slash)
  const { existsSync } = await import('fs');
  if (!existsSync(filePath) && !path.startsWith('/dist/')) {
    const rootFallback = join(PROJECT_ROOT, path);
    if (existsSync(rootFallback)) {
      filePath = rootFallback;
    }
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}).listen(PORT, () => {
  console.log(`Quartz website → http://localhost:${PORT}`);
});
