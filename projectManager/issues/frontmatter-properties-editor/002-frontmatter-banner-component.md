# [002] FrontmatterBanner Component and Two-Way Sync

## Metadata
- **Status:** DONE
- **Depends On:** 001
- **Blocks:** 003
- **Scope:** M
- **Design Doc:** [frontmatter-properties-editor](../../design-docs/frontmatter-properties-editor.md)

## Description

Create the `FrontmatterBanner` React component — a collapsible banner rendered above the TipTap editor content. The banner displays raw YAML in a styled `<textarea>` with monospace font and VS Code theme-aware styling. Implement two-way sync: banner edits update the file, external file changes update the banner. Include collapse/expand with state persistence.

## Acceptance Criteria

- [ ] `FrontmatterBanner` component renders above `EditorContent` in `Editor.tsx`
- [ ] Banner displays raw YAML in an auto-growing `<textarea>` with monospace font
- [ ] Banner has distinct visual styling: left border accent, subtle background tint, "Frontmatter" header
- [ ] Collapse/expand toggle in the header (chevron icon)
- [ ] Collapsed state shows "Frontmatter (N properties)" count
- [ ] Collapse state persists via `vscode.getState()` / `vscode.setState()`
- [ ] Editing YAML in textarea syncs to the file (debounced 300ms)
- [ ] External file changes update the banner content
- [ ] No edit loop (uses `suppressUpdateRef` pattern)
- [ ] Banner hidden when file has no frontmatter
- [ ] "+ Add frontmatter" link shown for files without frontmatter
- [ ] Clicking "+ Add frontmatter" initializes empty `---\n---` and opens the banner
- [ ] Works in both light and dark VS Code themes

## Human Review Focus

- **Look at:** Visual appearance of the banner in light and dark themes. Textarea sizing and font.
- **Test:** Open a file with frontmatter — verify banner shows. Edit YAML in the textarea, save, reopen — verify changes persisted. Test collapse/expand. Open a file without frontmatter — verify "+ Add frontmatter" link.
- **Decide:** Does the banner look good? Is the textarea comfortable to edit YAML in?

## Agent Autonomy Notes

- **Agent can decide:** Exact CSS styling, textarea auto-grow implementation, how to count properties for collapsed header
- **Escalate to human:** If the textarea editing experience feels inadequate (e.g., no syntax highlighting makes it too hard to read)

## Technical Notes

### Suggested Approach
1. Create `FrontmatterBanner.tsx` with props: `frontmatter: string | null`, `onChange: (yaml: string) => void`, `onRemove: () => void`
2. Create `frontmatter.css` with VS Code theme variable styling
3. Integrate into `Editor.tsx`: manage `frontmatter` state separate from TipTap editor
4. Wire `onChange` to trigger full document save (prepend frontmatter to serialized body)
5. Wire external changes to update `frontmatter` state
6. Add collapse state persistence via webview state API
7. Property count: simple line count of `/^\w+:/` matches for the collapsed header

### Files to Create
- `src/webview/components/FrontmatterBanner.tsx`
- `src/webview/styles/frontmatter.css`

### Files to Modify
- `src/webview/Editor.tsx` — add frontmatter state, render `FrontmatterBanner`, update sync logic
- `src/webview/App.tsx` — update content parsing to use `ParseResult`

### Key Considerations
- Use `suppressUpdateRef` to prevent edit loops between banner and file
- Textarea auto-grow: set `rows` based on newline count, or use CSS `field-sizing: content` where supported
- Debounce `onChange` at 300ms to match editor debounce
- The "+ Add frontmatter" link should be subtle — don't clutter the UI when no frontmatter exists

## Tests Required

### E2E Tests (`test/e2e/specs/frontmatter-banner.spec.ts`)
- [ ] Banner appears when file has frontmatter
- [ ] Banner hidden when file has no frontmatter
- [ ] Collapse/expand toggle works
- [ ] Edit YAML in textarea — verify file output
- [ ] "+ Add frontmatter" creates empty frontmatter block
- [ ] External file change updates banner

## Definition of Done

- [ ] All acceptance criteria met
- [ ] E2E tests written and passing
- [ ] Human visual review passed (light + dark themes)
- [ ] No regressions in existing editor behavior
