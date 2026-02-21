# Option+Arrow List Item Movement Design Document

**Author:** Claude
**Status:** SUPERSEDED
**Superseded by:** [option-arrow-movement-v2.md](./option-arrow-movement-v2.md)
**Created:** 2026-02-21
**Last Updated:** 2026-02-21 (Review Round 1)
**Reviewers:** Mathuran

---

## 1. Problem Statement

When a user places their cursor on a list item and presses Option+ArrowUp or Option+ArrowDown (Alt+Arrow on Windows/Linux), the entire list block moves as a unit rather than the individual list item moving within the list. This is a fundamental editing operation that users rely on constantly to reorder content. The expected behavior -- matching VS Code's native text editor, Notion, and other block editors -- is that Option+Arrow should move just the current list item up or down among its siblings. Because Quartz targets users who are accustomed to these editors, this broken behavior is a P0 issue that significantly disrupts the editing workflow for all list types (bullet, ordered, and task lists).

---

## 2. Goals and Non-Goals

### Goals

- **P0:** Option+ArrowUp/Down moves the current list item up/down within its sibling list items for bullet lists, ordered lists, and task lists
- **P0:** Cursor position is preserved within the moved list item after the move
- **P0:** The operation is a no-op when the item is already at the top (for ArrowUp) or bottom (for ArrowDown) of its sibling group
- **P1:** Undo/redo correctly reverses and re-applies list item moves as a single atomic operation
- **P1:** The behavior works correctly for list items that contain multiple paragraphs or nested content (e.g., a list item with a sub-list)
- **P1:** When multiple list items are selected, Option+Arrow moves the entire selection as a group within the list
- **P1:** A subtle visual cue (brief highlight/flash) on the list item when movement is blocked at a boundary (first item up, last item down)
- **P2:** Option+Arrow continues to work as a top-level block move when the cursor is outside of a list context (preserving existing behavior)

### Non-Goals

- Moving list items across different lists (e.g., from one bullet list to a separate bullet list)
- Moving list items across nesting levels (e.g., promoting/demoting indentation -- that is Tab/Shift+Tab)
- Drag-and-drop reordering of list items
- Option+Arrow behavior in non-list contexts (paragraphs, headings, code blocks, tables, etc.) -- the existing top-level block movement should remain unchanged
- General multi-block selection and movement (selecting and moving multiple top-level blocks like paragraphs + headings together) -- this is a separate, larger feature

---

## 3. Background and Context

### Current Implementation

Keyboard shortcuts are defined in `src/webview/extensions/keyboardShortcuts.ts`. The current Option+Arrow handlers call `moveBlockUp` and `moveBlockDown`, which operate on **top-level blocks** exclusively:

```typescript
'Alt-ArrowUp': () => moveBlockUp(this.editor),
'Alt-ArrowDown': () => moveBlockDown(this.editor),
```

