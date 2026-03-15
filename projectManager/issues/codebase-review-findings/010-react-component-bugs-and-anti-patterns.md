# [010] React Component Bugs and Anti-Patterns

## Metadata
- **Status:** DONE
- **Depends On:** 009
- **Blocks:** —
- **Scope:** M
- **Design Doc:** [codebase-review-findings](../../design-docs/codebase-review-findings.md)

## Description

Multiple React components have bugs and anti-patterns: `setState` inside `useMemo` (SlashMenu), broken frontmatter persistence (`window.vscodeApi` never set), non-functional link button, wasted transactions in SearchBar, stale state after replacements, missing `editor.isDestroyed` guards, extension instances recreated on render, missing error handling, and accessibility gaps.

**Findings:** 4.5, 4.6, 4.7, 4.10, 4.11, 4.12, 4.13, 4.14, 4.15, 4.16, 4.17, 4.18, 4.19, 4.20, 4.23, 4.24, 4.28, 4.29, 4.30, 4.31, 4.32, 4.33

## Acceptance Criteria

- [x] **SlashMenu:** `setSelectedIndex(0)` moved from `useMemo` to `useEffect` (or computed as derived state)
- [x] **FrontmatterBanner:** `window.vscodeApi` properly set in `App.tsx`, or vscode API passed via props/context — collapsed-state persistence works
- [x] **FormattingToolbar:** Link button wired up — either `onLinkClick` prop passed from `Editor.tsx` or `LinkDialog` integrated
- [x] **SearchBar `replaceAll`:** Single transaction built (check replacement before building); no wasted intermediate transaction
- [x] **SearchBar `replaceCurrent`:** Stale matches invalidated after replacement; `editor.isDestroyed` checked before dispatching
- [x] **DiffSplitView:** Extension arrays memoized with `useMemo`; redundant ternary on `diff.newBlock!` fixed
- [ ] **SlashMenu image command:** `window.prompt` replaced with proper dialog (or at minimum, URL validated)
- [x] **FormattingToolbar:** `shouldShow` callback memoized with `useCallback`
- [x] **LinkDialog:** Click-outside effect cleanup handles timeout correctly
- [x] **TableOfContents:** Selected index resets when content changes (not just length)
- [x] **CodeBlockNodeView:** `clipboard.writeText` has `.catch()` handler; `setTimeout` cleaned up on unmount
- [x] **CalloutNodeView:** Fold button has `aria-expanded` attribute
- [x] **ExternalChangeBanner:** Has `role="alert"` or `aria-live` attribute

## Human Review Focus

- **Look at:** The SlashMenu `useMemo` → `useEffect` change — ensure no flicker when query changes
- **Test:** Click the link button in the formatting toolbar — verify it opens a dialog
- **Test:** Open a file with frontmatter, collapse it, reopen — verify collapsed state persists
- **Decide:** Whether to build a proper image URL dialog or just validate the `window.prompt` result

## Agent Autonomy Notes

- **Agent can decide:** Implementation details for each fix, whether to use context or props for vscode API
- **Escalate to human:** Whether to build an ImageDialog component (significant new UI) or just validate the prompt result (quick fix)

## Technical Notes

### Suggested Approach
1. **SlashMenu:** Replace `useMemo` side-effect with `useEffect(() => setSelectedIndex(0), [query])`
2. **FrontmatterBanner:** In `App.tsx`, assign `(window as any).vscodeApi = vscode` after `acquireVsCodeApi()`, or better: create a React context for the vscode API
3. **FormattingToolbar link:** Pass `onLinkClick` prop from `Editor.tsx` that opens `LinkDialog`
4. **SearchBar:** Consolidate to single transaction path with `replacement ? tr.replaceWith(...) : tr.delete(...)`
5. **SearchBar stale matches:** Clear matches immediately after replacement, re-search in the same tick
6. **DiffSplitView:** `useMemo` for extension arrays keyed on diff maps
7. **CodeBlockNodeView clipboard:** Add `.catch(console.warn)`, store timeout ID in ref for cleanup
8. **ARIA:** Add `aria-expanded` to callout fold, `role="alert"` to external change banner

### Files to Modify
- `src/webview/components/SlashMenu.tsx`
- `src/webview/components/FrontmatterBanner.tsx`
- `src/webview/components/FormattingToolbar.tsx`
- `src/webview/components/SearchBar.tsx`
- `src/webview/components/DiffSplitView.tsx`
- `src/webview/components/LinkDialog.tsx`
- `src/webview/components/TableOfContents.tsx`
- `src/webview/components/CodeBlockNodeView.tsx`
- `src/webview/components/CalloutNodeView.tsx`
- `src/webview/components/ExternalChangeBanner.tsx`
- `src/webview/App.tsx` (vscode API exposure)
- `src/webview/Editor.tsx` (link button integration)

### Key Considerations
- The frontmatter persistence fix is a user-visible bug — collapsed state is lost on every reload
- The link button being non-functional means users can't add links via the toolbar — significant UX gap
- ARIA fixes are low-effort, high-accessibility-impact

## Tests Required

### Unit Tests
- [ ] SlashMenu: `selectedIndex` resets to 0 when `query` changes
- [ ] SearchBar: `replaceAll` with empty replacement uses `tr.delete` (no wasted transaction)
- [ ] SearchBar: matches invalidated after `replaceCurrent`

### E2E Tests
- [ ] Frontmatter banner: collapse → close → reopen → still collapsed
- [ ] Link button: click → dialog opens → enter URL → link applied
- [ ] Callout fold button: has `aria-expanded="true"` when expanded

### Manual Testing
- [ ] Search and replace all occurrences — verify all are replaced correctly
- [ ] Copy code block content — verify clipboard works (check browser console for errors)
- [ ] Screen reader: navigate to callout — verify fold state is announced

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Human review completed (see Human Review Focus above)
- [ ] No regressions in component behavior
