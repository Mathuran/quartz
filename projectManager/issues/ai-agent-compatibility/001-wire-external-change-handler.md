# [001] Wire Up External Change Handler and Feedback Loop Prevention

## Metadata
- **Status:** DONE
- **Depends On:** -
- **Blocks:** 002
- **Scope:** S
- **Design Doc:** [ai-agent-compatibility](../../design-docs/ai-agent-compatibility.md)

## Description

Complete the empty `onDidChangeTextDocument` handler in `QuartzEditorProvider.ts` to send external file changes to the webview. Add a change origin guard to prevent feedback loops (webview edit → save → onDidChangeTextDocument → send back to webview → infinite loop). Wire up the existing `suppressUpdateRef` in `App.tsx` to suppress outbound updates during external content loads.

This is the core fix — the webview already handles `externalChange` messages and loads content without polluting undo history. The only missing piece is the extension host sending the message.

## Acceptance Criteria

- [ ] When an external process modifies a `.md` file open in Quartz, the WYSIWYG view updates within 500ms
- [ ] Editing in the WYSIWYG view does NOT trigger an `externalChange` message back to itself (no feedback loop)
- [ ] Rapid external changes (5 saves in 2 seconds) are debounced — only 1 update reaches the webview
- [ ] External content loads do not add to undo history (`Cmd+Z` does not undo back to stale content)
- [ ] The editor does not freeze or loop when receiving external changes
- [ ] `applyEdits` properly awaits the `WorkspaceEdit` promise before clearing the guard flag
- [ ] All existing unit and E2E tests continue to pass

## Human Review Focus

- **Look at:** The ~30 line diff in `QuartzEditorProvider.ts` and `App.tsx` — verify the change origin guard logic and debounce timing
- **Test:** Open a `.md` file in Quartz, run `echo "# Changed" > file.md` in terminal, verify the editor refreshes. Press `Cmd+Z` — verify it does NOT undo the external change. Type in the editor, then run the echo command again — verify agent's version wins.
- **Decide:** Does the 500ms `suppressUpdateRef` timeout feel right, or does it need tuning?

## Agent Autonomy Notes

- **Agent can decide:** Exact debounce timing (design doc says 300ms), whether to use `setTimeout` or a utility, variable naming
- **Escalate to human:** If the boolean flag approach causes feedback loop issues during testing, escalate before switching to content hash comparison

## Technical Notes

### Suggested Approach

1. In `QuartzEditorProvider.ts` `resolveCustomTextEditor`:
   - Add `let isApplyingWebviewEdit = false` flag
   - In the `update` message handler: set flag to `true`, await `this.applyEdits()`, set flag to `false`
   - Make `applyEdits` async and await `vscode.workspace.applyEdit(edit)`
   - In `onDidChangeTextDocument`: check `isApplyingWebviewEdit` — if true, return early
   - Add debounced `sendExternalChange()` function that posts `{ type: 'externalChange', content: document.getText() }` to the webview

2. In `App.tsx`:
   - In the `externalChange` case: set `suppressUpdateRef.current = true`, call `setContent`, then `setTimeout(() => { suppressUpdateRef.current = false }, 500)`

### Files to Modify
- `src/QuartzEditorProvider.ts` — Add change origin guard, debounced external change sender
- `src/webview/App.tsx` — Wire up `suppressUpdateRef` in `externalChange` handler

### Key Considerations
- The `applyEdits` method currently returns `void` and doesn't await. Must be made async to ensure the guard flag is cleared after the edit completes.
- The `suppressUpdateRef` already exists and `handleUpdate` already checks it — minimal webview changes needed.
- Cleanup: clear `externalChangeTimeout` in the `onDidDispose` handler to prevent leaks.

## Tests Required

### Unit Tests
- None needed — parser/serializer behavior unchanged

### E2E Tests
- Existing `test/e2e/specs/external-change.spec.ts` should pass with the fix — verify all 3 tests pass

### Manual Testing
- [ ] Open `.md` file in Quartz, edit file externally via terminal — editor refreshes
- [ ] Type in editor — no feedback loop or flickering
- [ ] `Cmd+Z` after external change — does NOT revert to old content
- [ ] Rapid external edits (save 5x quickly) — editor settles on final content
- [ ] Edit in Quartz, then immediately edit externally — external version wins

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Existing E2E external-change tests pass
- [ ] Manual QA completed (see Human Review Focus)
- [ ] Human review completed
- [ ] No regressions in existing test suites
