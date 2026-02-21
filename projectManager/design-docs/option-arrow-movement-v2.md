# Option+Arrow Movement v2 Design Document

**Author:** Claude
**Status:** APPROVED
**Created:** 2026-02-21
**Last Updated:** 2026-02-21
**Reviewers:** Mathuran
**Supersedes:** [option-arrow-list-movement.md](./option-arrow-list-movement.md)

---

## 1. Problem Statement

Option+Arrow Up/Down is the primary keyboard shortcut for reordering content in block editors. Quartz's current implementation has two problems:

1. **List items cannot be reordered.** When the cursor is inside a list item, Option+Arrow moves the entire list block instead of the individual item. This is the most common complaint — users expect to reorder list items the same way they reorder lines in VS Code's native editor.

2. **Multi-select movement is inconsistent.** When a selection spans multiple list items within the same list, the entire list still moves as a block. There's no way to select several list items and move them as a group within the list.

Both problems stem from the same root cause: `findTopLevelBlock` always resolves to depth 1 (document direct children), treating lists as atomic blocks regardless of where the cursor or selection is.

---

## 2. Goals and Non-Goals

### Goals

- **P0:** Single list item movement — Option+Arrow moves the current `listItem`/`taskItem` within its parent list for bullet, ordered, and task lists
- **P0:** Cursor position is preserved within the moved item
- **P0:** Boundary escalation — when a list item (or multi-select group) is at the list boundary, Option+Arrow moves the **entire list block** instead, giving users a natural way to "break through" to block-level movement
- **P1:** Multi-item list movement — when selection spans multiple contiguous list items in the same list, move them as a group
- **P1:** Undo/redo correctly reverses moves as a single atomic operation
- **P1:** List items with nested content (sub-lists, multiple paragraphs) move as a unit
- **P2:** Existing top-level block movement continues to work unchanged for non-list contexts

### Non-Goals

