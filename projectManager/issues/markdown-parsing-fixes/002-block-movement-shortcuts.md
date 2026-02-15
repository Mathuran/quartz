# [002] Add Block Movement Keyboard Shortcuts

## Metadata
- **Status:** DONE
- **Depends On:** 001
- **Blocks:** 015
- **Scope:** M
- **Design Doc:** [markdown-parsing-fixes](../../design-docs/markdown-parsing-fixes.md)

## Description

Add VS Code-style keyboard shortcuts to move blocks up and down:
- `Option + ↑` (Mac) / `Alt + ↑` (Windows): Move current block up
- `Option + ↓` (Mac) / `Alt + ↓` (Windows): Move current block down

This replaces the removed drag handle with a keyboard-driven approach that matches VS Code muscle memory.

## Acceptance Criteria

- [ ] `Alt-ArrowUp` moves the current block above its previous sibling
- [ ] `Alt-ArrowDown` moves the current block below its next sibling
- [ ] Works for all block types: paragraphs, headings, lists, code blocks, blockquotes, tables
- [ ] When at top of document, `Alt-ArrowUp` does nothing (no error)
- [ ] When at bottom of document, `Alt-ArrowDown` does nothing (no error)
- [ ] Multi-block selection moves all selected blocks together
- [ ] Cursor position preserved after move

## Technical Notes

### Files to Modify
- `src/webview/extensions/keyboardShortcuts.ts` — Add move commands

### Suggested Approach

TipTap doesn't have built-in `moveNodeUp`/`moveNodeDown` commands. Implement using ProseMirror transactions:

```typescript
import { Extension } from '@tiptap/core';

// Custom command to move current node up
const moveNodeUp = ({ state, dispatch }) => {
  const { selection, doc } = state;
  const { $from } = selection;

  // Find the current top-level block
  const blockPos = $from.before($from.depth);
  const block = doc.nodeAt(blockPos);

  if (!block) return false;

  // Find previous sibling
  const $blockPos = doc.resolve(blockPos);
  if ($blockPos.index($blockPos.depth - 1) === 0) {
    return false; // Already at top
  }

  const prevBlockPos = $blockPos.before($blockPos.depth - 1);
  // ... swap positions via transaction

  return true;
};
```

Alternative approach: Use `@tiptap/extension-dropcursor` patterns or look at how Notion implements this.

### Key Considerations
- Preserve selection/cursor after move
- Handle nested structures (e.g., list items within lists)
- Ensure undo/redo works correctly after move
- Consider using `joinUp`/`joinDown` ProseMirror commands as reference

## Tests Required

### Unit Tests
- [ ] Move paragraph up swaps with previous paragraph
- [ ] Move paragraph down swaps with next paragraph
- [ ] Move at top of document returns false (no-op)
- [ ] Move at bottom of document returns false (no-op)
- [ ] Move heading preserves heading level
- [ ] Move list item moves entire list item (not just content)
- [ ] Move with selection spanning multiple blocks moves all

### E2E Tests
- [ ] `e2e/block-move.spec.ts`: Alt+Arrow moves blocks correctly

### Manual Testing
- [ ] Create 3 paragraphs, place cursor in middle one, press `⌥↑` — moves up
- [ ] Press `⌥↓` twice — moves back down and then below third
- [ ] Try with heading, list, code block — all work
- [ ] Cmd+Z after move — undoes the move

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
