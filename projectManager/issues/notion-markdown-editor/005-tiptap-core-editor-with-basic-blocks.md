# [005] TipTap Core Editor with Basic Blocks

## Metadata
- **Status:** TODO
- **Depends On:** 001, 002, 003
- **Blocks:** 006, 007, 008, 009, 010, 011, 012, 013, 014, 015
- **Scope:** M
- **Design Doc:** [notion-markdown-editor](../../design-docs/notion-markdown-editor.md)

## Description

Integrate TipTap into the webview React app and configure it with the core block type extensions: paragraph, headings (1-6), bullet list, ordered list, code block (with syntax highlighting), blockquote, and horizontal rule. Also configure inline marks: bold, italic, strikethrough, inline code, and link.

Wire up the full editing pipeline: extension host reads `.md` file → parses to ProseMirror doc → sends to webview → TipTap renders blocks → user edits → changes sent back to extension host → serialized to markdown → written to file on save.

## Acceptance Criteria

- [ ] TipTap editor renders in the webview with core extensions loaded
- [ ] Opening a `.md` file displays parsed content as editable blocks
- [ ] Paragraph, H1-H6, bullet list, ordered list, code block, blockquote, and horizontal rule all render and are editable
- [ ] Bold, italic, strikethrough, code, and link marks work with keyboard shortcuts (Cmd+B, Cmd+I, etc.)
- [ ] Editing content and saving writes valid markdown back to the file
- [ ] Undo/redo works (Cmd+Z / Cmd+Shift+Z)
- [ ] VS Code dirty indicator shows when document has unsaved changes
- [ ] Code blocks display with syntax highlighting (using lowlight/highlight.js)
- [ ] Editor respects VS Code theme (light/dark)

## Technical Notes

### Suggested Approach
1. Install TipTap packages: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-code-block-lowlight`, and individual extensions as listed in design doc Appendix A
2. Create `src/webview/Editor.tsx` — TipTap editor component
3. Wire up message passing: on `loadDocument` message, set TipTap content from ProseMirror JSON
4. On TipTap `onUpdate`, send document JSON back to extension host
5. In extension host, handle save by serializing ProseMirror doc to markdown
6. Implement dirty tracking using `TextDocument` change events
7. Style editor to match VS Code theme using CSS variables from `data-vscode-theme-kind`

### Files to Create/Modify
- `src/webview/Editor.tsx` — TipTap editor component
- `src/webview/extensions/` — Custom extension configurations
- `src/webview/styles/editor.css` — Editor styles matching VS Code theme
- `src/QuartzEditorProvider.ts` — Add file I/O and message handling

### Key Considerations
- TipTap content can be set via JSON (ProseMirror doc) or HTML — use JSON for direct ProseMirror compatibility
- Code block syntax highlighting: use `lowlight` with a subset of languages (don't bundle all highlight.js languages — use common ones: JS, TS, Python, Go, Rust, Java, CSS, HTML, JSON, YAML, markdown, bash)
- Debounce document updates sent to extension host (avoid flooding with every keystroke)
- Handle the case where the webview is disposed and re-created (restore document state)

## Tests Required

### Unit Tests
- [ ] TipTap editor initializes with correct extensions
- [ ] Setting content from ProseMirror JSON renders correct blocks
- [ ] Each block type renders the expected HTML structure
- [ ] Keyboard shortcuts trigger correct mark toggling
- [ ] Document JSON output matches expected structure after edits

### Integration Tests
- [ ] Open `.md` file → renders blocks → edit heading → save → file contains updated heading
- [ ] Undo after edit restores previous content
- [ ] Dirty indicator appears after edit, clears after save
- [ ] Theme switch (light ↔ dark) updates editor styles

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
