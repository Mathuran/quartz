const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');
const webviewOnly = process.argv.includes('--webview-only');
const isAnalyze = !!process.env.ANALYZE;

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
  metafile: isAnalyze,
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
  metafile: isAnalyze,
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
    const [extResult, webResult] = await Promise.all([
      esbuild.build(extensionConfig),
      esbuild.build(webviewConfig),
    ]);
    if (isAnalyze) {
      const meta = {
        extension: extResult.metafile,
        webview: webResult.metafile,
      };
      fs.writeFileSync('dist/meta.json', JSON.stringify(meta, null, 2));
      console.log('Metafile written to dist/meta.json');
    }
    console.log('Build complete.');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
