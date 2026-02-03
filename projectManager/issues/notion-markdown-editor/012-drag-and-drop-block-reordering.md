# [012] Drag-and-Drop Block Reordering

## Metadata
- **Status:** TODO
- **Depends On:** 005
- **Blocks:** None
- **Scope:** M
- **Design Doc:** [notion-markdown-editor](../../design-docs/notion-markdown-editor.md)

## Description

Implement drag-and-drop reordering of blocks. Each block shows a grip handle on hover (left side). Dragging a block shows a blue insertion line at valid drop targets. Dropping moves the block to the new position in the ProseMirror document tree.

## Acceptance Criteria

- [ ] Hovering over any block shows a 6-dot grip handle on the left side
- [ ] Grip handle visibility configurable via `quartz.editor.showBlockHandles` setting
- [ ] Dragging a block by the handle shows the block as a semi-transparent drag ghost
- [ ] A blue insertion line appears between blocks at valid drop positions
- [ ] Dropping places the block at the indicated position
- [ ] The ProseMirror document updates correctly (serialization produces reordered markdown)
- [ ] Nested list items can be dragged to change position within the list
- [ ] Undo after drag-drop restores original position
- [ ] Blocks cannot be dropped inside themselves (no circular nesting)

## Technical Notes

### Suggested Approach
1. Create a custom TipTap extension or node view decoration for the drag handle
2. Use ProseMirror's drag-and-drop capabilities (`handleDOMEvents.dragstart`, `handleDOMEvents.drop`)
3. On drag start: create a ProseMirror `Slice` for the dragged node, set as drag data
4. On drag over: calculate drop position from mouse coordinates, render insertion line indicator
5. On drop: create a ProseMirror transaction that deletes the node from the old position and inserts at the new position
6. Alternatively, use TipTap's `@tiptap/extension-dropcursor` for the drop indicator and build handle + drag logic on top

### Files to Create/Modify
- `src/webview/extensions/dragHandle.ts` — Custom extension for block drag handles
- `src/webview/components/DragHandle.tsx` — React component for the grip icon
- `src/webview/styles/dragDrop.css` — Drag handle, drop indicator, ghost styles

### Key Considerations
- Drag handle must not interfere with normal block editing (clicking the handle shouldn't focus the block editor)
- The handle should appear on hover with a slight delay to avoid visual noise during scrolling
- Drop indicator (blue line) should be 2px solid blue, full width, with clear visual affordance
- For table blocks and other complex blocks, the handle should drag the entire block
- Performance: avoid re-rendering all blocks during drag — only update the drop indicator position

## Tests Required

### Unit Tests
- [ ] Drag handle appears on block hover
- [ ] Drag handle hidden when `showBlockHandles` is false
- [ ] ProseMirror transaction moves node to correct position
- [ ] Self-drop (same position) is a no-op
- [ ] Undo reverses the drag-drop transaction

### Integration Tests
- [ ] Drag paragraph from position 1 to position 3 → save → verify order in markdown
- [ ] Drag heading block → save → verify heading at new position
- [ ] Drag list item within list → save → verify order
- [ ] Undo after drag → verify original order restored

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
