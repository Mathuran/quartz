# [005] Write Block Rendering Tests

## Metadata
- **Status:** DONE
- **Depends On:** 002, 003
- **Blocks:** —
- **Scope:** M
- **Design Doc:** [e2e-playwright-testing](../../design-docs/e2e-playwright-testing.md)

## Description

Write comprehensive tests that verify every block type renders correctly when markdown is loaded into the editor. This covers the P0 "Block Rendering" category from the testing strategy (10-12 tests).

## Acceptance Criteria

- [ ] `test/e2e/specs/block-rendering.spec.ts` exists with 10-12 tests covering:
  - Headings: H1 through H6 render with correct tags and text
  - Paragraphs: plain text renders as `<p>` elements
  - Bullet lists: unordered lists render with `<ul>` / `<li>`
  - Ordered lists: numbered lists render with `<ol>` / `<li>`
  - Task lists: checkboxes render with correct checked/unchecked state
  - Code blocks: fenced code renders in `<pre><code>` with language class
  - Blockquotes: quoted text renders in `<blockquote>`
  - Tables: header row, body rows, and cells render correctly
  - Horizontal rules: `---` renders as `<hr>`
  - Images: image markdown renders an `<img>` tag (may show broken image if src is relative)
  - Nested structures: blockquote containing a list, list containing code
- [ ] Tests use the `all-blocks.md` fixture for comprehensive rendering
- [ ] Tests also load individual block-type content via `loadMarkdown` for isolation
- [ ] All tests pass via `npm run test:e2e`

## Technical Notes

### Suggested Approach
1. Create `test/e2e/specs/block-rendering.spec.ts`
2. Use `test.describe` groups for each block type
3. Load `all-blocks.md` fixture for a combined rendering test
4. Use individual `loadMarkdown` calls for isolated block tests (e.g., `loadMarkdown(page, '## Heading 2\n')`)
5. Use page object locators: `editorPage.heading(2)`, `editorPage.codeBlock()`, etc.

### Files to Create
- `test/e2e/specs/block-rendering.spec.ts`

### Key Considerations
- TipTap renders task lists with `data-type="taskList"` attribute — the page object already has `taskList()` locator for this
- Code blocks may have a `data-language` attribute or a `language-*` class depending on TipTap's code block extension
- Images with relative `src` will show as broken in the harness (no image serving) — test should check the `<img>` tag exists, not that the image loaded
- Tables may have `<thead>` / `<tbody>` depending on TipTap's table extension

## Tests Required

### E2E Tests (this IS the test issue)
- [ ] H1-H6 headings render with correct tags
- [ ] Paragraphs render as `<p>` elements
- [ ] Bullet lists render with `<ul>` and `<li>`
- [ ] Ordered lists render with `<ol>` and `<li>`
- [ ] Task lists render with checkboxes
- [ ] Code blocks render in `<pre><code>` with syntax class
- [ ] Blockquotes render in `<blockquote>`
- [ ] Tables render with header and body rows
- [ ] Horizontal rules render as `<hr>`
- [ ] Images render as `<img>` tags
- [ ] Nested structures render correctly (e.g., list inside blockquote)

## Definition of Done

- [ ] All acceptance criteria met
- [ ] All 10-12 tests pass via `npm run test:e2e`
- [ ] Every block type supported by the parser is covered
- [ ] No regressions in existing tests
