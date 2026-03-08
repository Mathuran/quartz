# [002] Split-View UI and Diff Decorations

## Metadata
- **Status:** DONE
- **Depends On:** 001
- **Blocks:** 003, 004
- **Scope:** M
- **Design Doc:** [block-level-diff-review](../../design-docs/block-level-diff-review.md)

## Description

Build the split-view diff UI: a two-panel layout with a read-only left editor (old version), an editable right editor (new version), diff highlight decorations using VS Code's built-in diff colors, placeholder rows with dashed borders and labels, synchronized scrolling, and a DiffReviewBar toolbar.

This issue delivers the visual components without wiring them to git or external changes — it can be tested by passing hardcoded old/new content in the E2E harness.

## Acceptance Criteria

- [ ] `DiffSplitView.tsx` renders two TipTap editor instances side-by-side in a 50/50 split
- [ ] Left panel is `editable: false` (read-only), right panel is fully editable
- [ ] Diff decoration ProseMirror plugin highlights blocks:
  - Added blocks: green background + left green border (VS Code `diffEditor.insertedTextBackground`)
  - Removed blocks: red background + left red border (VS Code `diffEditor.removedTextBackground`)
  - Modified blocks: amber background + left amber border on both sides
- [ ] Placeholder rows render with dashed border and descriptive label (e.g., "block added in new version")
- [ ] Synchronized scrolling: scrolling one panel scrolls the other to keep aligned blocks in view
- [ ] `DiffReviewBar.tsx` shows change summary, Prev/Next navigation, and a close button
- [ ] Prev/Next navigation scrolls to the next/previous changed block
- [ ] Right panel editing works normally during diff view (typing, formatting, etc.)
- [ ] "Close Diff" collapses back to the normal single-editor view
- [ ] All existing tests still pass (no regressions)

## Human Review Focus

- **Look at:** Visual design of the split view — do the diff colors look right? Are placeholders clear? Does the layout feel balanced?
- **Test:** Open the E2E harness with a hardcoded diff, scroll both panels, edit the right panel, click Prev/Next, click Close Diff
- **Decide:** Any visual adjustments needed before wiring to git?

## Agent Autonomy Notes

- **Agent can decide:** Component structure, CSS class naming, decoration priority ordering, scroll sync throttle timing, toolbar layout details
- **Escalate to human:** If VS Code diff CSS custom properties aren't accessible in the webview (may need fallback colors), if synchronized scrolling has significant jank on large documents

## Technical Notes

### Suggested Approach
1. Create `src/webview/components/DiffSplitView.tsx`:
   - Accepts `oldDoc: JSONContent`, `newDoc: JSONContent`, `diffs: BlockDiff[]`, `alignedRows: AlignedRow[]`
   - Renders two `<EditorContent>` components side-by-side
   - Left editor: `editable: false`, loaded with `oldDoc`
   - Right editor: reuses the existing editor instance or creates a new editable one with `newDoc`
   - Manages scroll sync between the two panels
2. Create `src/webview/extensions/diffDecorationExtension.ts`:
   - ProseMirror plugin that adds `Decoration.node()` to changed blocks
   - Takes `BlockDiff[]` and panel side ('left' | 'right') as config
   - Maps block indices to ProseMirror positions for decoration targeting
3. Create `src/webview/components/DiffReviewBar.tsx`:
   - Props: `summary: DiffResult['summary']`, `currentIndex`, `onPrev`, `onNext`, `onClose`, `sourceLabel: string`
   - Renders: "3 added, 1 removed, 2 modified vs HEAD" | [◄ Prev] [Next ►] | [Close Diff]
4. Create `src/webview/styles/diffReview.css`:
   - Split layout with CSS Grid or Flexbox, 50/50
   - Diff highlight classes using VS Code CSS custom properties (`--vscode-diffEditor-insertedTextBackground`, etc.)
   - Placeholder row styles: dashed border, muted text label, matching height estimation
   - Gutter/splitter styling
5. Implement synchronized scrolling in `DiffSplitView.tsx`:
   - Attach scroll listeners to both panels
   - Use `requestAnimationFrame` to throttle
   - Align by row index from `AlignedRow[]`, not pixel position

### Files to Create
- `src/webview/components/DiffSplitView.tsx`
- `src/webview/components/DiffReviewBar.tsx`
- `src/webview/extensions/diffDecorationExtension.ts`
- `src/webview/styles/diffReview.css`

### Key Considerations
- VS Code webviews have access to CSS custom properties like `--vscode-diffEditor-insertedTextBackground`. If these aren't available, fall back to hardcoded colors that match the VS Code dark/light themes.
- The left panel must render all Quartz extensions (callouts, code blocks, etc.) in read-only mode — it's a full TipTap instance, not a simplified renderer.
- Placeholder rows need to approximately match the height of the real block on the opposite side for alignment. This is imprecise — use a reasonable estimate or observe DOM after render.
- The decoration plugin needs to map from `BlockDiff[].oldIndex` / `.newIndex` to ProseMirror document positions. Walk the document to find the Nth top-level node position.

## Tests Required

### Unit Tests
- [ ] DiffReviewBar renders correct summary text for various diff counts
- [ ] DiffReviewBar Prev/Next callbacks fire with correct indices
- [ ] Diff decoration extension produces correct decoration positions for a known diff

### E2E Tests (`test/e2e/specs/diff-view.spec.ts` — subset)
- [ ] Split view renders two panels with correct content
- [ ] Left panel is not editable (typing does nothing)
- [ ] Right panel is editable (typing works)
- [ ] Added blocks have green background on right, placeholder on left
- [ ] Removed blocks have red background on left, placeholder on right
- [ ] Modified blocks have amber background on both sides
- [ ] Close button collapses to single editor
- [ ] Prev/Next navigation scrolls to changed blocks

### Manual Testing
- [ ] Open split view with a hardcoded diff in the E2E harness
- [ ] Verify diff colors match VS Code's diff editor colors
- [ ] Verify placeholder labels are readable
- [ ] Scroll both panels — sync feels smooth
- [ ] Edit right panel — no crashes, decorations stay

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit and E2E tests written and passing
- [ ] `npm test` and `npm run test:e2e` pass with no regressions
- [ ] Human review of visual design completed
