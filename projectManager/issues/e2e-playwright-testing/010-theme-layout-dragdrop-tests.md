# [010] Write Theme, Page Layout, and Drag-and-Drop Tests

## Metadata
- **Status:** DONE
- **Depends On:** 002, 003
- **Blocks:** —
- **Scope:** M
- **Design Doc:** [e2e-playwright-testing](../../design-docs/e2e-playwright-testing.md)

## Description

Write the P2 test specs covering theme rendering (light/dark), page layout mode (letter-size dimensions), and drag-and-drop block reordering. Also configure the HTML reporter and update `npm run test:all` to include E2E tests. This completes Phase 3.

## Acceptance Criteria

- [ ] `test/e2e/specs/theme.spec.ts` exists with 2-3 tests:
  - Sending `configUpdate` with `theme: 'light'` applies light theme CSS classes/variables
  - Sending `configUpdate` with `theme: 'dark'` applies dark theme CSS classes/variables
  - Default `theme: 'auto'` does not crash (may not have a deterministic result in test)
- [ ] `test/e2e/specs/page-layout.spec.ts` exists with 2-3 tests:
  - With `pageLayout: true`, page container has expected width (816px default)
  - With `pageLayout: false`, editor uses full width (no fixed container)
  - Page margin config is reflected in CSS (72px default)
- [ ] `test/e2e/specs/drag-drop.spec.ts` exists with 2-3 tests:
  - Drag handle is visible on block hover (if `showBlockHandles: true`)
  - Dragging a block to a new position reorders the DOM
  - Reordered content is reflected in serialized markdown
- [ ] HTML reporter configured in `playwright.config.ts` (already done in issue 001, verify working)
- [ ] `npm run test:all` updated in `package.json` to run unit + integration + E2E tests
- [ ] All tests pass via `npm run test:e2e`

## Technical Notes

### Suggested Approach
1. For theme tests: use `page.evaluate` to call `__updateConfig({ ...defaultConfig, theme: 'dark' })`, then check for CSS custom properties or class names on the root element
2. For page layout tests: use `__updateConfig` to toggle `pageLayout`, then measure the page container's computed width via `page.locator('.page-container').boundingBox()`
3. For drag-and-drop: use Playwright's `page.dragAndDrop()` or the `locator.dragTo()` API to move blocks via the drag handle
4. Update `package.json` `test:all` script to chain: `npm test && npm run test:integration && npm run test:e2e`

### Files to Create
- `test/e2e/specs/theme.spec.ts`
- `test/e2e/specs/page-layout.spec.ts`
- `test/e2e/specs/drag-drop.spec.ts`

### Files to Modify
- `package.json` — update `test:all` script

### Files to Read (for reference)
- `src/webview/components/PageContainer.tsx` — for page layout CSS class names
- `src/webview/extensions/dragHandle.ts` — for drag handle implementation and CSS selectors
- `src/webview/styles/editor.css` — for theme-related CSS custom properties

### Key Considerations
- Theme tests in the standalone harness won't have VS Code's theme variables; the harness may need basic CSS variable defaults or the test should verify the editor's own theme class switching
- Drag-and-drop is notoriously flaky in E2E tests — use generous timeouts and stable selectors
- The drag handle extension uses a ProseMirror plugin decoration — verify the actual DOM element and CSS class it produces
- Page layout may use `PageContainer.tsx` — check if it wraps content in a fixed-width div

## Tests Required

### E2E Tests (this IS the test issue)
- [ ] Light theme applies correct CSS
- [ ] Dark theme applies correct CSS
- [ ] Auto theme does not crash
- [ ] Page layout mode applies fixed width
- [ ] Fluid mode uses full width
- [ ] Page margin is reflected in CSS
- [ ] Drag handle visible on hover
- [ ] Block drag-and-drop reorders content
- [ ] `npm run test:all` runs all test suites

## Definition of Done

- [ ] All acceptance criteria met
- [ ] All 7-9 tests pass via `npm run test:e2e`
- [ ] HTML reporter generates report in `test-results/e2e-report/`
- [ ] `npm run test:all` runs unit, integration, and E2E tests
- [ ] No regressions in existing tests
