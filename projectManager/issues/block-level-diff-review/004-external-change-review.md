# [004] External Change Review

## Metadata
- **Status:** DONE
- **Depends On:** 001, 002, 003
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [block-level-diff-review](../../design-docs/block-level-diff-review.md)

## Description

Reuse the split-view diff infrastructure to let users review external file changes before they're applied. Replace the current silent-replace behavior with a notification banner offering "View Changes" | "Accept" | "Dismiss". "View Changes" opens the same split-view diff UI with apply/dismiss semantics.

## Acceptance Criteria

- [ ] External file changes no longer silently replace editor content (when `quartz.diffReview.enabled` is true)
- [ ] Notification banner appears: "File changed externally" with "View Changes" | "Accept" | "Dismiss" buttons
- [ ] "Accept" immediately applies the new content (fast path, no split view)
- [ ] "Dismiss" keeps the old content, discards the external change
- [ ] "View Changes" opens the split-view diff with old (current editor) on left, new (external change) on right
- [ ] In external change diff view, right panel is editable (user can curate the incoming changes)
- [ ] "Apply" button in DiffReviewBar commits the right panel content as the document
- [ ] "Dismiss" button in DiffReviewBar discards the external change, keeps old content
- [ ] DiffReviewBar shows "External change" as the source label (not "vs HEAD")
- [ ] When `quartz.diffReview.enabled` is false, external changes use the current silent-replace behavior (backward compatible)
- [ ] Rapid sequential external changes while notification is showing → update the pending content to the latest change
- [ ] All existing tests still pass (no regressions)

## Human Review Focus

- **Look at:** The notification banner design — is it clear and non-intrusive? Do the button labels make sense?
- **Test:** Edit a file externally while it's open in Quartz. Verify notification appears. Test all three paths: View Changes → Apply, View Changes → Dismiss, Accept (fast path), Dismiss.
- **Decide:** Is the notification positioning right? Any wording changes needed?

## Agent Autonomy Notes

- **Agent can decide:** Notification banner component design, CSS styling, animation/transition for banner appearance, how to handle the pending content state
- **Escalate to human:** If the 500ms update suppression window in the current external change flow causes issues with the new notification flow

## Technical Notes

### Suggested Approach
1. In `QuartzEditorProvider.ts`:
   - Change the external change handler: instead of sending `externalChange`, send `externalChangeAvailable` with `newContent`
   - Store the old content (current editor state) for comparison
   - Handle `applyExternalChange` message from webview (apply the content via `WorkspaceEdit`)
   - Handle `dismissExternalChange` message (do nothing, keep current content)
   - When `quartz.diffReview.enabled` is false, keep the existing `externalChange` behavior
2. Create notification banner component in `src/webview/components/ExternalChangeBanner.tsx`:
   - Renders at the top of the editor when `pendingExternalChange` is set
   - Three buttons: "View Changes" | "Accept" | "Dismiss"
   - Styled to be noticeable but not obtrusive (similar to VS Code's info bars)
3. In `App.tsx`:
   - Handle `externalChangeAvailable` message: set `pendingExternalChange` state
   - "Accept" → apply content via `setContent` + send `applyExternalChange` message
   - "Dismiss" → clear `pendingExternalChange` + send `dismissExternalChange` message
   - "View Changes" → compute diff between current content and pending content, enter split-view with `source: 'external'`
4. In `DiffReviewBar.tsx`:
   - When `source === 'external'`, show "Apply" and "Dismiss" buttons instead of "Close Diff"
   - "Apply" → serialize right panel content, send to extension host, exit diff view
   - "Dismiss" → restore old content, exit diff view

### Files to Modify
- `src/QuartzEditorProvider.ts` — change external change message flow
- `src/webview/App.tsx` — notification state, external change handling
- `src/webview/components/DiffReviewBar.tsx` — external change mode buttons

### Files to Create
- `src/webview/components/ExternalChangeBanner.tsx`

### Key Considerations
- The current external change flow uses `suppressUpdateRef` to prevent feedback loops. The new flow needs similar protection when applying external changes.
- When "View Changes" is clicked, the left panel shows the current editor content and the right panel shows the incoming external content. This is the opposite of the git diff (where left = old/HEAD, right = current). Make sure the diff is computed in the right direction.
- If the user is already in a git diff view when an external change arrives, queue the notification until the diff view is closed.
- The `isApplyingWebviewEdit` guard in `QuartzEditorProvider.ts` needs to work correctly with the new apply flow.

## Tests Required

### Unit Tests
- [ ] ExternalChangeBanner renders three buttons with correct labels
- [ ] ExternalChangeBanner callbacks fire correctly for each button

### E2E Tests (`test/e2e/specs/diff-view.spec.ts` — external change subset)
- [ ] External change triggers notification banner (not silent replace)
- [ ] "Accept" on notification applies content immediately
- [ ] "Dismiss" on notification keeps old content
- [ ] "View Changes" opens split view with correct old/new content
- [ ] "Apply" in split view applies right panel content
- [ ] "Dismiss" in split view keeps old content
- [ ] Rapid external changes update the pending content

### Manual Testing
- [ ] Open a .md file in Quartz, edit it externally (e.g., with another editor or `echo >> file.md`)
- [ ] Notification banner appears within ~500ms
- [ ] "View Changes" → split view shows correct diff
- [ ] Edit right panel, click "Apply" → content includes edits
- [ ] "Dismiss" → original content preserved
- [ ] "Accept" (fast path) → new content applied, no split view
- [ ] Disable `quartz.diffReview.enabled` → silent replace behavior (backward compatible)

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit and E2E tests written and passing
- [ ] `npm test` and `npm run test:e2e` pass with no regressions
- [ ] Backward compatibility verified (feature flag off → old behavior)
- [ ] Human review of notification UX completed
