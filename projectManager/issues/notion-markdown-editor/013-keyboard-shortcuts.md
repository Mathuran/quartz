# [013] Keyboard Shortcuts

## Metadata
- **Status:** TODO
- **Depends On:** 005
- **Blocks:** None
- **Scope:** S
- **Design Doc:** [notion-markdown-editor](../../design-docs/notion-markdown-editor.md)

## Description

Implement all keyboard shortcuts defined in design doc Appendix B. Ensure all formatting and block operations are accessible via keyboard. Shortcuts should follow Notion's conventions where specified and work on both macOS and Windows/Linux.

## Acceptance Criteria

- [ ] All shortcuts from Appendix B work:
  - Bold (Cmd/Ctrl+B), Italic (Cmd/Ctrl+I), Strikethrough (Cmd/Ctrl+Shift+S)
  - Inline Code (Cmd/Ctrl+E), Link (Cmd/Ctrl+K)
  - Heading 1-3 (Cmd/Ctrl+Alt+1/2/3)
  - Bullet List (Cmd/Ctrl+Shift+8), Numbered List (Cmd/Ctrl+Shift+7), Task List (Cmd/Ctrl+Shift+9)
  - Code Block (Cmd/Ctrl+Alt+C), Blockquote (Cmd/Ctrl+Shift+.)
  - Slash Command (/)
  - Undo (Cmd/Ctrl+Z), Redo (Cmd/Ctrl+Shift+Z)
- [ ] Shortcuts do not conflict with VS Code keybindings (webview captures them before VS Code)
- [ ] Block-level shortcuts toggle the block type (e.g., Cmd+Alt+1 on a paragraph converts to H1, on an H1 converts back to paragraph)
- [ ] Mark shortcuts toggle on selected text (e.g., Cmd+B on bold text removes bold)

## Technical Notes

### Suggested Approach
1. Most mark shortcuts (bold, italic, strikethrough, code) are built into TipTap's starter kit — verify they work in the webview context
2. Block shortcuts (heading, list, code block, blockquote) may need custom key bindings via TipTap's `addKeyboardShortcuts()` API
3. Create `src/webview/extensions/keyboardShortcuts.ts` to centralize custom shortcut definitions
4. Handle platform detection: use `navigator.platform` or TipTap's built-in platform detection to map Cmd (macOS) vs Ctrl (Windows/Linux)
5. Test that shortcuts are captured by the webview and don't bubble to VS Code (webview keyboard events are isolated by default, but verify)

### Files to Create/Modify
- `src/webview/extensions/keyboardShortcuts.ts` — Custom keyboard shortcut extension
- Possibly modify individual block extensions to add `addKeyboardShortcuts()`

### Key Considerations
- VS Code intercepts some shortcuts before they reach the webview (e.g., Cmd+S for save). These work naturally through `CustomTextEditorProvider`. Do not add Cmd+S handling.
- Cmd+K in VS Code normally opens the command palette chord. In the webview, it should trigger the link insertion. Verify this works correctly.
- Shortcuts should be discoverable — consider adding tooltips to toolbar buttons showing the shortcut

## Tests Required

### Unit Tests
- [ ] Each shortcut triggers the expected TipTap command
- [ ] Toggle behavior: applying shortcut twice returns to original state
- [ ] Platform-specific modifier key works (Cmd on macOS, Ctrl on Windows)

### Integration Tests
- [ ] Cmd+B on selected text → text becomes bold → save → verify `**text**`
- [ ] Cmd+Alt+1 on paragraph → converts to H1 → save → verify `# text`
- [ ] Cmd+Shift+8 on paragraph → converts to bullet list → save → verify `- text`
- [ ] Cmd+K opens link input → enter URL → save → verify `[text](url)`

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
