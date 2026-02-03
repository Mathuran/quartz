# [011] Inline Formatting Toolbar

## Metadata
- **Status:** TODO
- **Depends On:** 005
- **Blocks:** None
- **Scope:** S
- **Design Doc:** [notion-markdown-editor](../../design-docs/notion-markdown-editor.md)

## Description

Implement the floating inline formatting toolbar that appears when the user selects text. The toolbar provides buttons for Bold, Italic, Strikethrough, Code, Link, and Highlight — matching the spec in design doc §4 (Inline Formatting Toolbar).

## Acceptance Criteria

- [ ] Selecting text reveals a floating toolbar above the selection
- [ ] Toolbar contains: Bold, Italic, Strikethrough, Code, Link, Highlight buttons
- [ ] Clicking a button toggles the format on the selected text
- [ ] Active formats are visually indicated (highlighted/pressed state)
- [ ] Link button opens a URL input field inline — pressing Enter applies the link
- [ ] Highlight uses `==text==` markdown extension syntax
- [ ] Toolbar follows the selection position (repositions on selection change)
- [ ] Toolbar dismisses when selection is cleared (blur or click elsewhere)
- [ ] Keyboard shortcuts still work alongside the toolbar (Cmd+B, Cmd+I, Cmd+Shift+S, Cmd+E, Cmd+K, Cmd+Shift+H)

## Technical Notes

### Suggested Approach
1. Use TipTap's `BubbleMenu` component (built-in floating toolbar support)
2. Create `src/webview/components/FormattingToolbar.tsx` — React component for the toolbar
3. Add Highlight mark extension: create custom TipTap extension that maps `==text==` to a `<mark>` element
4. Add highlight support to parser (`markdown-it` plugin for `==`) and serializer
5. Link button: when clicked, show an inline `<input>` for URL. On Enter, apply `setLink({ href })`. On Escape, cancel.
6. Style toolbar to match VS Code aesthetic (compact, dark/light theme aware)

### Files to Create/Modify
- `src/webview/components/FormattingToolbar.tsx` — Toolbar component
- `src/webview/extensions/highlight.ts` — Custom highlight mark extension
- `src/markdown/parser.ts` — Add highlight mark parsing (`==text==`)
- `src/markdown/serializer.ts` — Add highlight mark serialization
- `src/webview/styles/toolbar.css` — Toolbar styles

### Key Considerations
- The toolbar must not occlude the selected text — position above the selection, flip below if at the top of the viewport
- Link editing: if text is already a link, the toolbar should show the current URL and allow editing/removing
- BubbleMenu should only show for text selections, not for node selections (e.g., selecting an image block)
- Highlight (`==`) is not standard CommonMark — it's a common extension. Use `markdown-it-mark` plugin.

## Tests Required

### Unit Tests
- [ ] Toolbar appears on text selection
- [ ] Toolbar hides when selection is empty
- [ ] Bold button toggles bold mark
- [ ] Italic button toggles italic mark
- [ ] Strikethrough button toggles strikethrough mark
- [ ] Code button toggles inline code mark
- [ ] Link button opens URL input, applies link on Enter
- [ ] Highlight button toggles highlight mark
- [ ] Active marks shown as active in toolbar
- [ ] Highlight mark parses and serializes (`==text==`)

### Integration Tests
- [ ] Select text → click Bold → save → verify `**text**` in file
- [ ] Select text → click Link → enter URL → save → verify `[text](url)` in file
- [ ] Select text → click Highlight → save → verify `==text==` in file

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
