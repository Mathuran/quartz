#!/usr/bin/env node

/**
 * Quartz Website — Production Build Script
 *
 * Copies static assets to dist/.
 * Uses esbuild (already a project dependency).
 */

import { cpSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, 'dist');
const PROJECT_ROOT = join(__dirname, '..');

// Clean previous build
if (existsSync(DIST)) {
  rmSync(DIST, { recursive: true });
}

mkdirSync(DIST, { recursive: true });

async function buildSite() {
  console.log('Building Quartz website...\n');

  // Copy static assets
  cpSync(join(__dirname, 'assets'), join(DIST, 'assets'), { recursive: true });

  // Copy Quartz webview bundle for the demo editor
  const webviewDir = join(PROJECT_ROOT, 'dist', 'webview');
  if (existsSync(webviewDir)) {
    cpSync(webviewDir, join(DIST, 'demo', 'webview'), { recursive: true });
  } else {
    console.warn(
      'Warning: dist/webview/ not found — run "npm run build" in the project root first',
    );
  }

  // Copy HTML pages
  cpSync(join(__dirname, 'index.html'), join(DIST, 'index.html'));
  cpSync(join(__dirname, 'demo.html'), join(DIST, 'demo.html'));
  cpSync(join(__dirname, 'demo/index.html'), join(DIST, 'demo/index.html'));

  // Create _headers for Cloudflare Pages
  const headers = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/index.html
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:

/demo.html
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src 'self'

/demo/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:
`;

  const { writeFileSync } = await import('fs');
  writeFileSync(join(DIST, '_headers'), headers);

  console.log('Build complete! Output: website/dist/');
}

buildSite().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
