# [008] Write Slash Commands, Editing, and Roundtrip Tests

## Metadata
- **Status:** DONE
- **Depends On:** 002, 003
- **Blocks:** —
- **Scope:** M
- **Design Doc:** [e2e-playwright-testing](../../design-docs/e2e-playwright-testing.md)

## Description

Write three spec files covering slash command interactions, general editing behavior (typing, deleting, undo/redo workflow), and markdown roundtrip fidelity (load → edit → serialize). Covers P1 "Slash Commands" (5-6 tests), P0 "Editing & Roundtrip" (4-5 tests).

## Acceptance Criteria

- [ ] `test/e2e/specs/slash-commands.spec.ts` exists with 5-6 tests:
  - Typing `/` in an empty paragraph opens the slash menu
  - Filtering the slash menu by typing (e.g., `/heading`) narrows results
  - Selecting "Heading 1" from the menu inserts an `<h1>` block
  - Selecting "Code Block" inserts a `<pre><code>` block
  - Selecting "Bullet List" inserts a `<ul>` block
  - Pressing Escape closes the slash menu without inserting
- [ ] `test/e2e/specs/editing.spec.ts` exists with 4-5 tests:
  - Typing text into an empty editor creates a paragraph
  - Backspace at start of paragraph merges with previous
  - Undo reverts text insertion, redo restores it
  - Pasting plain text inserts it at cursor position
  - Multiple rapid edits produce debounced updates (verify update count is less than edit count)
- [ ] `test/e2e/specs/roundtrip.spec.ts` exists with 4-5 tests:
  - Load markdown → make no edits → serialized output preserves original
  - Load heading + paragraph → add bold → serialized output contains `**`
  - Load list → add new item → serialized output has correct list structure
  - Load complex document → make single edit → only edited portion changes
- [ ] All tests pass via `npm run test:e2e`

## Technical Notes

### Suggested Approach
1. For slash commands: use `editorPage.triggerSlashCommand('heading1')` and check DOM result. Verify the `.slash-menu` selector matches `SlashMenu.tsx` component's actual class name.
2. For editing: use `editorPage.typeInEditor()` and `page.keyboard.press('Backspace')`. Use `waitForUpdate` to verify serialized output.
3. For roundtrip: load markdown via `loadMarkdown`, wait for initial update, compare with input. Then edit and compare delta.

### Files to Create
- `test/e2e/specs/slash-commands.spec.ts`
- `test/e2e/specs/editing.spec.ts`
- `test/e2e/specs/roundtrip.spec.ts`

### Files to Read (for reference)
- `src/webview/commands/slashCommands.ts` — to identify available slash commands and their names
- `src/webview/components/SlashMenu.tsx` — to identify the menu's CSS class/selector

### Key Considerations
- Slash menu CSS class: verify `.slash-menu` is the actual class used in `SlashMenu.tsx`; update page object `triggerSlashCommand` if different
- Roundtrip fidelity tests should compare normalized markdown (trim trailing whitespace, normalize newlines) since the serializer may add/remove blank lines
- The 300ms debounce means `waitForUpdate` is required after every edit before checking output
- Pasting can be simulated with `page.evaluate(() => navigator.clipboard.writeText('text'))` followed by `Mod+V`, but this may require Playwright's clipboard permissions

## Tests Required

### E2E Tests (this IS the test issue)
- [ ] Slash menu opens on `/` keystroke
- [ ] Slash menu filters by search text
- [ ] Heading insertion via slash command
- [ ] Code block insertion via slash command
- [ ] Bullet list insertion via slash command
- [ ] Escape closes slash menu
- [ ] Typing creates paragraph
- [ ] Backspace merges paragraphs
- [ ] Undo/redo workflow
- [ ] Roundtrip preserves unedited markdown
- [ ] Roundtrip reflects edits correctly

## Definition of Done

- [ ] All acceptance criteria met
- [ ] All 13-16 tests pass across 3 spec files
- [ ] Slash command names match actual implementation
- [ ] Roundtrip tests compare normalized markdown
- [ ] No regressions in existing tests
