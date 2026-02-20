# [001] Fix Strikethrough Test Key

## Metadata
- **Status:** DONE
- **Depends On:** None
- **Blocks:** None
- **Scope:** XS
- **Design Doc:** [keyboard-shortcut-fixes](../../design-docs/keyboard-shortcut-fixes.md)

## Description

The e2e test for strikethrough keyboard shortcut is failing because the test helper sends the wrong key. The test sends `Mod+Shift+x` but the actual shortcut defined in `keyboardShortcuts.ts` is `Mod+Shift+s`.

This is a **test bug, not a code bug**. The keyboard shortcut implementation is correct.

## Acceptance Criteria

- [x] Test helper `toggleStrikethrough()` sends `Mod+Shift+s` instead of `Mod+Shift+x`
- [x] Strikethrough e2e test passes
- [x] No regressions in other keyboard shortcut tests

## Human Review Focus

- **Look at:** The one-line change in `editor.page.ts`
- **Test:** Run the strikethrough e2e test to confirm it passes
- **Decide:** None - this is a straightforward fix

## Agent Autonomy Notes

- **Agent can decide:** Nothing - this is a simple character change
- **Escalate to human:** If other tests unexpectedly fail after the change

## Technical Notes

### Suggested Approach
1. Open `test/e2e/pages/editor.page.ts`
2. Find line 134 (the `toggleStrikethrough` method)
3. Change `x` to `s` in the keyboard press command

### Files to Modify
- `test/e2e/pages/editor.page.ts` - Change line 134 from `x` to `s`

### Key Considerations
- The shortcut is `Mod-Shift-s` where `Mod` = Command on Mac, Ctrl on Windows/Linux
- Other test helpers (toggleBold, toggleItalic) use correct keys for reference

## Tests Required

### Unit Tests
- N/A - this is a test file fix

### Integration Tests
- N/A - this is a test file fix

### E2E Tests
- [ ] Existing strikethrough test should pass after fix
- [ ] Verify `Mod+Shift+S toggles strikethrough on selected text` passes

### Manual Testing (if applicable)
- [ ] Open editor, select text, press Cmd+Shift+S (Mac) - verify strikethrough applied

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Strikethrough e2e test passes
- [ ] Human review completed (see Human Review Focus above)
- [ ] No regressions in existing keyboard shortcut tests
