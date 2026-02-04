# [004] Integration Test Infrastructure

## Metadata
- **Status:** TODO
- **Depends On:** —
- **Blocks:** 005, 006
- **Scope:** M
- **Design Doc:** [comprehensive-test-suite](../../design-docs/comprehensive-test-suite.md)

## Description

Set up the `@vscode/test-cli` infrastructure for running integration tests inside a real VS Code instance. This includes installing dependencies, creating the configuration file, building test fixtures, adding a separate TypeScript config for integration tests (they use Mocha, not Vitest), and adding the `test:integration` npm script.

## Acceptance Criteria

- [ ] `@vscode/test-cli` and `@vscode/test-electron` added as dev dependencies in `package.json`
- [ ] `.vscode-test.mjs` config file created at project root
- [ ] `test/integration/fixtures/` directory created with 5 fixture `.md` files
- [ ] `tsconfig.test-integration.json` created for compiling integration tests to `dist/test/integration/`
- [ ] `npm run test:integration` script added to `package.json`
- [ ] A minimal smoke test (`test/integration/smoke.test.ts`) passes, verifying VS Code launches and the extension is present
- [ ] `test:all` script runs both unit and integration tests

## Technical Notes

### Setup Steps

1. Install dependencies: `npm install -D @vscode/test-cli @vscode/test-electron`
2. Create `.vscode-test.mjs`:
   ```js
   import { defineConfig } from '@vscode/test-cli';
   export default defineConfig({
     files: 'dist/test/integration/**/*.test.js',
     mocha: { timeout: 30000 },
     workspaceFolder: './test/integration/fixtures',
   });
   ```
3. Create `tsconfig.test-integration.json` extending base config but targeting `dist/test/integration/`
4. Create fixture files:
   - `simple.md` — heading + 2 paragraphs
   - `complex.md` — all block types
   - `frontmatter.md` — YAML frontmatter + body
   - `empty.md` — empty file
   - `large.md` — 1000 lines (generated or static)

### Files to Create
- `.vscode-test.mjs`
- `tsconfig.test-integration.json`
- `test/integration/smoke.test.ts`
- `test/integration/fixtures/simple.md`
- `test/integration/fixtures/complex.md`
- `test/integration/fixtures/frontmatter.md`
- `test/integration/fixtures/empty.md`
- `test/integration/fixtures/large.md`

### Files to Modify
- `package.json` — add devDependencies and scripts
- `.vscodeignore` — exclude test/integration from packaged extension

### Key Considerations
- Integration tests use Mocha + `assert`, not Vitest — they run inside VS Code's extension host
- Tests must be compiled to JS before running (via `tsconfig.test-integration.json`)
- Use a clean VS Code profile (`@vscode/test-cli` does this by default)
- The smoke test should just verify `vscode.extensions.getExtension('quartz.quartz-markdown-editor')` is defined

## Tests Required

### Integration Tests
- [ ] Smoke test: VS Code launches and extension is found

### Manual Testing
- [ ] `npm run test:integration` completes without error
- [ ] `npm run test:all` runs both unit and integration tests sequentially

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Smoke test passes
- [ ] No regressions in existing unit tests
