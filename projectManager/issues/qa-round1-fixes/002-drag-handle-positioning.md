# [002] Drag Handle Renders Inside Text Instead of Left of Block

## Metadata
- **Status:** DONE
- **Depends On:** 001
- **Blocks:** —
- **Scope:** S
- **Found in:** QA Round 1 (TC-01.01, TC-02.01, TC-02.02)

## Description

The 6-dot grip drag handle (`.quartz-drag-handle`) renders inside or above the text content instead of to the left of each block. The user reports: "The brail tab is inside the text box instead of to the left of the box."

This is partially caused by issue 001 (CSS not loading), but even after CSS loads, **no CSS rules exist for `.quartz-drag-handle`**. The class is defined in `dragHandle.ts` but has zero corresponding CSS rules in any stylesheet.

## Root Cause

1. **No CSS rules for `.quartz-drag-handle`** — grep across all CSS files finds zero matches
2. The ProseMirror decoration uses `side: -1` (renders before the node) but without absolute positioning, the widget is rendered as an inline element that pushes content to the right
3. Parent block elements need `position: relative` so the handle can be absolutely positioned to the left

## Acceptance Criteria

- [ ] Drag handle appears to the left of each block (not inside or above)
- [ ] Handle is visible only on hover (opacity transition)
- [ ] Handle uses `cursor: grab` (and `cursor: grabbing` while dragging)
- [ ] Handle is vertically centered relative to the first line of each block
- [ ] Handle does not overlap with text content

## Technical Notes

### CSS to Add (in `editor.css` or a new `dragHandle.css`)

```css
/* Block containers need relative positioning for handle placement */
.ProseMirror > * {
  position: relative;
}

.quartz-drag-handle {
  position: absolute;
  left: -28px;
  top: 2px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  opacity: 0;
  transition: opacity 0.15s ease;
  border-radius: 3px;
  user-select: none;
}

.quartz-drag-handle:hover {
  background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.15));
}

.quartz-drag-handle:active {
  cursor: grabbing;
}

/* Show handle when hovering the block */
.ProseMirror > *:hover > .quartz-drag-handle,
.ProseMirror > * > .quartz-drag-handle:hover {
  opacity: 1;
}
```

### Files to Modify
- `src/webview/styles/editor.css` — add drag handle positioning rules

### Key Considerations
- The exact `left` offset depends on the editor's padding/margin — adjust to match the Notion-style layout
- The SVG in `dragHandle.ts` (line 14-18) renders a 6-dot grip pattern — verify it renders at the right size
- Test with different block types (headings are taller, lists have nested elements)

## Tests Required

### Manual Testing
- [ ] Drag handle appears left of paragraphs, headings, lists, code blocks
- [ ] Handle fades in on hover, fades out when mouse leaves
- [ ] Handle doesn't overlap text or push content to the right
- [ ] Dragging with the handle reorders blocks correctly

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Handle positioning works for all block types
- [ ] TC-01.01 and TC-02.01 "brail tab" issues resolved
