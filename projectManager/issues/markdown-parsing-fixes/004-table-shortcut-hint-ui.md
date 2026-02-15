# [004] Add Table Shortcut Hint UI

## Metadata
- **Status:** DONE
- **Depends On:** 003
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [markdown-parsing-fixes](../../design-docs/markdown-parsing-fixes.md)

## Description

When the cursor is inside a table cell, show a subtle floating hint bar below the table displaying the keyboard shortcuts:

```
⌘⌥↓ Add row  ·  ⌘⌥→ Add column  ·  ⌘⌥⌫ Delete row
```

This helps users discover the table editing shortcuts without needing to reference documentation.

## Acceptance Criteria

- [ ] Hint bar appears 500ms after cursor enters a table (debounced)
- [ ] Hint bar positioned below the table, left-aligned with table
- [ ] Hint bar displays correct shortcuts for current OS (Mac vs Windows)
- [ ] Hint bar disappears when cursor leaves the table
- [ ] Hint bar has subtle styling: semi-transparent (opacity 0.6), small font (11px)
- [ ] Hint bar doesn't interfere with typing or table interactions
- [ ] Setting `quartz.showTableHints: false` disables the hint

## Technical Notes

### Files to Create
- `src/webview/components/TableHint.tsx` — React component for hint bar

### Files to Modify
- `src/webview/Editor.tsx` — Track table focus state, render TableHint
- `src/webview/styles/editor.css` — Styling for hint bar

### Suggested Approach

1. Create a React component that renders the hint bar
2. Use TipTap's `onSelectionUpdate` to detect when cursor enters/leaves table
3. Use `setTimeout`/`clearTimeout` for 500ms debounce
4. Position hint below the table using the table's bounding rect
5. Detect OS for correct shortcut symbols (`⌘` vs `Ctrl`)

```typescript
// Detect OS
const isMac = navigator.platform.includes('Mac');
const modKey = isMac ? '⌘' : 'Ctrl';
const altKey = isMac ? '⌥' : 'Alt';
```

### Styling

```css
.quartz-table-hint {
  position: absolute;
  font-size: 11px;
  color: var(--quartz-fg);
  opacity: 0.6;
  padding: 4px 8px;
  background: var(--quartz-bg);
  border-radius: 4px;
  pointer-events: none;
  white-space: nowrap;
}
```

### Key Considerations
- Use `pointer-events: none` so hint doesn't capture clicks
- Clear timeout on unmount to prevent memory leaks
- Consider accessibility: hint is decorative, not essential info

## Tests Required

### Unit Tests
- [ ] Hint component renders correct shortcuts for Mac
- [ ] Hint component renders correct shortcuts for Windows
- [ ] Hint appears after 500ms delay
- [ ] Hint disappears immediately when leaving table

### E2E Tests
- [ ] Click into table, wait 500ms, verify hint visible
- [ ] Click outside table, verify hint disappears

### Manual Testing
- [ ] Insert table, click into cell, wait — hint appears
- [ ] Move cursor outside table — hint disappears
- [ ] Hint shows correct symbols for your OS

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
