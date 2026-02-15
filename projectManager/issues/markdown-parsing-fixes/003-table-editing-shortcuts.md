# [003] Add Table Editing Keyboard Shortcuts

## Metadata
- **Status:** TODO
- **Depends On:** —
- **Blocks:** 004
- **Scope:** S
- **Design Doc:** [markdown-parsing-fixes](../../design-docs/markdown-parsing-fixes.md)

## Description

Add 4 keyboard shortcuts for manipulating tables:

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Add row below | `⌘ + ⌥ + ↓` | `Ctrl + Alt + ↓` |
| Add column right | `⌘ + ⌥ + →` | `Ctrl + Alt + →` |
| Delete current row | `⌘ + ⌥ + Backspace` | `Ctrl + Alt + Backspace` |
| Delete current column | `⌘ + ⌥ + Shift + Backspace` | `Ctrl + Alt + Shift + Backspace` |

TipTap's Table extension already provides the commands; we just need to bind them to shortcuts.

## Acceptance Criteria

- [ ] `Mod-Alt-ArrowDown` adds a row below current row
- [ ] `Mod-Alt-ArrowRight` adds a column to the right of current column
- [ ] `Mod-Alt-Backspace` deletes the current row
- [ ] `Mod-Alt-Shift-Backspace` deletes the current column
- [ ] Shortcuts only work when cursor is inside a table
- [ ] Shortcuts do nothing when cursor is outside a table (no error)
- [ ] Cannot delete the last remaining row or column (table must have at least 1x1)

## Technical Notes

### Files to Modify
- `src/webview/extensions/keyboardShortcuts.ts` — Add table shortcuts

### Implementation

```typescript
editor.addKeyboardShortcuts({
  'Mod-Alt-ArrowDown': () => {
    if (!editor.isActive('table')) return false;
    return editor.commands.addRowAfter();
  },
  'Mod-Alt-ArrowRight': () => {
    if (!editor.isActive('table')) return false;
    return editor.commands.addColumnAfter();
  },
  'Mod-Alt-Backspace': () => {
    if (!editor.isActive('table')) return false;
    return editor.commands.deleteRow();
  },
  'Mod-Alt-Shift-Backspace': () => {
    if (!editor.isActive('table')) return false;
    return editor.commands.deleteColumn();
  },
});
```

### Key Considerations
- `Mod` = `Cmd` on Mac, `Ctrl` on Windows/Linux
- Check `editor.isActive('table')` before executing to avoid errors outside tables
- TipTap's table commands handle edge cases (e.g., header rows, merged cells)

## Tests Required

### Unit Tests
- [ ] Add row shortcut calls `addRowAfter` when in table
- [ ] Add column shortcut calls `addColumnAfter` when in table
- [ ] Delete row shortcut calls `deleteRow` when in table
- [ ] Delete column shortcut calls `deleteColumn` when in table
- [ ] Shortcuts return false when not in table

### E2E Tests
- [ ] `e2e/table-shortcuts.spec.ts`: All 4 shortcuts work in table

### Manual Testing
- [ ] Insert table via `/table`
- [ ] Press `⌘⌥↓` — new row appears below
- [ ] Press `⌘⌥→` — new column appears to right
- [ ] Press `⌘⌥⌫` — current row deleted
- [ ] Press `⌘⌥⇧⌫` — current column deleted
- [ ] Try shortcuts outside table — nothing happens

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
