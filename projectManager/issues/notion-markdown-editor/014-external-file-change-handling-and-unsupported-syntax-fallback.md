# [014] External File Change Handling and Unsupported Syntax Fallback

## Metadata
- **Status:** TODO
- **Depends On:** 005
- **Blocks:** None
- **Scope:** S
- **Design Doc:** [notion-markdown-editor](../../design-docs/notion-markdown-editor.md)

## Description

Handle two edge cases from the design doc: (1) external file changes — when the `.md` file is modified outside the editor (git, terminal, other editors), detect the change and prompt the user to reload. (2) Unsupported syntax fallback — when a file contains markdown syntax that Quartz cannot parse, fall back to VS Code's native editor with a notification.

## Acceptance Criteria

- [ ] **External changes:** When the file is modified externally while open in Quartz, a notification prompts: "File changed on disk. Reload?" with Reload and Ignore options
- [ ] Clicking Reload refreshes the editor with the new file content
- [ ] Clicking Ignore keeps the current editor state (file will be overwritten on next save)
- [ ] If the editor has unsaved changes and the file changes externally, warn about potential conflict
- [ ] **Unsupported syntax:** If the parser encounters a file it cannot handle (too many unsupported blocks), fall back to VS Code native editor
- [ ] A notification toast appears: "This file contains syntax Quartz doesn't support. Opening in the default editor."
- [ ] Partially unsupported files (some unknown blocks) render unknown content as opaque raw-text blocks (not editable, but displayed)
- [ ] Raw-text opaque blocks round-trip without modification

## Technical Notes

### Suggested Approach

**External changes:**
1. Use `vscode.workspace.onDidChangeTextDocument` or file system watcher to detect changes
2. Compare document version — if it changed outside our edits, trigger the reload prompt
3. Use `vscode.window.showInformationMessage` with action buttons
4. On reload: re-read file, re-parse, and send updated document to webview

**Unsupported syntax fallback:**
1. During parsing, count raw/opaque blocks. If they exceed a threshold (e.g., >50% of document), trigger fallback
2. Use `vscode.commands.executeCommand('vscode.openWith', uri, 'default')` to open in native editor
3. Show notification via `vscode.window.showInformationMessage`
4. For partial unsupported content, the parser already produces `rawBlock` nodes (from issue 002) — ensure they render as gray, non-editable regions in the editor

### Files to Create/Modify
- `src/QuartzEditorProvider.ts` — Add file watcher and change detection logic
- `src/webview/components/RawBlock.tsx` — Read-only display component for unsupported content
- `src/webview/styles/rawBlock.css` — Gray background, non-editable styling
- `src/markdown/parser.ts` — Add unsupported content threshold check

### Key Considerations
- Be careful about change detection loops — our own saves should not trigger the "file changed" prompt
- The file watcher should be disposed when the editor is closed
- For the unsupported syntax threshold, consider making it configurable or using a heuristic (e.g., if the first parse attempt fails entirely)
- Raw blocks should have a subtle "unsupported content" label so users understand why it's not editable

## Tests Required

### Unit Tests
- [ ] External change detection triggers prompt
- [ ] Own save does not trigger external change prompt
- [ ] Reload re-parses and updates editor
- [ ] Unsupported syntax threshold calculation
- [ ] Raw block node renders as non-editable
- [ ] Raw block round-trips without modification

### Integration Tests
- [ ] Modify file externally → prompt appears → reload updates editor
- [ ] Open file with unsupported syntax → falls back to native editor
- [ ] Open file with partial unsupported content → raw blocks display correctly
- [ ] Edit around raw blocks → save → raw content preserved

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
