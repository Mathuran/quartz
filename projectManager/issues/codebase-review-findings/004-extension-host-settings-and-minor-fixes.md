# [004] Extension Host Settings and Minor Fixes

## Metadata
- **Status:** DONE
- **Depends On:** 003
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [codebase-review-findings](../../design-docs/codebase-review-findings.md)

## Description

Several lower-severity issues in the extension host layer: global settings mutation without checking user preference, misleading command naming, unsafe type casts, minor performance issues, and missing error handling.

**Findings:** 1.6, 1.7, 1.8, 1.11, 1.12, 1.13, 1.14, 1.15

## Acceptance Criteria

- [ ] `applyEdits` uses `document.positionAt(0)` / `document.positionAt(document.getText().length)` for the full range
- [ ] `ensureDefaultEditorAssociation` only modifies settings when `quartz.editor.defaultForMarkdown` is `true`
- [ ] `closeDiffView` command either renamed or given distinct behavior (not identical to `viewGitChanges`)
- [ ] `activeTab.input` cast uses `instanceof vscode.Uri` type guard
- [ ] `docKey` reused in `onDidChangeTextDocument` instead of recomputing `document.uri.toString()`
- [ ] Relative path computation uses `vscode.workspace.asRelativePath()` or `path.relative()`
- [ ] `quartz.refreshOutline` promise has `.catch()` error handler
- [ ] CSP `img-src` behavior documented in code comment (intentional trade-off)

## Human Review Focus

- **Look at:** The `ensureDefaultEditorAssociation` gating logic — is the config key correct?
- **Test:** Install extension fresh — verify it does not modify global settings unless opted in
- **Decide:** Whether `closeDiffView` should be a true toggle or a separate close action

## Agent Autonomy Notes

- **Agent can decide:** Error message text, path computation implementation, comment wording
- **Escalate to human:** Whether `closeDiffView` behavior should change (toggle vs. separate close)

## Technical Notes

### Suggested Approach
1. Fix `applyEdits` range calculation
2. Gate `ensureDefaultEditorAssociation` behind config check
3. Add `instanceof vscode.Uri` guard in tab input checks
4. Cache `docKey` and reuse in event handler
5. Use `vscode.workspace.asRelativePath()` for path computation
6. Add `.catch()` to `openTextDocument` promise
7. Add comment explaining CSP `https:` allowance for external images

### Files to Modify
- `src/QuartzEditorProvider.ts` — Range fix, path fix
- `src/extension.ts` — Settings gate, command fix, type guard, error handling

## Tests Required

### Unit Tests
- [ ] `applyEdits` range covers entire document including last line without trailing newline
- [ ] Settings association respects `defaultForMarkdown` config value

### Manual Testing
- [ ] Fresh install: global settings not modified unless config is enabled
- [ ] Open file → refresh outline → delete file → no unhandled rejection in console

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Human review completed (see Human Review Focus above)
- [ ] No regressions in extension activation or editor behavior
