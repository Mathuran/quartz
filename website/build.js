#!/usr/bin/env node

/**
 * Quartz Website — Production Build Script
 *
 * Bundles and minifies JS, copies static assets to dist/.
 * Uses esbuild (already a project dependency).
 */

import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, 'dist');

// Clean previous build
if (existsSync(DIST)) {
  rmSync(DIST, { recursive: true });
}

mkdirSync(DIST, { recursive: true });

async function buildSite() {
  console.log('Building Quartz website...\n');

  // Bundle JS
  await build({
    entryPoints: [join(__dirname, 'js/main.js')],
    bundle: true,
    minify: true,
    format: 'esm',
    outfile: join(DIST, 'js/main.js'),
    target: ['es2020'],
    sourcemap: true,
  });

  // Bundle demo JS separately (lazy-loaded)
  await build({
    entryPoints: [join(__dirname, 'demo/demo.js')],
    bundle: true,
    minify: true,
    format: 'esm',
    outfile: join(DIST, 'demo/demo.js'),
    target: ['es2020'],
  });

  // Copy static files
  const staticDirs = ['css', 'assets'];
  for (const dir of staticDirs) {
    cpSync(join(__dirname, dir), join(DIST, dir), { recursive: true });
  }

  // Copy images from project root
  const PROJECT_ROOT = join(__dirname, '..');
  const imagesDir = join(PROJECT_ROOT, 'images');
  if (existsSync(imagesDir)) {
    cpSync(imagesDir, join(DIST, 'images'), { recursive: true });
  }

  // Copy Quartz webview bundle for the demo editor
  const webviewDir = join(PROJECT_ROOT, 'dist', 'webview');
  if (existsSync(webviewDir)) {
    cpSync(webviewDir, join(DIST, 'demo', 'webview'), { recursive: true });
  } else {
    console.warn(
      'Warning: dist/webview/ not found — run "npm run build" in the project root first',
    );
  }

  // Copy HTML files
  cpSync(join(__dirname, 'index.html'), join(DIST, 'index.html'));
  cpSync(join(__dirname, 'demo/index.html'), join(DIST, 'demo/index.html'));
  cpSync(join(__dirname, 'demo/demo.css'), join(DIST, 'demo/demo.css'));

  // Copy v2-themed demo page
  const v2DemoSrc = join(__dirname, 'demo/v2.html');
  if (existsSync(v2DemoSrc)) {
    cpSync(v2DemoSrc, join(DIST, 'demo/v2.html'));
  }

  // Copy v2 landing page
  const v2Dir = join(__dirname, 'v2');
  if (existsSync(v2Dir)) {
    mkdirSync(join(DIST, 'v2'), { recursive: true });
    cpSync(join(v2Dir, 'index.html'), join(DIST, 'v2', 'index.html'));
    const v2DemoPage = join(v2Dir, 'demo.html');
    if (existsSync(v2DemoPage)) {
      cpSync(v2DemoPage, join(DIST, 'v2', 'demo.html'));
    }
  }

  // Create _headers for Cloudflare Pages
  const headers = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/index.html
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-src 'self'

/demo/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:

/v2/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; frame-src 'self'
`;

  const { writeFileSync } = await import('fs');
  writeFileSync(join(DIST, '_headers'), headers);

  console.log('Build complete! Output: website/dist/');
}

buildSite().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
