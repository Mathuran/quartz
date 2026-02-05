# [007] Write Keyboard Shortcuts Tests

## Metadata
- **Status:** DONE
- **Depends On:** 002, 003
- **Blocks:** —
- **Scope:** M
- **Design Doc:** [e2e-playwright-testing](../../design-docs/e2e-playwright-testing.md)

## Description

Write tests that verify keyboard shortcuts for formatting, undo/redo, and other editor commands work correctly in the browser. Covers P1 "Keyboard Shortcuts" (8-10 tests).

## Acceptance Criteria

- [ ] `test/e2e/specs/keyboard-shortcuts.spec.ts` exists with 8-10 tests covering:
  - `Mod+B` toggles bold on selected text
  - `Mod+I` toggles italic on selected text
  - `Mod+Z` undoes the last action
  - `Mod+Shift+Z` redoes the last undone action
  - `Mod+A` selects all text
  - `Mod+E` toggles inline code (if supported)
  - `Mod+Shift+S` toggles strikethrough (if supported)
  - `Mod+K` inserts/edits link (if supported)
  - Enter key creates new paragraph
  - Shift+Enter creates soft line break (if supported)
- [ ] Tests use the page object's platform-aware modifier key (`Meta` on macOS, `Control` elsewhere)
- [ ] All tests pass via `npm run test:e2e`

## Technical Notes

### Suggested Approach
1. Create `test/e2e/specs/keyboard-shortcuts.spec.ts`
2. For formatting shortcuts: load markdown, select text (Mod+A or click+shift+click), press shortcut, verify DOM change
3. For undo/redo: make an edit, undo, verify original state, redo, verify edit state
4. Use `editorPage.toggleBold()`, `editorPage.toggleItalic()`, `editorPage.undo()`, `editorPage.redo()` from the page object
5. Check `src/webview/extensions/keyboardShortcuts.ts` for the full list of registered shortcuts

### Files to Create
- `test/e2e/specs/keyboard-shortcuts.spec.ts`

### Files to Read (for reference)
- `src/webview/extensions/keyboardShortcuts.ts` — to identify all registered shortcuts

### Key Considerations
- The page object uses `process.platform === 'darwin'` for platform detection — this determines `Meta` vs `Control`
- Some shortcuts may not be registered (e.g., `Mod+K` for links) — check `keyboardShortcuts.ts` to confirm which shortcuts exist before writing tests
- Undo/redo tests need to wait for the editor to process the shortcut before asserting — use short `page.waitForTimeout(100)` or check DOM state
- Text selection is needed before applying formatting — use `editorPage.selectAllText()` or `page.keyboard.press('Shift+End')` for partial selection

## Tests Required

### E2E Tests (this IS the test issue)
- [ ] Mod+B toggles bold on selection
- [ ] Mod+I toggles italic on selection
- [ ] Mod+Z undoes last action
- [ ] Mod+Shift+Z redoes undone action
- [ ] Mod+A selects all text
- [ ] Enter creates new paragraph
- [ ] At least 2 additional shortcuts from keyboardShortcuts.ts

## Definition of Done

- [ ] All acceptance criteria met
- [ ] All 8-10 tests pass via `npm run test:e2e`
- [ ] Tests work on both macOS and Linux (platform-aware modifiers)
- [ ] No regressions in existing tests
