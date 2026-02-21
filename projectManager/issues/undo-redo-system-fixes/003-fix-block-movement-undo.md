# [003] Fix Block Movement Undo

## Metadata
- **Status:** DONE
- **Depends On:** 001-diagnose-undo-transactions
- **Blocks:** 004-configure-history-extension
- **Scope:** M
- **Design Doc:** [undo-redo-system-fixes](../../design-docs/undo-redo-system-fixes.md)

## Description

When a user moves a block with Alt+Arrow, pressing Cmd+Z does not restore the original order. The `moveBlockUp`/`moveBlockDown` functions need to create single atomic transactions that the history can undo.

## Acceptance Criteria

- [ ] Move block down with Alt+Down, press Cmd+Z - block returns to original position
- [ ] Move block up with Alt+Up, press Cmd+Z - block returns to original position
- [ ] Multiple consecutive moves can be undone one at a time
- [ ] Redo (Cmd+Shift+Z) restores the moved position

## Human Review Focus

- **Look at:** Transaction structure in moveBlockUp/moveBlockDown
- **Test:** Move a paragraph down, undo - verify it returns to original position
- **Decide:** Is the undo behavior predictable?

## Agent Autonomy Notes

- **Agent can decide:** Transaction implementation details
- **Escalate to human:** If fix requires significant refactoring

## Technical Notes

### Suggested Approach
Wrap block movement in TipTap's command API:

```typescript
function moveBlockDown(editor: Editor): boolean {
  return editor.chain()
    .command(({ tr, dispatch, state }) => {
      // All operations in a single command
      // Delete, rearrange, insert operations...
      if (dispatch) dispatch(tr.scrollIntoView());
      return true;
    })
    .run();
}
```

This ensures all operations are part of one transaction that history tracks.

### Files to Modify
- `src/webview/extensions/keyboardShortcuts.ts` - Refactor moveBlockUp/moveBlockDown

### Key Considerations
- Selection state should also be restored on undo
- The current implementation manually manipulates `tr` - may need to verify it's dispatched once
- Test with different block types (paragraphs, headings, lists)

## Tests Required

### Unit Tests
- N/A - best tested via e2e

### E2E Tests
- [ ] Move block down, undo - restored
- [ ] Move block up, undo - restored
- [ ] Multiple moves, multiple undos - each reverts one move
- [ ] Redo after undo - block moves again

### Manual Testing
- [ ] Move paragraph down, press Cmd+Z, verify original order
- [ ] Move heading up, press Cmd+Z, verify original order

## Definition of Done

- [ ] All acceptance criteria met
- [ ] E2E tests written and passing
- [ ] Human review completed
- [ ] No regressions in block movement functionality
