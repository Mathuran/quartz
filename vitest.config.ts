import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['test/integration/**', 'test/e2e/**', 'node_modules/**', 'dist/**'],
    // Ordered test execution: foundational tests run first, edge cases last.
    // groupOrder controls cross-project ordering (lower = earlier).
    // Tests within each project run in parallel for speed.
    projects: [
      // Level 1: Parser — can we parse markdown into JSON?
      {
        test: {
          name: 'parser',
          include: [
            'test/parser.test.ts',
            'test/unit/parser-edge-cases.test.ts',
            'test/unit/callout-parser.test.ts',
          ],
          exclude: ['node_modules/**'],
          sequence: { groupOrder: 0 },
        },
      },
      // Level 2: Serializer — can we serialize JSON back to markdown?
      {
        test: {
          name: 'serializer',
          include: [
            'test/serializer.test.ts',
            'test/unit/serializer-edge-cases.test.ts',
            'test/unit/callout-serializer.test.ts',
          ],
          exclude: ['node_modules/**'],
          sequence: { groupOrder: 1 },
        },
      },
      // Level 3: Roundtrip — does parse(serialize(parse(md))) === parse(md)?
      {
        test: {
          name: 'roundtrip',
          include: [
            'test/roundtrip.test.ts',
            'test/unit/roundtrip-all-blocks.test.ts',
            'test/unit/callout-roundtrip.test.ts',
            'test/unit/frontmatter-roundtrip.test.ts',
          ],
          exclude: ['node_modules/**'],
          sequence: { groupOrder: 2 },
        },
      },
      // Level 4: Features & utilities — individual feature tests
      {
        test: {
          name: 'features',
          include: [
            'test/features.test.ts',
            'test/fixtures.test.ts',
            'test/debounce.test.ts',
            'test/unit/list-item-movement.test.ts',
          'test/unit/heading-extractor.test.ts',
          'test/unit/heading-extractor-extension.test.ts',
          'test/unit/diff-engine.test.ts',
          'test/unit/diff-alignment.test.ts',
          'test/unit/search-engine.test.ts',
          ],
          exclude: ['node_modules/**'],
          sequence: { groupOrder: 3 },
        },
      },
      // Level 5: Edge cases & performance — comprehensive stress tests
      {
        test: {
          name: 'edge-cases',
          include: [
            'test/unit/additional-edge-cases.test.ts',
            'test/performance.test.ts',
          ],
          exclude: ['node_modules/**'],
          sequence: { groupOrder: 4 },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/webview/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      vscode: path.resolve(__dirname, 'test/__mocks__/vscode.ts'),
    },
  },
});
