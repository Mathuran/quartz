# [003] Extension Host Race Conditions and Resource Leaks

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** 004
- **Scope:** M
- **Design Doc:** [codebase-review-findings](../../design-docs/codebase-review-findings.md)

## Description

The `QuartzEditorProvider` has several race conditions, resource leaks, and unsafe patterns in its VS Code integration layer. The most critical is the `isApplyingWebviewEdit` boolean flag that can cause an infinite edit echo loop. Additionally, the single-panel tracking causes bugs in multi-file scenarios, and several async paths lack proper guards.

**Findings:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.9, 1.10

## Acceptance Criteria

- [x] `isApplyingWebviewEdit` replaced with document version-based tracking (compare `document.version` before/after edit) to prevent echo loops
- [x] `pendingDiffUris` entries cleaned up on timeout (10s) or in `onDidDispose`
- [x] `activeWebviewPanel` replaced with `Map<string, WebviewPanel>` keyed by document URI, or panel disposal checked before use
- [x] `sendExternalChange` timeout callback checks `document.isClosed` and wraps `postMessage` in try/catch
- [x] `getNonce()` uses `crypto.randomBytes(16).toString('hex')` instead of `Math.random()`
- [x] `onDidChangeViewState` disposable captured and added to disposal chain
- [x] `_token` (CancellationToken) checked — abort setup if cancelled

## Human Review Focus

- **Look at:** The version-based edit tracking implementation — ensure it correctly distinguishes self-edits from external changes
- **Test:** Open 2+ markdown files simultaneously, edit both, close one while editing
- **Decide:** Whether `Map<string, WebviewPanel>` or a simpler disposed-check approach is better for multi-panel tracking

## Agent Autonomy Notes

- **Agent can decide:** Exact implementation of version tracking, cleanup timeout duration, error handling patterns
- **Escalate to human:** If the version-based approach doesn't work due to VS Code API behavior — may need to discuss alternative approaches

## Technical Notes

### Suggested Approach
1. Replace `isApplyingWebviewEdit` boolean with a version counter approach:
   ```typescript
   const versionBeforeEdit = document.version;
   await this.applyEdits(document, message.content);
   // In onDidChangeTextDocument:
   // Skip if document.version === versionBeforeEdit + 1
   ```
2. Add cleanup timeout for `pendingDiffUris` — remove entry after 10 seconds
3. Replace `activeWebviewPanel` with a Map or add `!webviewPanel.disposed` checks
4. Guard the debounced external change callback
5. Replace `Math.random()` nonce with `crypto.randomBytes`
6. Capture `onDidChangeViewState` disposable
7. Check `_token.isCancellationRequested` before setup

### Files to Modify
- `src/QuartzEditorProvider.ts` — All changes are in this file

### Key Considerations
- The version-based approach assumes VS Code increments `document.version` by exactly 1 per `applyEdit` — verify this
- The `pendingDiffUris` timeout should be generous enough for slow webview loads
- When checking panel disposal, use try/catch as `webviewPanel.visible` may throw on disposed panels

## Tests Required

### Unit Tests
- [ ] Version-based edit tracking correctly identifies self-edits vs external edits
- [ ] `pendingDiffUris` cleanup removes stale entries after timeout
- [ ] Nonce generation produces 32-char hex string from crypto module

### Integration Tests
- [ ] Opening multiple markdown files simultaneously doesn't cause cross-talk
- [ ] Closing a file while another is open doesn't break the remaining editor
- [ ] External file changes are still detected and reported correctly

### Manual Testing
- [ ] Open a markdown file, edit rapidly — no infinite loop or flickering
- [ ] Open 2 markdown files, edit both, close one — remaining editor works correctly
- [ ] Trigger SCM diff view, close tab immediately — no memory leak warning

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Human review completed (see Human Review Focus above)
- [ ] No regressions in editor functionality