- Moving list items across different lists
- Moving list items across nesting levels (that's Tab/Shift+Tab)
- Non-contiguous multi-select (e.g., items 1 and 3 but not 2)
- Drag-and-drop reordering
- General multi-block selection/movement outside of lists (separate feature)

---

## 3. Background and Context

### Current Implementation

`src/webview/extensions/keyboardShortcuts.ts` defines the handlers:

```typescript
'Alt-ArrowUp': () => moveBlockUp(this.editor),
'Alt-ArrowDown': () => moveBlockDown(this.editor),
```

Both use `findTopLevelBlock($pos)` which resolves to depth 1:

```typescript
function findTopLevelBlock($pos: ResolvedPos): { pos: number; node: ProseMirrorNode } | null {
  if ($pos.depth < 1) return null;
  const pos = $pos.before(1);
  const node = $pos.node(1);
  return { pos, node };
}
```

### Current Behavior Matrix

| Context | Selection | Option+Arrow behavior today |
|---------|-----------|----------------------------|
| Cursor in paragraph | Single cursor | Moves paragraph (correct) |
| Cursor in heading | Single cursor | Moves heading (correct) |
| Cursor in list item | Single cursor | Moves **entire list** (BUG) |
| Cursor in code block | Single cursor | Moves code block (correct) |
| Cursor in table | Single cursor | Moves entire table (correct) |
| Cursor in blockquote | Single cursor | Moves blockquote (correct) |
| Selection spans 2 paragraphs | Multi-block | Moves both as group (correct) |
| Selection spans 2 list items (same list) | Within-list | Moves **entire list** (BUG) |
| Selection spans heading + paragraph | Multi-block | Moves both as group (correct) |
| Selection spans list + paragraph | Cross-boundary | Moves both as group (correct — but list is atomic) |

### Target Behavior Matrix (v2)

| Context | Selection | Option+Arrow behavior (v2) |
|---------|-----------|---------------------------|
| Cursor in paragraph | Single cursor | Moves paragraph (unchanged) |
| Cursor in heading | Single cursor | Moves heading (unchanged) |
| Cursor in list item | Single cursor | **Moves that list item within the list** |
| Cursor in list item at boundary | Single cursor | **Escalates to block mode — moves entire list** |
| Cursor in code block | Single cursor | Moves code block (unchanged) |
| Cursor in table | Single cursor | Moves table (unchanged) |
| Cursor in blockquote | Single cursor | Moves blockquote (unchanged) |
| Selection spans 2+ list items (same list) | Within-list | **Moves selected items as group within list** |
| Selection spans 2+ list items at boundary | Within-list | **Escalates to block mode — moves entire list** |
| Selection spans 2 paragraphs | Multi-block | Moves both as group (unchanged) |
| Selection spans into/out of a list | Cross-boundary | Moves spanned top-level blocks as group (unchanged — list treated as one block) |

### Decision Rule

The handler uses this logic to decide which mode to use:

1. Find the list item (if any) around `$from` and `$to`
2. **If both are in list items of the same parent list** → list-item movement mode
3. **Otherwise** → top-level block movement mode (existing behavior)

This means:
- Selection entirely within one list → moves items within the list
- Selection crossing a list boundary (starts in list, ends outside) → falls back to block mode, treats list as atomic
- Selection not in a list at all → block mode as before

### ProseMirror Document Structure

```
doc (depth 0)
  heading (depth 1)
  bulletList (depth 1)          ← top-level block
    listItem (depth 2)          ← item A
      paragraph (depth 3)
    listItem (depth 2)          ← item B
      paragraph (depth 3)
      bulletList (depth 3)      ← nested sub-list
        listItem (depth 4)
    listItem (depth 2)          ← item C
      paragraph (depth 3)
  paragraph (depth 1)
```

### Related Files

| File | Role |
|------|------|
| `src/webview/extensions/keyboardShortcuts.ts` | Keyboard shortcut definitions and block move logic |
| `src/webview/Editor.tsx` | Editor configuration with all extensions |
| `src/webview/Editor.tsx` | Editor configuration with all extensions |

---

## 4. Proposed Solution

### 4.1 Overview

Rewrite the `Alt-ArrowUp`/`Alt-ArrowDown` handlers in `keyboardShortcuts.ts` with a three-tier dispatch:

```
Alt+Arrow pressed
  → Are $from and $to both in list items of the SAME parent list?
    YES → list item movement (single or multi)
    NO  → top-level block movement (existing behavior, unchanged)
```

### 4.2 Helper: Find List Item Context

```typescript
interface ListItemInfo {
  depth: number;
  node: ProseMirrorNode;
  pos: number;           // position before the listItem node
  index: number;         // index among siblings in parent list
  parent: ProseMirrorNode; // the parent list node (bulletList/orderedList/taskList)
  parentPos: number;     // position before the parent list node
}

function findListItemAround($pos: ResolvedPos): ListItemInfo | null {
  for (let depth = $pos.depth; depth >= 1; depth--) {
    const node = $pos.node(depth);
    if (node.type.name === 'listItem' || node.type.name === 'taskItem') {
      return {
        depth,
        node,
        pos: $pos.before(depth),
        index: $pos.index(depth - 1),
        parent: $pos.node(depth - 1),
        parentPos: $pos.before(depth - 1),
      };
    }
  }
  return null;
}
```

### 4.3 Determining Movement Mode

```typescript
function getMovementContext(selection: Selection):
  | { mode: 'list'; fromInfo: ListItemInfo; toInfo: ListItemInfo }
  | { mode: 'block' }
{
  const fromInfo = findListItemAround(selection.$from);
  const toInfo = findListItemAround(selection.$to);

  // Both endpoints in list items of the SAME parent list
  if (fromInfo && toInfo && fromInfo.parentPos === toInfo.parentPos) {
    return { mode: 'list', fromInfo, toInfo };
  }

  return { mode: 'block' };
}
```

### 4.4 Single List Item Movement

When `fromInfo.index === toInfo.index` (cursor is in one item, or selection is within one item):

**Move up:** Swap current item with previous sibling.
**Move down:** Swap current item with next sibling.

```typescript
function moveListItemsUp(editor: Editor, fromInfo: ListItemInfo, toInfo: ListItemInfo): boolean {
  const { state, dispatch } = editor.view;
  const { doc } = state;
  const { $from } = state.selection;

  const firstIndex = fromInfo.index;
  const lastIndex = toInfo.index;

  // At top boundary — escalate to block-level movement (move entire list)
  if (firstIndex === 0) {
    return moveBlockUp(editor);
  }

  // Calculate positions for the contiguous range [firstIndex..lastIndex]
  const parent = fromInfo.parent;
  const rangeStart = fromInfo.pos;

  // End of the last selected item
  let rangeEnd = fromInfo.pos;
  for (let i = firstIndex; i <= lastIndex; i++) {
    rangeEnd += parent.child(i).nodeSize;
  }

  // The item above the range
  const prevItem = parent.child(firstIndex - 1);
  const prevItemPos = rangeStart - prevItem.nodeSize;

  // Transaction: delete range, delete prev, insert range before prev, insert prev after
  const tr = state.tr;
  const rangeSlice = doc.slice(rangeStart, rangeEnd);
  const prevSlice = doc.slice(prevItemPos, rangeStart);

  tr.delete(rangeStart, rangeEnd);
  tr.delete(prevItemPos, prevItemPos + prevItem.nodeSize);
  tr.insert(prevItemPos, rangeSlice.content);
  tr.insert(prevItemPos + rangeSlice.size, prevSlice.content);

  // Restore cursor/selection
  const cursorOffset = $from.pos - rangeStart;
  const newCursorPos = prevItemPos + cursorOffset;

  try {
    const $newPos = tr.doc.resolve(
      Math.min(Math.max(newCursorPos, 0), tr.doc.content.size - 1)
    );
    tr.setSelection(TextSelection.near($newPos));
  } catch {
    // Fallback
  }

  dispatch(tr.scrollIntoView());
  return true;
}
```

`moveListItemsDown` follows the mirror pattern — swap the range with the next sibling below `lastIndex`.

### 4.5 Multi-Item List Movement

The same `moveListItemsUp`/`moveListItemsDown` functions handle multi-select naturally:

- `fromInfo.index` = first selected item's index
- `toInfo.index` = last selected item's index
- The contiguous range `[firstIndex..lastIndex]` is moved as a group
- All items between `$from` and `$to` are included (contiguous only)

Example — 5-item list, items 2-3 selected, move up:
```
Before:  [A] [B] [C*] [D*] [E]    (* = selected)
After:   [A] [C*] [D*] [B] [E]    (items C,D swapped above B)
```

### 4.6 Boundary Escalation

When list item movement reaches a boundary (first item up, last item down), instead of doing nothing, the handler **escalates to block-level movement** — moving the entire list as a top-level block. This gives users a natural "break through" behavior:

1. Option+Up inside a list → moves the item up within the list
2. Keep pressing Option+Up → item reaches the top of the list
3. One more Option+Up → the entire list moves up past the block above it

This is intuitive because the user's intent is "move this content up" — once the item can't move within the list, the list itself should move.

### 4.7 Updated Keyboard Shortcut Bindings

```typescript
'Alt-ArrowUp': () => {
  const ctx = getMovementContext(this.editor.state.selection);
  if (ctx.mode === 'list') {
    return moveListItemsUp(this.editor, ctx.fromInfo, ctx.toInfo);
  }
  return moveBlockUp(this.editor);
},
'Alt-ArrowDown': () => {
  const ctx = getMovementContext(this.editor.state.selection);
  if (ctx.mode === 'list') {
    return moveListItemsDown(this.editor, ctx.fromInfo, ctx.toInfo);
  }
  return moveBlockDown(this.editor);
},
```

### 4.8 Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| Single cursor in list item | Moves that one item (fromIndex === toIndex) |
| Selection spans 2-3 items in same list | Moves all as a contiguous group |
| Selection spans ALL items in list | No-op + flash (can't move up or down) |
| First item(s) + ArrowUp | Escalates to block mode — moves entire list up |
| Last item(s) + ArrowDown | Escalates to block mode — moves entire list down |
| Nested list item (sub-list) | Moves within its immediate parent list |
| Task item in task list | `taskItem` handled identically to `listItem` |
| List item with multiple paragraphs | Entire listItem node moves as unit |
| List item with nested sub-list | Entire listItem node (including sub-list) moves as unit |
| Single-item list | Escalates to block mode — moves entire list |
| Cursor in list inside blockquote | `findListItemAround` walks up, finds listItem regardless of wrapper |
| Selection starts in list, ends outside | Falls back to block mode (whole list treated as one block) |
| Selection spans items from different lists | Falls back to block mode (parentPos won't match) |
| Cursor not in any list | Falls back to block mode (unchanged behavior) |

---

## 5. Alternative Solutions Considered

### Alternative 1: Use ProseMirror `liftListItem` / `sinkListItem`

These change nesting level, not sibling order. Wrong tool for the job.

### Alternative 2: TipTap `joinUp` / `joinDown`

These merge nodes together, destroying structure. Wrong semantics.

### Alternative 3: Disable Option+Arrow in Lists

Removes functionality users expect. Rejected.

### Alternative 4: Move Items Out of List at Boundaries

When pressing Up on the first item, extract it as a paragraph above the list. Deferred as a future enhancement — too complex for v2, risk of data loss (task state, list markers). The visual flash communicates the boundary clearly.

### Alternative 5: Non-contiguous Multi-Select

Allow selecting items 1 and 3 (skipping 2) and moving them together. No editor supports this. Unnecessary complexity. Rejected.

---

## 6. Security, Privacy, and Compliance

- No security implications — keyboard shortcut handling operates entirely within the editor document model
- No user data collected, transmitted, or logged
- No compliance implications

---

## 7. Testing Strategy

### Unit Tests (`test/unit/list-item-movement.test.ts`)

**Single item movement:**
1. Move bullet list item up — verify order changes
2. Move bullet list item down — verify order changes
3. Move ordered list item — verify content reorders
4. Move task item — verify check state preserved
5. Move item with nested sub-list — verify sub-list moves with it
6. Move item with multiple paragraphs — verify all content moves
7. Boundary: first item up → escalates to block move (entire list moves up)
8. Boundary: last item down → escalates to block move (entire list moves down)
9. Single-item list → escalates to block move both directions

**Multi-item movement:**
10. Move 2 contiguous items up — verify group reorders
11. Move 2 contiguous items down — verify group reorders
12. Move 3 items (middle of 5-item list) up — verify correct swap
13. Multi-select boundary: first 2 items up → escalates to block move
14. Multi-select boundary: last 2 items down → escalates to block move
15. Select all items → escalates to block move both directions

**Fallback to block mode:**
16. Cursor in paragraph → uses block move (unchanged)
17. Selection spans list + paragraph → uses block move (list treated as atomic)
18. Selection spans items from different lists → uses block move

### E2E Tests (`test/e2e/specs/list-item-movement.spec.ts`)

1. Move single bullet list item up and down
2. Move single task list item — verify check state preserved
3. Move 2 selected items as a group
4. Boundary escalation — first item up moves entire list as block
5. Paragraph block movement still works
6. Undo reverses a list item move
7. Round-trip fidelity after move

### Manual Testing Checklist

1. 5-item bullet list: move 3rd item to top with repeated Option+Up
2. Task list: reorder checked/unchecked items, verify states persist
3. Ordered list: reorder items, verify numbering updates
4. Nested sub-list: move parent item, verify sub-list follows
5. Select 2 items, move as group up and down
6. Hit boundaries — verify entire list moves as block
7. Select across list boundary (into paragraph) — verify block mode
8. Undo/redo after moves

---

## 8. Rollout Plan

### Phase 1: Single Item Movement + Visual Feedback (~1 session)
- `findListItemAround`, `getMovementContext`, `moveListItemsUp/Down` for single items
- Boundary flash CSS animation
- Unit tests for single item cases
- **Gate:** Manual test of bullet, ordered, and task list single-item moves

### Phase 2: Multi-Item Movement (~1 session)
- Extend `moveListItemsUp/Down` to handle `fromIndex !== toIndex`
- Unit tests for multi-item cases
- **Gate:** Manual test of multi-select within lists

### Phase 3: E2E Tests + Polish (~1 session)
- E2E test spec file
- Edge case fixes found during testing
- **Gate:** All tests pass, manual smoke test

### Rollback Plan

Revert changes to `keyboardShortcuts.ts` and `editor.css`. Risk is very low — change is isolated to one extension file plus one CSS animation.

---

## 9. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Cursor position wrong after multi-item move | Medium | Medium | Use `TextSelection.near` fallback; test thoroughly |
| Transaction corrupts document structure | High | Low | ProseMirror validates transactions; invalid ones rejected |
| Block-level move at boundary feels unexpected | Low | Low | Behavior is intuitive — "keep pushing up" naturally escalates; can add visual cue later if needed |
| Selection spans items at different nesting depths | Medium | Low | `parentPos` comparison ensures same parent; mismatches fall to block mode |
| VS Code intercepts Alt+Arrow | High | Very Low | Already working for block moves today |

---

## 10. Open Questions

*All resolved during review.*

1. **Boundary behavior:** Escalate to block-level movement — move the entire list. *(Resolved)*
2. **Multi-select:** Contiguous items within same list move as group. *(Resolved)*
3. **Cross-boundary selection:** Falls back to block mode, list treated as atomic. *(Resolved)*
4. **Nested list movement:** Moves within immediate parent only. Tab/Shift+Tab for nesting. *(Resolved)*

---

## 11. Implementation Issues

| # | Title | Status | Scope |
|---|-------|--------|-------|
| [001](../issues/option-arrow-movement-v2/001-list-item-movement-core.md) | Single List Item Movement + Boundary Escalation | TODO | M |
| [002](../issues/option-arrow-movement-v2/002-multi-item-movement.md) | Multi-Item List Movement | TODO | S |
| [003](../issues/option-arrow-movement-v2/003-e2e-tests-and-polish.md) | E2E Tests and Polish | TODO | S |

**Progress:** 0/3 issues complete (0%)
