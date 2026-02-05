# [003] Create Fixture Loader and Page Object Model

## Metadata
- **Status:** DONE
- **Depends On:** 001, 002
- **Blocks:** 004, 005, 006, 007, 008, 009, 010
- **Scope:** M
- **Design Doc:** [e2e-playwright-testing](../../design-docs/e2e-playwright-testing.md)

## Description

Create the fixture loader utility (`test/e2e/fixtures.ts`) that loads markdown files into the editor via the harness message protocol, and the page object model (`test/e2e/pages/editor.page.ts`) that encapsulates editor DOM queries and user interactions with platform-aware keyboard modifiers.

## Acceptance Criteria

- [ ] `test/e2e/fixtures.ts` exists with these exports:
  - `loadFixture(page, fixtureName)` — reads `.md` from `test/e2e/fixtures/` (falls back to `test/integration/fixtures/`), loads it into editor, waits for `.ProseMirror[contenteditable="true"]`
  - `loadMarkdown(page, content, fileName?)` — loads raw string into editor
  - `getEditorMarkdown(page)` — returns latest update content
  - `getUpdateCount(page)` — returns number of updates received
  - `waitForUpdate(page, afterIndex?, timeout?)` — waits for an update after the given index
  - `waitForNthUpdate(page, n, timeout?)` — waits for the nth update (1-based)
- [ ] `test/e2e/pages/editor.page.ts` exists with:
  - `goto()` — navigates to `/test/e2e/harness.html`
  - Block-level locators: `heading(level)`, `paragraph()`, `codeBlock()`, `bulletList()`, `orderedList()`, `taskList()`, `blockquote()`, `table()`, `horizontalRule()`
  - Inline locators: `bold()`, `italic()`, `inlineCode()`, `link()`
  - Platform-aware `mod` property (`Meta` on macOS, `Control` elsewhere)
  - Interaction methods: `typeInEditor(text)`, `pressKeys(keys)`, `triggerSlashCommand(command)`, `selectAllText()`, `undo()`, `redo()`, `toggleBold()`, `toggleItalic()`
- [ ] E2E-specific fixtures created in `test/e2e/fixtures/`:
  - `all-blocks.md` — contains every block type (heading, paragraph, list, code, table, blockquote, hr, task list, image)
  - `inline-formatting.md` — bold, italic, code, strikethrough, links
  - `nested-lists.md` — deeply nested bullet/ordered lists
  - `slash-commands.md` — expected output of slash command insertions

## Technical Notes

### Suggested Approach
1. Create `test/e2e/fixtures.ts` based on design doc section 4.2
2. Create `test/e2e/pages/editor.page.ts` based on design doc section 4.3
3. Create `test/e2e/fixtures/` directory with markdown fixture files
4. Use `process.platform === 'darwin'` for platform detection in the page object

### Files to Create
- `test/e2e/fixtures.ts`
- `test/e2e/pages/editor.page.ts`
- `test/e2e/fixtures/all-blocks.md`
- `test/e2e/fixtures/inline-formatting.md`
- `test/e2e/fixtures/nested-lists.md`
- `test/e2e/fixtures/slash-commands.md`

### Key Considerations
- The fixture loader falls back from `test/e2e/fixtures/` to `test/integration/fixtures/` — this allows reuse of existing `simple.md`, `complex.md`, etc. without duplication
- `waitForUpdate` uses `page.waitForFunction` to poll `__getUpdateCount()` — the 300ms debounce in the editor means tests should typically wait 500ms+ for updates
- The page object's `triggerSlashCommand` waits for `.slash-menu` selector — verify this matches the actual CSS class used by `SlashMenu.tsx`
- Locator selectors use semantic HTML tags (`h1`, `strong`, `blockquote`) not TipTap-specific classes, for stability across TipTap upgrades

## Tests Required

### Manual Testing
- [ ] Fixture files contain valid markdown that parses correctly
- [ ] Page object locators match the actual DOM structure rendered by TipTap

### Integration Verification (with issue 004)
- [ ] `loadFixture` successfully loads `simple.md` and `complex.md`
- [ ] `waitForUpdate` returns content after edits

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Fixture loader handles both local and shared fixture directories
- [ ] Page object has platform-aware keyboard modifiers
- [ ] All 4 E2E fixture files created with representative markdown content
- [ ] No regressions in existing tests
