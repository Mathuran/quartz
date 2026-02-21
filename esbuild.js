const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');
const webviewOnly = process.argv.includes('--webview-only');

/** @type {import('esbuild').BuildOptions} */
const extensionConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: !isWatch,
};

/** @type {import('esbuild').BuildOptions} */
const webviewConfig = {
  entryPoints: ['src/webview/index.tsx'],
  bundle: true,
  outdir: 'dist/webview',
  format: 'esm',
  splitting: true,
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  minify: !isWatch,
  define: {
    'process.env.NODE_ENV': isWatch ? '"development"' : '"production"',
  },
  loader: {
    '.css': 'css',
  },
  // Chunk naming: place shared chunks alongside the entry point
  chunkNames: 'chunks/[name]-[hash]',
};

async function build() {
  if (isWatch) {
    const extCtx = await esbuild.context(extensionConfig);
    const webCtx = await esbuild.context(webviewConfig);
    await Promise.all([extCtx.watch(), webCtx.watch()]);
    console.log('Watching for changes...');
  } else if (webviewOnly) {
    await esbuild.build(webviewConfig);
    console.log('Webview build complete.');
  } else {
    await Promise.all([
      esbuild.build(extensionConfig),
      esbuild.build(webviewConfig),
    ]);
    console.log('Build complete.');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
