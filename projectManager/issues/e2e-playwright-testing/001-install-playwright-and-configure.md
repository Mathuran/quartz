# [001] Install Playwright and Configure Build Scripts

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** 002, 003
- **Scope:** S
- **Design Doc:** [e2e-playwright-testing](../../design-docs/e2e-playwright-testing.md)

## Description

Install Playwright as a devDependency, create `playwright.config.ts` at the project root, add the `build:webview` script to `package.json`, and add the `test:e2e` script. This is the foundation that all other E2E issues depend on.

## Acceptance Criteria

- [ ] `@playwright/test` is added to `devDependencies` in `package.json`
- [ ] Chromium browser is installed via `npx playwright install chromium`
- [ ] `playwright.config.ts` exists at project root with Chromium-only project, `testDir: './test/e2e'`, `testMatch: '**/*.spec.ts'`, `globalSetup`/`globalTeardown` paths, and `baseURL` from `E2E_BASE_URL` env var
- [ ] `npm run build:webview` builds only `dist/webview/index.js` + `index.css` (not the extension host)
- [ ] `npm run test:e2e` runs `npx playwright test`
- [ ] `test-results/` and `playwright-report/` are added to `.gitignore`

## Technical Notes

### Suggested Approach
1. Run `npm install -D @playwright/test` and `npx playwright install chromium`
2. Create `playwright.config.ts` based on the design doc section 4.5
3. Modify `esbuild.js` to support a webview-only build mode (e.g., check `--webview-only` arg or add a separate esbuild script entry), or add a minimal esbuild script inline in `package.json`
4. Add scripts to `package.json`:
   - `"build:webview"` — runs esbuild for the webview entry only
   - `"test:e2e"` — runs `npx playwright test`
5. Add `test-results/`, `playwright-report/`, and `test-results/e2e-report/` to `.gitignore`

### Files to Modify
- `package.json` — add devDependency, add scripts
- `esbuild.js` — add webview-only build support (or create separate script)
- `.gitignore` — add Playwright output dirs
- `playwright.config.ts` — create new

### Key Considerations
- The `globalSetup` and `globalTeardown` paths in the config will point to files created in issue 002; the config will reference them but they won't exist yet — that's fine since tests won't run until those files exist
- Keep the Playwright config minimal; only Chromium project, no Firefox/WebKit
- The `build:webview` script should produce the same output as the webview portion of `npm run build`

## Tests Required

### Manual Testing
- [ ] `npm run build:webview` produces `dist/webview/index.js` and `dist/webview/index.css`
- [ ] `npm run build:webview` does NOT produce `dist/extension.js`
- [ ] `npx playwright test --list` runs without config errors (tests will fail since no test files exist yet)

## Definition of Done

- [ ] All acceptance criteria met
- [ ] `npm run build:webview` works correctly
- [ ] Playwright config loads without errors
- [ ] No regressions in existing `npm run build` or `npm test`
