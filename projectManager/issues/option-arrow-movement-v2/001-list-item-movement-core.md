# [001] Single List Item Movement + Boundary Escalation

## Metadata
- **Status:** TODO
- **Depends On:** -
- **Blocks:** 002, 003
- **Scope:** M
- **Design Doc:** [option-arrow-movement-v2](../../design-docs/option-arrow-movement-v2.md)

## Description

Implement the core list-item movement logic in `keyboardShortcuts.ts`. When the cursor is inside a list item, Option+Arrow Up/Down should move that individual list item within its parent list instead of moving the entire list block. When the item is at the list boundary (first item up, last item down), escalate to block-level movement — move the entire list.

This covers single-item movement for bullet lists, ordered lists, and task lists. Multi-item selection is handled in issue 002.

## Acceptance Criteria

- [ ] `findListItemAround($pos)` correctly identifies the list item context (works for `listItem` and `taskItem`)
- [ ] `getMovementContext(selection)` returns `'list'` mode when cursor is in a list, `'block'` mode otherwise
- [ ] Single list item moves up/down within its parent list
- [ ] Cursor position is preserved within the moved item
- [ ] Boundary escalation: first item + ArrowUp → moves entire list block up
- [ ] Boundary escalation: last item + ArrowDown → moves entire list block down
- [ ] Single-item list escalates to block mode both directions
- [ ] Items with nested sub-lists move as a unit
- [ ] Items with multiple paragraphs move as a unit
- [ ] Task items preserve check state after move
- [ ] Existing block-level movement for non-list contexts is unchanged
- [ ] Selection spanning list boundary falls back to block mode
- [ ] Unit tests pass for all single-item cases

## Human Review Focus

- **Look at:** The `findListItemAround`, `getMovementContext`, and `moveListItemsUp/Down` functions in `keyboardShortcuts.ts`
- **Test:** Open VS Code, create a 5-item bullet list, move items up and down with Option+Arrow. Verify ordered lists and task lists too.
- **Decide:** Does the boundary escalation feel natural? Is there a need for a visual cue?

## Agent Autonomy Notes

- **Agent can decide:** Internal function structure, variable names, how to calculate positions and slices
- **Escalate to human:** If the ProseMirror transaction approach doesn't work reliably, flag before trying alternatives

## Technical Notes

### Suggested Approach
1. Add `findListItemAround($pos)` helper — walk depth from `$pos.depth` down to 1, return first `listItem`/`taskItem` found
2. Add `getMovementContext(selection)` — call `findListItemAround` on both `$from` and `$to`, check if same parent list
3. Implement `moveListItemsUp(editor, fromInfo, toInfo)` — swap current item with previous sibling using ProseMirror transactions. At boundary (index 0), call existing `moveBlockUp(editor)`.
4. Implement `moveListItemsDown(editor, fromInfo, toInfo)` — mirror logic
5. Update the `Alt-ArrowUp` and `Alt-ArrowDown` keybindings to use `getMovementContext` dispatch

### Files to Modify
- `src/webview/extensions/keyboardShortcuts.ts` — main implementation

### Key Considerations
- Use `state.tr` for transactions, not `editor.chain()` — need fine-grained control over node swapping
- `TextSelection.near($pos)` for cursor restoration after move
- The existing `moveBlockUp`/`moveBlockDown` functions should remain unchanged — reuse them for escalation

## Tests Required

### Unit Tests (`test/unit/list-item-movement.test.ts`)
- [ ] Move bullet list item up — verify order changes
- [ ] Move bullet list item down — verify order changes
- [ ] Move ordered list item — verify content reorders
- [ ] Move task item — verify check state preserved
- [ ] Move item with nested sub-list — verify sub-list moves with it
- [ ] Move item with multiple paragraphs — verify all content moves
- [ ] Boundary: first item up → escalates to block move
- [ ] Boundary: last item down → escalates to block move
- [ ] Single-item list → escalates both directions
- [ ] Cursor in paragraph → uses block move (unchanged)
- [ ] Selection spans list + paragraph → uses block move
- [ ] Selection spans items from different lists → uses block move

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Human review completed
- [ ] No regressions in existing block movement
