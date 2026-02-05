# [004] Write Smoke Tests for Editor Loading

## Metadata
- **Status:** DONE
- **Depends On:** 002, 003
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [e2e-playwright-testing](../../design-docs/e2e-playwright-testing.md)

## Description

Write the first Playwright spec file (`test/e2e/specs/editor-load.spec.ts`) that verifies the test harness works end-to-end: loading markdown fixtures into the editor and confirming the editor renders content. This is the validation that the entire infrastructure (harness, server, fixtures, page object) works together.

## Acceptance Criteria

- [ ] `test/e2e/specs/editor-load.spec.ts` exists with 4-5 tests:
  - Loads `simple.md` and verifies correct number of paragraphs
  - Loads `complex.md` and verifies heading, code block, table, and blockquote are visible
  - Loads `empty.md` and verifies ProseMirror editor is visible
  - Loads `large.md` and verifies editor renders without timeout
  - Types text in editor and verifies serialized markdown update is received
- [ ] `npm run test:e2e` passes all tests (runs build, starts server, executes tests, tears down)
- [ ] Tests use the fixture loader and page object model from issue 003
- [ ] Tests use the queue-based `waitForUpdate` with `getUpdateCount` for edit verification

## Technical Notes

### Suggested Approach
1. Create `test/e2e/specs/editor-load.spec.ts` based on design doc section 4.7
2. Use `test.beforeEach` to create `EditorPage` and navigate to harness
3. For the edit test: capture `getUpdateCount` before editing, then `waitForUpdate(page, countBefore - 1)` to wait for the new update
4. Run `npm run test:e2e` to verify the full pipeline

### Files to Create
- `test/e2e/specs/editor-load.spec.ts`

### Key Considerations
- The `large.md` test (1403 lines) may need a longer timeout — use `test.slow()` or increase the individual test timeout
- The edit test triggers a 300ms debounce, so `waitForUpdate` must account for this
- If tests fail, check:
  1. Is the webview bundle built? (`dist/webview/index.js` exists?)
  2. Is the server responding? (try `curl http://localhost:<port>/test/e2e/harness.html`)
  3. Is the mock working? (check browser console for `acquireVsCodeApi` errors)

## Tests Required

### E2E Tests (this IS the test issue)
- [ ] `loads simple markdown and renders paragraphs` — load `simple.md`, assert paragraph count
- [ ] `loads complex markdown with all block types` — load `complex.md`, assert h1/code/table/blockquote visible
- [ ] `handles empty document` — load `empty.md`, assert ProseMirror is visible
- [ ] `handles large document` — load `large.md`, assert editor renders within timeout
- [ ] `edits text and produces updated markdown` — load content, type text, assert update received

## Definition of Done

- [ ] All acceptance criteria met
- [ ] All 4-5 tests pass via `npm run test:e2e`
- [ ] Full pipeline works: build:webview → start server → run tests → teardown
- [ ] No regressions in existing tests
