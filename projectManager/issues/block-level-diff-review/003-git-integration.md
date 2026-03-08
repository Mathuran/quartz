# [003] Git Integration and End-to-End Wiring

## Metadata
- **Status:** DONE
- **Depends On:** 001, 002
- **Blocks:** 004
- **Scope:** M
- **Design Doc:** [block-level-diff-review](../../design-docs/block-level-diff-review.md)

## Description

Wire the split-view diff UI to VS Code's Git extension API. Register the `Quartz: View Git Changes` command, add a toolbar button, implement the message flow between extension host and webview, and integrate the diff engine + split-view components into the main editor flow.

After this issue, the primary feature is complete: users can view a WYSIWYG block-level git diff of their markdown file.

## Acceptance Criteria

- [ ] `Quartz: View Git Changes` command registered in `package.json` contributions
- [ ] Command retrieves content at HEAD via VS Code Git Extension API and sends `openDiffView` message to webview
- [ ] Git diff toolbar button appears in the formatting toolbar
- [ ] `App.tsx` handles `openDiffView` message: computes diff, enters split-view mode
- [ ] `Editor.tsx` toggles between normal editor and `DiffSplitView` based on `DiffViewState.active`
- [ ] "Close Diff" collapses back to single editor — right panel content is the file (no merge step)
- [ ] Edits made in the right panel during diff view are saved normally via the existing debounce mechanism
- [ ] When no git repo is present, the command and toolbar button are hidden (graceful degradation)
- [ ] When the file has no changes vs HEAD, show a brief notification "No changes" instead of opening an empty diff
- [ ] Feature flag `quartz.diffReview.enabled` gates the feature — when false, command and button are hidden
- [ ] All existing tests still pass (no regressions)

## Human Review Focus

- **Look at:** The end-to-end flow — does triggering the command feel snappy? Does the diff view show accurate changes?
- **Test:** Make changes to a markdown file in the git repo, trigger `Quartz: View Git Changes`, verify the diff is correct. Edit the right panel, close diff, confirm edits persisted. Test with no git repo.
- **Decide:** Is the toolbar button placement right? Any UX adjustments before shipping?

## Agent Autonomy Notes

- **Agent can decide:** Message type naming, state management approach in App.tsx, toolbar button icon choice, error handling details, "No changes" notification implementation
- **Escalate to human:** If the VS Code Git extension API doesn't expose `show()` for retrieving file content at a ref, or if there are permission issues accessing the git extension

## Technical Notes

### Suggested Approach
1. Add to `package.json`:
   - Command: `quartz.viewGitChanges` with title "Quartz: View Git Changes"
   - Configuration: `quartz.diffReview.enabled` boolean setting (default: true)
   - Toolbar button (if using editor/title contribution point)
2. In `QuartzEditorProvider.ts`:
   - On command activation, get `vscode.extensions.getExtension('vscode.git')?.exports?.getAPI(1)`
   - Get repo via `git.getRepository(document.uri)`
   - Get HEAD content via `repo.show()` with the file's relative path
   - Send `openDiffView` message with `oldContent` (HEAD) and `newContent` (current file)
   - Handle `requestGitDiff` message from webview (for toolbar button trigger)
   - Gate behind `quartz.diffReview.enabled` setting
3. In `App.tsx`:
   - Add `DiffViewState` to state
   - Handle `openDiffView` message: parse both contents, run `computeDiff()`, set state
   - Render `DiffSplitView` when `diffViewState.active`, normal `Editor` otherwise
   - Handle "Close Diff" callback: set `diffViewState.active = false`
4. Add git diff toolbar button to `FormattingToolbar.tsx` or equivalent
5. Wire `requestGitDiff` message from toolbar button click → extension host → git API → `openDiffView` response

### Files to Modify
- `package.json` — command + setting registration
- `src/QuartzEditorProvider.ts` — git API integration, message handling
- `src/webview/App.tsx` — diff view state, message handling, conditional rendering
- `src/webview/Editor.tsx` — or adjust rendering to support split-view toggle
- `src/webview/components/FormattingToolbar.tsx` — git diff button

### Key Considerations
- The VS Code Git extension API is `vscode.git` (built-in, not a marketplace extension). Access via `vscode.extensions.getExtension('vscode.git')`
- `repo.show(ref)` returns the file content as a string. The ref format is `HEAD:path/to/file.md`
- If the git extension isn't available or the file isn't in a repo, hide the command via `when` clause in package.json: `"when": "quartz.gitAvailable && config.quartz.diffReview.enabled"`
- The right panel in git diff mode IS the working file. Edits save normally. No special "apply" step needed.
- The "No changes" case: if `computeDiff()` returns zero non-unchanged entries, show a VS Code information message or a brief in-editor notification instead of an empty split view

## Tests Required

### Integration Tests
- [ ] Git diff command retrieves correct content from git extension API
- [ ] `openDiffView` message triggers split-view mode in webview
- [ ] Close diff returns to normal editor mode
- [ ] Feature flag disabled → command not available
- [ ] No git repo → command hidden

### E2E Tests (`test/e2e/specs/diff-view.spec.ts` — subset)
- [ ] Triggering diff view opens split-view with correct old/new content
- [ ] Editing right panel during diff view persists changes after closing
- [ ] Close Diff returns to single editor with current content
- [ ] Toolbar button triggers diff view

### Manual Testing
- [ ] Make real changes to a .md file in a git repo
- [ ] Trigger `Quartz: View Git Changes` from command palette
- [ ] Verify diff highlights match actual changes
- [ ] Edit right panel during review, close diff, verify edits saved
- [ ] Open a file not in a git repo — command should be hidden
- [ ] Disable `quartz.diffReview.enabled` — command should be hidden

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Integration and E2E tests written and passing
- [ ] `npm test`, `npm run test:e2e`, and `npm run test:integration` pass with no regressions
- [ ] Human review of end-to-end git diff flow completed
