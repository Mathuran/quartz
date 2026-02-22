# [002] Multi-Item List Movement

## Metadata
- **Status:** DONE
- **Depends On:** 001
- **Blocks:** 003
- **Scope:** S
- **Design Doc:** [option-arrow-movement-v2](../../design-docs/option-arrow-movement-v2.md)

## Description

Extend the list item movement from issue 001 to handle multi-item selection. When a selection spans multiple contiguous list items in the same parent list, Option+Arrow should move all selected items as a group. Boundary escalation applies to the group: if the first selected item is at the top, escalate to block mode.

## Acceptance Criteria

- [ ] Selection spanning 2+ contiguous items in same list moves them as a group
- [ ] Multi-item boundary: first items + ArrowUp → escalates to block mode
- [ ] Multi-item boundary: last items + ArrowDown → escalates to block mode
- [ ] Selecting all items in a list → escalates both directions
- [ ] Selection is preserved across the moved items after the move
- [ ] Unit tests pass for all multi-item cases

## Human Review Focus

- **Look at:** The multi-item range calculation in `moveListItemsUp/Down`
- **Test:** Create a 5-item list, select items 2-3, move up and down. Verify boundary escalation with items 1-2 selected moving up.
- **Decide:** Does the selection feel right after the move?

## Agent Autonomy Notes

- **Agent can decide:** How to calculate the contiguous range, selection restoration strategy
- **Escalate to human:** If selection restoration is unreliable, flag for review

## Technical Notes

### Suggested Approach
1. The `moveListItemsUp/Down` functions from 001 already accept `fromInfo` and `toInfo` — extend them to handle `fromInfo.index !== toInfo.index`
2. Calculate the contiguous range `[firstIndex..lastIndex]` and swap the entire slice with the adjacent sibling
3. Restore selection to cover the moved items in their new positions

### Files to Modify
- `src/webview/extensions/keyboardShortcuts.ts` — extend existing functions

## Tests Required

### Unit Tests (extend `test/unit/list-item-movement.test.ts`)
- [ ] Move 2 contiguous items up — verify group reorders
- [ ] Move 2 contiguous items down — verify group reorders
- [ ] Move 3 items (middle of 5-item list) up — verify correct swap
- [ ] Multi-select boundary: first 2 items up → escalates to block move
- [ ] Multi-select boundary: last 2 items down → escalates to block move
- [ ] Select all items → escalates both directions

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Human review completed
- [ ] No regressions in single-item movement