The `moveBlockUp` and `moveBlockDown` functions use `findTopLevelBlock`, which resolves the position at depth 1 (the document's direct children). For a list, this means the entire `bulletList`, `orderedList`, or `taskList` node is treated as the moveable unit. The individual `listItem` or `taskItem` nodes nested inside are never considered.

### ProseMirror Document Structure for Lists

In ProseMirror/TipTap, a bullet list with three items has this node hierarchy:

```
doc (depth 0)
  bulletList (depth 1)        <-- top-level block
    listItem (depth 2)        <-- item 1
      paragraph (depth 3)
    listItem (depth 2)        <-- item 2
      paragraph (depth 3)
    listItem (depth 2)        <-- item 3
      paragraph (depth 3)
```

The current code always resolves to depth 1 (`bulletList`), so it moves the entire list. The fix needs to detect when the cursor is inside a list item at depth 2+ and operate on the `listItem`/`taskItem` node instead.

### How TipTap/ProseMirror Handles This by Default

TipTap does not provide built-in Alt+Arrow commands for moving list items. ProseMirror's base keymap similarly has no default binding for this operation. The existing `moveBlockUp`/`moveBlockDown` functions in `keyboardShortcuts.ts` are entirely custom Quartz code. There is no upstream command to leverage -- we need to write the list-item-aware logic ourselves.

### Related Extensions and Nodes

The editor registers these list-related extensions in `src/webview/Editor.tsx`:

- `BulletList` -- wraps `listItem` children
- `OrderedList` -- wraps `listItem` children
- `TaskList` -- wraps `taskItem` children
- `ListItem` -- standard list item node
- `TaskItem` -- task item node (configured with `nested: true`)

All list item types (`listItem` and `taskItem`) share the same structural role as children of their parent list node. The fix should handle both uniformly.

### Related Files

| File | Role |
|------|------|
| `src/webview/extensions/keyboardShortcuts.ts` | Keyboard shortcut definitions and block move logic |
| `src/webview/Editor.tsx` | Editor configuration with all extensions |
| `src/markdown/handlers/list.ts` | Parser for list structures |
| `src/markdown/serializer.ts` | Serializer (list items serialized by parent) |

---

## 4. Proposed Solution

### Overview

Add list-item-aware movement logic to the existing `Alt-ArrowUp` and `Alt-ArrowDown` handlers in `keyboardShortcuts.ts`. When the cursor is inside a `listItem` or `taskItem`, the handler swaps that item with its adjacent sibling within the same parent list node using a ProseMirror transaction. When the cursor is not in a list, the existing top-level block movement behavior is preserved as a fallback.

### Detailed Design

#### 4.1 Detecting the List Item Context

Add a helper function `findListItemAround` that walks up the resolved position's depth to find the nearest `listItem` or `taskItem` ancestor:

```typescript
function findListItemAround($pos: ResolvedPos): {
  depth: number;
  node: ProseMirrorNode;
  pos: number;
  index: number;
  parent: ProseMirrorNode;
} | null {
  for (let depth = $pos.depth; depth >= 1; depth--) {
    const node = $pos.node(depth);
    if (node.type.name === 'listItem' || node.type.name === 'taskItem') {
      const pos = $pos.before(depth);
      const parent = $pos.node(depth - 1);
      const index = $pos.index(depth - 1);
      return { depth, node, pos, index, parent };
    }
  }
  return null;
}
```

This function returns the list item node, its position in the document, its index among siblings, and its parent list node. If the cursor is not inside any list item, it returns `null`.

#### 4.2 Moving a List Item Up

Add a `moveListItemUp` function:

```typescript
function moveListItemUp(editor: Editor): boolean {
  const { state, dispatch } = editor.view;
  const { selection, doc } = state;
  const $from = selection.$from;

  const listItemInfo = findListItemAround($from);
  if (!listItemInfo) return false; // Not in a list item -- fall through

  const { depth, node, pos, index, parent } = listItemInfo;

  // Already the first item -- no-op
  if (index === 0) return true;

  // Get the previous sibling
  const prevItem = parent.child(index - 1);
  const prevItemPos = pos - prevItem.nodeSize;

  // Build transaction: delete current item, insert it before previous sibling
  const tr = state.tr;
  const currentItemSlice = doc.slice(pos, pos + node.nodeSize);

  tr.delete(pos, pos + node.nodeSize);
  tr.insert(prevItemPos, currentItemSlice.content);

  // Restore cursor position within the moved item
  const cursorOffset = $from.pos - pos;
  const newCursorPos = prevItemPos + cursorOffset;

  try {
    const $newPos = tr.doc.resolve(
      Math.min(Math.max(newCursorPos, 0), tr.doc.content.size - 1)
    );
    tr.setSelection(TextSelection.near($newPos));
  } catch {
    // Fallback: let ProseMirror pick a valid selection
  }

  dispatch(tr.scrollIntoView());
  return true;
}
```

#### 4.3 Moving a List Item Down

Add a `moveListItemDown` function:

```typescript
function moveListItemDown(editor: Editor): boolean {
  const { state, dispatch } = editor.view;
  const { selection, doc } = state;
  const $from = selection.$from;

  const listItemInfo = findListItemAround($from);
  if (!listItemInfo) return false; // Not in a list item -- fall through

  const { depth, node, pos, index, parent } = listItemInfo;

  // Already the last item -- no-op
  if (index >= parent.childCount - 1) return true;

  // Get the next sibling
  const nextItem = parent.child(index + 1);
  const nextItemPos = pos + node.nodeSize;
  const nextItemEndPos = nextItemPos + nextItem.nodeSize;

  // Build transaction: delete next item, insert it before current item
  const tr = state.tr;
  const nextItemSlice = doc.slice(nextItemPos, nextItemEndPos);

  tr.delete(nextItemPos, nextItemEndPos);
  tr.insert(pos, nextItemSlice.content);

  // Restore cursor position within the moved item
  const cursorOffset = $from.pos - pos;
  const newCursorPos = pos + nextItem.nodeSize + cursorOffset;

  try {
    const $newPos = tr.doc.resolve(
      Math.min(Math.max(newCursorPos, 0), tr.doc.content.size - 1)
    );
    tr.setSelection(TextSelection.near($newPos));
  } catch {
    // Fallback: let ProseMirror pick a valid selection
  }

  dispatch(tr.scrollIntoView());
  return true;
}
```

#### 4.4 Updating the Keyboard Shortcut Handlers

Modify the `Alt-ArrowUp` and `Alt-ArrowDown` bindings to attempt list item movement first, then fall back to top-level block movement:

```typescript
'Alt-ArrowUp': () => {
  // Try list item movement first; if not in a list, move the whole block
  return moveListItemUp(this.editor) || moveBlockUp(this.editor);
},
'Alt-ArrowDown': () => {
  return moveListItemDown(this.editor) || moveBlockDown(this.editor);
},
```

The key design choice: `moveListItemUp`/`moveListItemDown` return `false` when the cursor is not inside a list item, causing the fallback to `moveBlockUp`/`moveBlockDown`. They return `true` (handled) when the cursor IS in a list item, even if the item is at a boundary (first/last position), which prevents the top-level block move from firing erroneously.

#### 4.5 Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| First item in list, ArrowUp | No-op (return `true` to prevent block move) |
| Last item in list, ArrowDown | No-op (return `true` to prevent block move) |
| Nested list item (sub-list) | Moves within its immediate parent list only |
| Task item in task list | Handled identically -- `taskItem` is detected alongside `listItem` |
| List item with multiple paragraphs | The entire `listItem` node (including all child content) moves as a unit |
| List item with nested sub-list | The entire `listItem` node (including the nested list) moves as a unit |
| Single-item list | No-op in both directions |
| Cursor in a list inside a blockquote | `findListItemAround` walks up from the cursor and finds the list item regardless of blockquote wrapper |

---

## 5. Alternative Solutions Considered

### Alternative 1: Use ProseMirror `liftListItem` / `sinkListItem` Commands

**Approach:** Use the built-in ProseMirror schema-list commands to restructure list items.

**Pros:**
- Uses well-tested ProseMirror primitives
- Handles schema validation automatically

**Cons:**
- `liftListItem` and `sinkListItem` change nesting level (indent/outdent), not sibling order
- No built-in "swap siblings" command exists in prosemirror-schema-list
- Would require significant wrapping logic that amounts to writing custom transaction code anyway

**Decision:** Rejected -- these commands solve a different problem (nesting) and do not support sibling reordering.

### Alternative 2: Use TipTap `joinUp` / `joinDown` Commands

**Approach:** Leverage TipTap's `joinUp` and `joinDown` commands on list items.

**Pros:**
- Simple API call

**Cons:**
- `joinUp`/`joinDown` merge nodes together (combining two list items into one), not swap them
- Destroys content structure rather than reordering

**Decision:** Rejected -- wrong semantics entirely.

### Alternative 3: Disable Option+Arrow Inside Lists

**Approach:** Return `true` (handled) from the Alt+Arrow handler when inside a list, effectively making it a no-op.

**Pros:**
- Simple to implement
- Prevents the confusing whole-list movement

**Cons:**
- Removes useful functionality that users expect
- Does not match VS Code or Notion behavior

**Decision:** Rejected -- users expect this to work, not be disabled.

### Alternative 4: Move List Item Out of the List at Boundaries

**Approach:** When pressing ArrowUp on the first list item or ArrowDown on the last, convert the item to a paragraph and move it outside the list.

**Pros:**
- More powerful -- users can extract items from lists via keyboard
- Matches some editors' behavior

**Cons:**
- More complex implementation
- Risk of data loss (list markers, task state)
- Not consistent with VS Code native behavior (which is a no-op at boundaries)
- Can be added later as a P2 enhancement

**Decision:** Deferred -- keep boundary behavior as no-op for initial implementation. Can revisit later.

---

## 6. Security, Privacy, and Compliance

### Security Considerations

- Keyboard shortcut handling has no security implications
- No external data transmission is involved
- ProseMirror transactions operate entirely within the editor's document model

### Privacy

- No user data is collected, transmitted, or logged by this feature

### Compliance

- No compliance implications

---

## 7. Testing Strategy

### Unit Tests

Add unit tests in `test/unit/` to verify the list item movement logic:

1. **Move list item up within bullet list** -- swap second item with first, verify order
2. **Move list item down within bullet list** -- swap first item with second, verify order
3. **Move list item up at top boundary** -- verify no-op
4. **Move list item down at bottom boundary** -- verify no-op
5. **Move task item up within task list** -- verify task state (checked/unchecked) is preserved
6. **Move ordered list item** -- verify content reorders correctly
7. **Move list item with nested sub-list** -- verify nested content moves with the item
8. **Non-list context falls through to block move** -- verify paragraph still uses top-level block move

### E2E Tests

Add E2E tests in `test/e2e/specs/` to verify end-to-end behavior:

```typescript
test('Option+ArrowUp moves list item up within bullet list', async ({ page }) => {
  await loadMarkdown(page, '- Item 1\n- Item 2\n- Item 3');
  // Place cursor in "Item 2"
  // Press Alt+ArrowUp
  // Verify order is now: Item 2, Item 1, Item 3
});

test('Option+ArrowDown moves list item down within bullet list', async ({ page }) => {
  await loadMarkdown(page, '- Item 1\n- Item 2\n- Item 3');
  // Place cursor in "Item 2"
  // Press Alt+ArrowDown
  // Verify order is now: Item 1, Item 3, Item 2
});

test('Option+ArrowUp on first list item is a no-op', async ({ page }) => {
  await loadMarkdown(page, '- Item 1\n- Item 2');
  // Place cursor in "Item 1"
  // Press Alt+ArrowUp
  // Verify order unchanged: Item 1, Item 2
});

test('Option+ArrowDown on last list item is a no-op', async ({ page }) => {
  await loadMarkdown(page, '- Item 1\n- Item 2');
  // Place cursor in "Item 2"
  // Press Alt+ArrowDown
  // Verify order unchanged: Item 1, Item 2
});

test('Option+Arrow works with task lists', async ({ page }) => {
  await loadMarkdown(page, '- [x] Done\n- [ ] Not done');
  // Place cursor in "Not done"
  // Press Alt+ArrowUp
  // Verify order: Not done, Done -- and check states preserved
});

test('Option+Arrow on paragraph still moves top-level block', async ({ page }) => {
  await loadMarkdown(page, '# Heading\n\nParagraph');
  // Place cursor in "Paragraph"
  // Press Alt+ArrowUp
  // Verify paragraph moved above heading
});
```

### Round-Trip Fidelity

After each list item move, serialize the editor content and verify:
- `parse(serialize(editorJSON))` produces the same structure
- No list markers, task states, or content is lost

### Manual Testing

1. Create a bullet list with 5 items, move the third item to the top using repeated Option+ArrowUp
2. Create a task list with checked and unchecked items, reorder them and verify check states persist
3. Create an ordered list, reorder items, verify the numbering updates correctly
4. Create a list item with a nested sub-list, move the parent item and verify the sub-list moves with it
5. Test at list boundaries (first item up, last item down) -- should be no-op
6. Undo after a move -- verify the item returns to its original position
7. Test on macOS (Option+Arrow) and verify the shortcut string works correctly

---

## 8. Rollout Plan

### Phase 1: Core List Item Movement

- **Agent delivers:** `findListItemAround`, `moveListItemUp`, `moveListItemDown` functions in `keyboardShortcuts.ts`, updated Alt-Arrow bindings, unit tests passing
- **Human reviews:** Code correctness, edge case handling, test coverage
- **Approved when:** Human confirms basic list item movement works for bullet, ordered, and task lists

### Phase 2: Edge Case Hardening and E2E Tests

- **Agent delivers:** E2E test specs, fixes for any edge cases found during testing (nested lists, blockquote-wrapped lists, multi-paragraph list items)
- **Human reviews:** E2E tests pass, manual testing on real markdown files
- **Approved when:** Human confirms all list types work correctly and undo/redo behavior is correct

### Rollback Plan

Revert the changes to `keyboardShortcuts.ts`. The risk is very low because the change is isolated to a single file and only affects keyboard shortcut behavior. The existing `moveBlockUp`/`moveBlockDown` functions are not modified, so reverting restores the previous (whole-list movement) behavior.

---

## 9. Human Validation Plan

| Checkpoint | Agent Produces | Human Validates | Blocks |
|------------|----------------|-----------------|--------|
| Implementation complete | Updated `keyboardShortcuts.ts` with list-aware movement | Manual test: move items in bullet, ordered, and task lists | E2E tests |
| Edge cases handled | Unit tests for boundaries, nesting, task state | Review test coverage, test nested lists manually | Release |
| E2E tests pass | E2E spec file with 6+ test cases | Confirm tests pass in CI, do manual smoke test | Release |

---

## 10. Dependencies and Risks

### Dependencies

- ProseMirror transaction API (`state.tr`, `tr.delete`, `tr.insert`)
- TipTap's `ResolvedPos` depth-walking API
- Existing `ListItem` and `TaskItem` extensions registered in the editor

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Cursor position calculation is wrong after move | Medium -- cursor jumps to unexpected location | Medium | Wrap in try/catch, use `TextSelection.near` for safe fallback |
| Transaction corrupts document structure | High -- editor breaks | Low | ProseMirror validates transactions; invalid ones are rejected |
| Nested lists have unexpected depth values | Medium -- move operates on wrong node | Low | `findListItemAround` walks up from cursor, finding nearest list item regardless of nesting depth |
| VS Code intercepts Alt+Arrow before webview | High -- shortcut never reaches editor | Low | Alt+Arrow is already working for block moves, so VS Code is not intercepting it |
| Move breaks undo history | Medium -- user cannot undo | Low | Standard `tr` dispatch integrates with History extension automatically |

---

## 11. Open Questions

*All resolved during review.*

### Resolved

1. **Boundary behavior:** Add a subtle visual cue (brief CSS flash/highlight on the list item) when the user tries to move past the boundary. This provides feedback without being intrusive. *(Resolved: visual cue)*

2. **Multi-item selection:** Move all selected list items as a group. However, this raises broader questions about multi-block selection and movement that go beyond this bug fix. **Decision:** Support multi-item list movement as a P1 goal in this doc. The broader multi-block selection/movement problem (selecting and moving multiple top-level blocks, mixed block types, etc.) should be captured as a separate backlog item. *(Resolved: support within lists, defer general multi-block to separate feature)*

3. **Nested list movement:** Move within immediate parent only. Changing nesting level is handled by Tab/Shift+Tab. *(Resolved)*

---

## 12. Implementation Issues

| # | Title | Status | Scope |
|---|-------|--------|-------|
| TBD | List item movement core implementation | TODO | M |
| TBD | Edge case handling and unit tests | TODO | S |
| TBD | E2E tests for list item movement | TODO | S |

**Progress:** 0/3 issues complete (0%)
