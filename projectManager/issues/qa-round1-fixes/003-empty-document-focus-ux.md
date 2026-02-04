# [003] Empty Document UX — Focus State Invisible, Unclear Where to Click

## Metadata
- **Status:** TODO
- **Depends On:** 001
- **Blocks:** —
- **Scope:** S
- **Found in:** QA Round 1 (TC-02.02)

## Description

When opening an empty `.md` file, the user experience is poor:
1. The drag handle row ("brail") appears but clicking it does nothing
2. It's not obvious where to click to start typing
3. When clicking to focus the editor, the text cursor overlaps with the border and appears invisible
4. User suggests: "Instead of creating a border around the box in focus use a highlight color like how notion does"

## Root Cause

1. **CSS not loading (issue 001)** means the placeholder text ("Start typing...") doesn't appear
2. The existing CSS uses `outline: none` on `.quartz-editor-content` but provides no replacement focus indicator
3. No `focus-within` background highlight or subtle visual cue that the editor area is clickable/editable

## Acceptance Criteria

- [ ] Empty document shows a visible placeholder text (e.g., "Type '/' for commands..." or "Start writing...")
- [ ] Clicking anywhere in the editor area activates the cursor
- [ ] Focused editor has a subtle background highlight (not a border) — similar to Notion
- [ ] Text cursor is clearly visible against the background in both light and dark themes
- [ ] Drag handle is not shown for the empty placeholder state (or is dimmed)

## Technical Notes

### Focus Styling Approach (Notion-style)

Replace border-based focus with a subtle background change:

```css
.quartz-editor-content:focus-within {
  background-color: var(--vscode-editor-background, #fff);
}

/* Subtle highlight on the active/focused block */
.ProseMirror:focus-within .is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: var(--vscode-editorGhostText-foreground, #aaa);
  pointer-events: none;
  float: left;
  height: 0;
}
```

### Placeholder
The existing `editor.css` (lines 223-230) already has placeholder CSS using `p.is-editor-empty:first-child::before`. Once issue 001 is fixed (CSS loads), the placeholder should appear. The additional work here is:
1. Verify placeholder appears after issue 001 fix
2. Improve the focus state styling
3. Ensure cursor is visible (adequate contrast)

### Files to Modify
- `src/webview/styles/editor.css` — add/update focus-within styles
- Possibly `src/webview/Editor.tsx` — verify placeholder configuration in Tiptap

### Key Considerations
- Must work in both light and dark VS Code themes
- Use VS Code CSS variables (`--vscode-*`) for theme compatibility
- The placeholder text should disappear as soon as the user starts typing

## Tests Required

### Manual Testing
- [ ] Open an empty `.md` file — placeholder text is visible
- [ ] Click in editor — cursor is clearly visible
- [ ] Focus state has subtle background highlight, no hard border
- [ ] Start typing — placeholder disappears, text appears normally
- [ ] Works in both light and dark VS Code themes

## Definition of Done

- [ ] All acceptance criteria met
- [ ] TC-02.02 issues resolved
- [ ] Empty document provides clear visual guidance for new users
