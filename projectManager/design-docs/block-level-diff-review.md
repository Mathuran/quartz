# Block-Level Diff Review Design Document

**Author:** Quartz Team
**Status:** IMPLEMENTED
**Created:** 2026-03-02
**Last Updated:** 2026-03-02 (rev 3)
**Reviewers:** —

---

## 1. Problem Statement

Quartz renders markdown as WYSIWYG blocks, but when a user wants to review what changed in their file — after an AI agent edit, a `git pull`, or their own work before committing — they have to leave Quartz entirely and use a separate text-based diff tool. VS Code's built-in diff editor shows raw markdown lines, not the rendered blocks the user was just editing. There is no way to review changes in the same WYSIWYG context where the content was authored.

This is the primary gap: **Quartz has no git diff viewer.** Users cannot compare their working copy against HEAD, review staged changes, or see what an AI agent modified — all within the rich block-based editor they use for writing.

A secondary problem exists with external changes: when an AI agent or another process modifies the file while Quartz has it open, the editor silently replaces content with no review opportunity. This is a narrower issue that the same diff viewing infrastructure can solve.

## 2. Goals and Non-Goals

### Goals

- **P0:** Integration with VS Code's Git extension API — view working-tree-vs-HEAD diff directly in Quartz's WYSIWYG editor
- **P0:** Compute block-level structural diffs between two versions of a document using a custom LCS-based algorithm on JSONContent block arrays
- **P0:** Split-view diff layout — read-only old version (left) and editable current version (right) — with synchronized scrolling and block alignment
- **P0:** Diff highlighting on both panels using VS Code's built-in diff colors — additions (green), deletions (red), modifications (amber) — at the block level
- **P0:** The right panel is fully editable during diff viewing, so users can fix issues they spot while reviewing
- **P0:** Toolbar with change summary, Prev/Next navigation, and "Close Diff" to exit
- **P1:** "Review Changes" notification when external changes are detected, allowing the user to open a diff view before content is replaced
- **P1:** Keyboard shortcuts for navigating between diff blocks (e.g., `]c` next change, `[c` previous)
- **P2:** Diff viewing for frontmatter changes (show YAML key-value diffs in a header section)
- **P2:** Per-block "revert to old" button on the right panel for quick single-block rollback

### Non-Goals

- **Merge conflict resolution** — this is a diff viewer, not a merge tool. It shows what changed between two versions; it does not resolve conflicting concurrent edits.
- Character-level or word-level inline diffs within a single block (block-level granularity is sufficient for v1)
- Three-way merge
- Diff view for local undo/redo history
- Move detection (a moved block shows as delete + add, not as a "moved" operation)
- Git commit history browsing or blame integration
- Persisting diff view state across editor sessions

## 3. Background and Context

### Current Architecture

Quartz uses a message-passing architecture between the VS Code extension host and a React/TipTap webview:

```
VS Code Extension Host              Webview (React + TipTap)
┌──────────────────────────┐        ┌────────────────────────────┐
│ QuartzEditorProvider.ts  │        │ App.tsx → Editor.tsx        │
│  - File change detection │◄─msg──►│  - parseMarkdown() → JSON  │
│  - isApplyingWebviewEdit │        │  - setContent (no undo)    │
│  - 300ms debounce        │        │  - serializeMarkdown()     │
└──────────────────────────┘        └────────────────────────────┘
```

**External change flow today:**
1. `onDidChangeTextDocument` fires (filtered to exclude self-edits via `isApplyingWebviewEdit` flag)
2. Debounced 300ms, then sends `externalChange` message with full document text
3. `App.tsx` updates `content` state, suppresses outbound updates for 500ms
4. `Editor.tsx` effect parses new content and calls `setContent` with `addToHistory: false`
5. Old content is silently replaced — no diff, no review, no user control

**No git integration exists** in the current codebase. The extension has no dependency on `simple-git` or VS Code's Git extension API.

### Prior Art

- **VS Code Built-in Diff Editor:** Split-view with old (left, read-only) and new (right, editable). Line-level highlights. The primary inspiration for this feature's UX — but adapted to WYSIWYG blocks instead of text lines.
- **GitHub PR Review:** Per-hunk diff rendering with inline highlights. Familiar to developers.
- **Google Docs Suggested Edits:** Inline highlights with accept/reject per suggestion. Too complex for our needs (requires suggestion/comment system).

### Technical Foundation

- TipTap's JSONContent is already block-structured — each top-level node in `doc.content` is a block (paragraph, heading, bulletList, codeBlock, callout, etc.)
- The parser (`src/markdown/parser.ts`) and serializer (`src/markdown/serializer.ts`) enable round-tripping between markdown text and JSONContent
- Two TipTap editor instances can coexist in a single webview (one read-only for old, one editable for new)

## 4. Proposed Solution

### Overview

A **WYSIWYG git diff viewer** built into Quartz. The user triggers it from the command palette or toolbar, and the editor enters a split-view layout inspired by VS Code's built-in diff editor — but rendering blocks instead of text lines:

- **Left panel:** Read-only rendering of the old version (e.g., content at HEAD), with diff highlights (red for deleted blocks, amber for modified blocks)
- **Right panel:** The current working copy, fully editable, with diff highlights (green for added blocks, amber for modified blocks)
- **Synchronized scrolling:** Both panels scroll together, with changed blocks aligned side-by-side
- **Direct editing:** The right panel is the user's working file — they can fix issues they spot while reviewing, just like editing in VS Code's diff editor

This is a **viewer**, not a merge tool. It answers "what changed?" and lets the user edit their working copy while seeing the comparison. There is no accept/reject workflow — the right panel is already the current state of the file.

**Primary trigger: Git diff viewing**
1. **Command palette:** `Quartz: View Git Changes` — compares working tree vs HEAD
2. **Editor toolbar button:** Git diff icon

**Secondary trigger: External change review**
3. **Notification banner** — when an external change is detected, user can open a diff view to see what changed before the content is applied

### Architecture

```
                    ┌─────────────────────────────┐
                    │     Diff Trigger Layer       │
                    │  ┌───────────┐ ┌───────────┐ │
                    │  │   Git     │ │ External  │ │
                    │  │   Diff    │ │ Change    │ │
                    │  │ (primary) │ │(secondary)│ │
                    │  └─────┬─────┘ └─────┬─────┘ │
                    └────────┼─────────────┼───────┘
                             │             │
                             ▼             ▼
                    ┌─────────────────────────────┐
                    │     Diff Engine              │
                    │  oldDoc (JSONContent)        │
                    │  newDoc (JSONContent)        │
                    │  → BlockDiff[]               │
                    │  (custom LCS block diff)     │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────────────┐
                    │           Split-View Diff UI            │
                    │  ┌─────────────┐  ┌─────────────────┐  │
                    │  │ Left Panel  │  │ Right Panel      │  │
                    │  │ (read-only) │  │ (editable)       │  │
                    │  │ Old version │  │ New version      │  │
                    │  │ Red/amber   │  │ Green/amber      │  │
                    │  │ highlights  │  │ highlights       │  │
                    │  └─────────────┘  └─────────────────┘  │
                    │  ┌─────────────────────────────────┐   │
                    │  │ DiffReviewBar (toolbar)          │   │
                    │  │ [◄ Prev] [Next ►] [Done Review] │   │
                    │  └─────────────────────────────────┘   │
                    └──────────────────┬──────────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────┐
                    │     Exit Diff View             │
                    │  "Close Diff" clicked          │
                    │  → Collapse to single editor   │
                    │  → Right panel is the file     │
                    │    (always was — no merge)     │
                    └─────────────────────────────┘
```

### Diff Engine

**Algorithm: Custom LCS-Based Block Diff**

The diff engine compares two parsed `JSONContent` documents at the block level using Longest Common Subsequence (LCS) with deep structural equality.

```typescript
interface BlockDiff {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  oldBlock?: JSONContent;     // Present for 'removed', 'modified', 'unchanged'
  newBlock?: JSONContent;     // Present for 'added', 'modified', 'unchanged'
  oldIndex?: number;          // Position in old document
  newIndex?: number;          // Position in new document
}

interface DiffResult {
  diffs: BlockDiff[];
  oldDoc: JSONContent;
  newDoc: JSONContent;
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
  hasFrontmatterChange: boolean;
  oldFrontmatter?: string;
  newFrontmatter?: string;
}
```

**Diff computation steps:**
1. Parse both old and new markdown into JSONContent via `parseMarkdown()`
2. Extract frontmatter separately; compare as strings for `hasFrontmatterChange`
3. Extract top-level block arrays from both documents
4. Run LCS algorithm with deep equality to find the longest common subsequence of unchanged blocks
5. Blocks not in the LCS are classified:
   - **Removed:** Block exists in old but not matched in new
   - **Added:** Block exists in new but not matched in old
   - **Modified:** Adjacent removed + added blocks with the same `type` attribute (e.g., both paragraphs) are paired as a single "modified" entry
6. Return `BlockDiff[]` in document order, including unchanged blocks (needed for alignment)

**Deep equality function:**
Two blocks are "equal" if their JSON-serialized `type`, `attrs`, and `content` match recursively. This handles nested structures (lists, blockquotes, callouts) naturally.

**Why custom LCS over `prosemirror-changeset`:**
- `prosemirror-changeset` operates on ProseMirror Steps (incremental edit operations), not on comparing two static document snapshots
- Our use case is comparing two independently-parsed documents (old file vs. new file), not tracking incremental edits
- A custom LCS on the block array is simpler, has no external dependency, and fits the use case exactly

### Split-View Diff UI

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ DiffReviewBar: "5 changes vs HEAD" │ ◄ Prev │ Next ► │ Close Diff │
├────────────────────────────┬────────────────────────────────────┤
│                            │                                    │
│   LEFT PANEL (read-only)   │   RIGHT PANEL (editable)          │
│   Old version at HEAD      │   New version (working copy)      │
│                            │                                    │
│   ┌──────────────────┐     │   ┌──────────────────────┐        │
│   │ # Introduction   │     │   │ # Introduction       │        │
│   └──────────────────┘     │   └──────────────────────┘        │
│   ┌──────────────────┐     │   ┌──────────────────────┐        │
│   │ Old paragraph    │ RED │   │ New paragraph    │ GREEN      │
│   └──────────────────┘     │   └──────────────────────┘        │
│   ┌──────────────────┐     │   ┌──────────────────────┐        │
│   │ Modified text  │ AMBER │   │ Modified text v2 │ AMBER      │
│   └──────────────────┘     │   └──────────────────────┘        │
│                            │   ┌──────────────────────┐        │
│        (no block)          │   │ Added paragraph │ GREEN       │
│                            │   └──────────────────────┘        │
│                            │                                    │
├────────────────────────────┴────────────────────────────────────┤
│ Gutter: vertical splitter (draggable to resize panels)          │
└─────────────────────────────────────────────────────────────────┘
```

**Left Panel (Old Version):**
- A second TipTap editor instance configured as `editable: false`
- Loaded with the old document content
- ProseMirror decorations applied for diff highlights:
  - **Removed blocks:** Light red background + left red border (using VS Code's `diffEditor.removedTextBackground` color)
  - **Modified blocks (old side):** Light amber background + left amber border
  - Unchanged blocks render normally (no highlight)
- **Diff colors:** Use VS Code's built-in diff theme colors via CSS custom properties for consistency with the rest of the IDE
- Placeholder rows with dashed border and label (e.g., "block added in new version") where the new document has added blocks, for alignment

**Right Panel (New Version):**
- The existing TipTap editor instance, fully editable
- Loaded with the new document content (current working copy)
- ProseMirror decorations applied for diff highlights:
  - **Added blocks:** Light green background + left green border (using VS Code's `diffEditor.insertedTextBackground` color)
  - **Modified blocks (new side):** Light amber background + left amber border
  - Unchanged blocks render normally
- Placeholder rows with dashed border and label (e.g., "block removed from old version") where the old document has removed blocks, for alignment
- User can freely edit any content — diff highlights are decorative only, they don't restrict interaction

**Synchronized Scrolling:**
- Both panels share a scroll listener
- When one panel scrolls, the other follows to keep aligned blocks in view
- Alignment is computed from the `BlockDiff[]` array — unchanged and modified blocks are row-paired; added/removed blocks get empty placeholder rows on the opposite side

**DiffReviewBar Component:**
- Sticky toolbar above the split view
- Shows: change summary ("3 added, 1 removed, 2 modified") and source label ("vs HEAD" or "External change")
- Prev/Next navigation to jump between changed blocks
- **Git diff mode:** "Close Diff" button — collapses back to single editor
- **External change mode:** "Apply" and "Dismiss" buttons

### Git Diff Viewing (Primary Feature)

The core feature: view what changed in your markdown file compared to a git ref, rendered as WYSIWYG blocks.

**Trigger points:**
1. **Command palette:** `Quartz: View Git Changes` — compares working tree vs HEAD
2. **Editor toolbar button:** Git diff icon in the formatting toolbar

**Implementation using VS Code Git Extension API:**

```typescript
// Get the built-in git extension
const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
const git = gitExtension?.getAPI(1);

// Get the repo for the current file
const repo = git?.getRepository(document.uri);

// Get content at HEAD
const headContent = await repo?.show(`HEAD:${relativePath}`);
```

The extension host retrieves the old content from git and sends it to the webview:

```typescript
webviewPanel.webview.postMessage({
  type: 'openDiffView',
  oldContent: headContent,        // Content at git ref
  newContent: document.getText(), // Current working tree
  source: 'git',
});
```

**What happens:**
1. The webview enters split-view mode
2. Left panel shows the HEAD version (read-only)
3. Right panel shows the current working copy (editable — it's the user's actual file)
4. Diff highlights show what changed
5. User reviews, optionally edits the right panel to fix things they spot
6. "Close Diff" collapses back to the normal single-editor view
7. No "accept/reject" step — the right panel was always the working file. Any edits made during review are just normal edits.

**When no git repo is present:** The git diff commands are hidden from the command palette and toolbar. No error state.

### External Change Review (Secondary Feature)

Uses the same split-view infrastructure to let users review external changes before they're applied.

**Before (current):**
```
External change → debounce → send 'externalChange' → silent replace
```

**After:**
```
External change → debounce → notification: "File changed externally"
→ User clicks "View Changes" → split view opens (old = before, new = after)
→ User reviews, edits if needed → "Apply" commits the right panel content
→ Or "Dismiss" keeps the old content
```

Unlike the git diff flow, external change review has apply/dismiss semantics because the new content hasn't been loaded yet — the user is deciding whether to accept external modifications. However, this is still fundamentally a diff viewer with an apply step, not a merge tool.

**"Accept All" fast path:** From the notification, users can click "Accept" to immediately apply external changes without opening the diff view (preserving current behavior for users who don't need to review).

### Exiting Diff View

**Git diff mode:**
- "Close Diff" — collapses to single editor. Right panel content is the file (always was). No merge step.
- Any edits made to the right panel during review are normal file edits, saved via the existing debounce mechanism.

**External change mode:**
- "Apply" — the right panel's content (including any user edits) becomes the document. Sends `update` to extension host.
- "Dismiss" — discards the external changes. Keeps the old content.
- Closing the editor during review — right panel content is auto-saved (same as normal editing).

### New Message Types

```typescript
// Extension → Webview
{ type: 'openDiffView', oldContent: string, newContent: string, source: 'git' | 'external' }
{ type: 'externalChangeAvailable', newContent: string }  // Notification with pending content

// Webview → Extension
{ type: 'requestGitDiff' }                   // User triggered git diff from toolbar
{ type: 'applyExternalChange', content: string }  // User applied external change (from diff view or "Accept" button)
{ type: 'dismissExternalChange' }            // User dismissed external change
```

### State Management

New React state in `App.tsx`:

```typescript
interface DiffViewState {
  active: boolean;
  source: 'git' | 'external';
  diffs: BlockDiff[];
  oldDoc: JSONContent;
  newDoc: JSONContent;
  oldFrontmatter?: string;
  newFrontmatter?: string;
  currentDiffIndex: number;  // For Prev/Next navigation
}

// Pending external change notification
const [pendingExternalChange, setPendingExternalChange] = useState<string | null>(null);
```

The diff view state is transient — it does not persist across editor sessions. Closing the file or reloading the webview exits diff view.

## 5. Alternative Solutions Considered

### Alternative A: Inline Diff with Per-Block Accept/Reject

**Approach:** Show a single editor view with inline diff highlights. Each changed block has "Accept" / "Reject" buttons. User resolves changes one-by-one.

**Pros:**
- No layout change — stays in the single-editor paradigm
- Per-block granularity with explicit accept/reject controls
- Simpler to implement (no second editor instance, no synchronized scrolling)

**Cons:**
- Editing while diffs are pending becomes complex — block positions shift as diffs are resolved
- Deleted blocks need special rendering (strikethrough, collapsed sections) that clutters the view
- Less intuitive than seeing old and new side-by-side
- Accept/reject interaction model is slower than direct editing

**Why not chosen:** The split-view approach is more intuitive (matches git staging workflow), allows concurrent editing naturally, and avoids the complexity of rendering deleted content inline.

### Alternative B: Separate Projects for Git Diff and External Change Review

**Approach:** Build git diff viewing as one project and external change review as a separate project.

**Pros:**
- Smaller, more focused scope per project
- Could ship git diff viewing faster without the external change complexity

**Cons:**
- 90% code overlap — diff engine, split-view UI, decorations, synchronized scrolling are identical
- Two separate projects means duplicated infrastructure or a shared library extraction
- The external change review is a thin layer on top of the diff viewer (just adds notification + apply/dismiss)

**Why one project:** The diff engine and split-view UI are the hard parts. External change review is a ~1 review cycle addition that reuses everything. Splitting them would create redundant work. The doc is structured so Phase 1-2 deliver the standalone git diff viewer, and Phase 3 adds external change review — so the git diff viewer ships first regardless.

### Alternative C: Line-Level Text Diff (like VS Code's built-in diff)

**Approach:** Compare raw markdown text line-by-line using a standard text diff algorithm (Myers diff). Render changed lines with highlights.

**Pros:**
- Simpler implementation — well-known algorithms and libraries (`diff`, `jsdiff`)
- Works on raw text, no need for parsing

**Cons:**
- Breaks the WYSIWYG paradigm — line-level diffs don't map cleanly to rendered blocks
- A single block change (e.g., adding bold to a word) could show as a full-line replacement
- Cannot handle structural changes well (reordering list items, nesting changes)

**Why not chosen:** Quartz is a WYSIWYG editor. The diff must operate at the same level of abstraction the user sees — blocks, not text lines.

### Alternative D: Suggestion Mode (Google Docs-style)

**Approach:** Intercept external changes and convert them into "suggestions" overlaid on the document as tracked changes.

**Pros:**
- Rich interaction — suggestions can include comments and context
- Natural for collaborative editing workflows

**Cons:**
- Significantly more complex — requires a full suggestion/comment system
- Requires persistent storage of suggestions across sessions
- Overkill for the primary use case

**Why not chosen:** Too much complexity for the initial implementation. Could be built on top of the diff foundation later.

## 6. Security, Privacy, and Compliance

- **No network requests:** All diffing happens locally in the webview. No document content is sent to external services.
- **Git access:** Uses VS Code's built-in Git extension API, which inherits the user's existing git credentials and permissions. No additional authentication required.
- **Content handling:** Diff content stays in memory within the webview process. No temporary files are written to disk beyond what VS Code already does.
- **XSS prevention:** Diff rendering uses ProseMirror decorations (DOM manipulation via the editor's sanitized rendering pipeline), not raw HTML injection. Follows existing patterns from callout and code block extensions.
- **No PII concerns:** The feature operates on local files only. No telemetry or logging of document content.

## 7. Testing Strategy

### Unit Tests (Vitest)

**Diff engine tests** (`test/unit/diff-engine.test.ts`):
- Identical documents produce zero diffs (all `unchanged`)
- Single block added at end/beginning/middle → `added` type
- Single block removed from end/beginning/middle → `removed` type
- Single block modified (content change within same block type) → `modified` type
- Multiple simultaneous changes (add + remove + modify)
- Nested structure diffs (list items added/removed within a list)
- Callout content changes
- Code block language or content changes
- Empty document → non-empty document (and vice versa)
- Frontmatter-only changes detected
- Block moved from position A to B → shows as `removed` + `added` (no move detection)
- Adjacent removed + added blocks with same type → classified as `modified`
- Summary counts are accurate

**Alignment logic tests** (`test/unit/diff-alignment.test.ts`):
- Unchanged blocks align at the same row on both sides
- Added blocks get placeholder on left, real block on right
- Removed blocks get real block on left, placeholder on right
- Modified blocks align side-by-side
- Complex mix of changes produces correct row pairing

### Integration Tests

- Diff review message triggers split-view mode in webview
- Git diff command retrieves correct content from git extension
- External change notification appears (not silent replace)
- "Accept All" from notification applies changes immediately
- "Review Changes" from notification opens split view
- "Done Reviewing" collapses split view and applies right panel content
- "Cancel" collapses split view and keeps old content
- Editing right panel during review works (no crashes, decorations update)

### E2E Tests (Playwright)

**New spec:** `test/e2e/specs/diff-view.spec.ts`

**Git diff viewing (primary):**
- Git diff command opens split view comparing against HEAD
- Left panel is not editable (read-only)
- Right panel is editable
- Added blocks show green highlight on right, dashed placeholder on left
- Removed blocks show red highlight on left, dashed placeholder on right
- Modified blocks show amber highlight on both sides
- Editing a block in the right panel works normally
- "Close Diff" collapses back to single editor with right panel content
- Synchronized scrolling works
- Prev/Next navigation jumps to correct diff block

**External change review (secondary):**
- External change triggers notification banner (not silent replace)
- "View Changes" opens split view with old/new content
- "Apply" exits split view and applies new content
- "Dismiss" exits split view and keeps old content
- "Accept" on notification applies immediately without opening split view

### Manual QA Checklist

- [ ] `Quartz: View Git Changes` → split view opens with correct HEAD vs working copy
- [ ] Left panel is read-only, right panel is editable
- [ ] Diff highlights match VS Code's built-in diff colors
- [ ] Placeholder rows show dashed border with descriptive label
- [ ] Edit content in right panel during diff view → no crashes, decorations persist
- [ ] "Close Diff" → single editor with current file content
- [ ] Synchronized scrolling between panels
- [ ] Prev/Next navigation jumps between changed blocks
- [ ] No git repo → git diff commands hidden gracefully
- [ ] Performance with large documents (100+ blocks)
- [ ] External change: notification → "View Changes" → split view → apply/dismiss
- [ ] External change: notification → "Accept" → immediate apply (fast path)

## 8. Rollout Plan

### Phase 1: Diff Engine (Scope: S — 1 review cycle)

**Agent delivers:**
- `src/webview/diff/diffEngine.ts` — LCS-based block diff computation
- `src/webview/diff/types.ts` — TypeScript interfaces for BlockDiff, DiffResult
- `src/webview/diff/alignment.ts` — Row alignment logic for split-view pairing
- 30+ unit tests covering all block types, edge cases, and alignment
- All tests passing

**Human reviews:**
- Test coverage adequacy — are real-world edit patterns covered?
- Diff algorithm correctness on sample documents
- Alignment logic produces sensible pairings

**Approved when:** Human confirms diff output matches expectations for 3+ real-world examples

### Phase 2: Split-View UI + Git Integration (Scope: L — 2 review cycles)

This is the core deliverable: the split-view diff viewer wired up to git.

**Agent delivers:**
- `src/webview/components/DiffSplitView.tsx` — split-view container with two TipTap editors
- `src/webview/components/DiffReviewBar.tsx` — toolbar with change summary, navigation, close button
- `src/webview/extensions/diffDecorationExtension.ts` — ProseMirror decoration plugin for diff highlights (using VS Code diff colors)
- `src/webview/styles/diffReview.css` — CSS for split layout, placeholder rows (dashed border + label), gutter, 50/50 split
- Synchronized scrolling implementation
- Git extension API integration in `QuartzEditorProvider.ts`
- `Quartz: View Git Changes` command registered in `package.json`
- Toolbar button for git diff trigger
- E2E tests for git diff → split view → editing → close flow
- Integration tests with VS Code git extension

**Human reviews:**
- Visual design of split view, diff highlights, placeholder rows
- Synchronized scrolling feel
- Right panel editing experience during diff view
- Git diff accuracy against real repository changes
- Behavior when no git repo is present (graceful degradation)

**Approved when:** Human tests git diff view on a real repository and confirms UX matches expectations

### Phase 3: External Change Review (Scope: S — 1 review cycle)

Secondary feature: reuse the split-view infrastructure for external change review.

**Agent delivers:**
- Modified `QuartzEditorProvider.ts` — sends `externalChangeAvailable` notification instead of `externalChange`
- Modified `App.tsx` — handles notification banner, "View Changes" / "Accept" flow
- Notification banner component with "View Changes" | "Accept" | "Dismiss" buttons
- E2E tests for external change → notification → split view flow
- All existing tests still passing (no regressions)

**Human reviews:**
- End-to-end flow: edit file externally → notification → view changes → apply/dismiss
- "Accept" fast path works
- No regressions in normal editing workflow

**Approved when:** Human manually tests external change review flow and confirms it works

### Feature Flag

```json
"quartz.diffReview.enabled": {
  "type": "boolean",
  "default": true,
  "description": "Enable block-level diff viewer for git changes and external change review"
}
```

When disabled, external changes use the current silent-replace behavior, and git diff commands are hidden.

### Rollback Plan

If issues are discovered post-release:
1. Users can disable via `quartz.diffReview.enabled: false`
2. The extension falls back to the current `externalChange` silent-replace flow
3. No data migration needed — diff state is entirely transient

## 9. Human Validation Plan

| Checkpoint | Agent Produces | Human Validates | Blocks |
|---|---|---|---|
| Diff algorithm + alignment | Implementation + 30+ tests | Correctness on real-world examples; alignment sanity | Phase 2 |
| Split-view UI + git diff | Two-panel layout + decorations + git integration + screenshot | Look and feel, scroll sync, editing during diff, git accuracy | Phase 3 |
| External change review | Notification flow + E2E tests | End-to-end workflow correctness | Release |

**All blocking design decisions have been resolved** (see Resolved Questions in Section 11):
- Diff colors: VS Code's built-in diff colors
- Panel split: 50/50
- Placeholders: dashed border with label
- Diff algorithm: custom LCS
- Editing during diff: fully allowed (right panel is the working file)

## 10. Dependencies and Risks

### Dependencies

- **No new npm dependencies** — diff engine is custom LCS implementation
- **VS Code Git Extension API** (`vscode.git`) — available in all VS Code installations with git support; only needed for Phase 4
- **`ai-agent-compatibility` feature** — already implemented, provides external change detection

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Two TipTap editor instances cause performance issues (memory, rendering) | High | Medium | Profile memory usage; lazy-mount left panel only when diff review is active; destroy on exit |
| Synchronized scrolling is janky or misaligned | Medium | Medium | Use `requestAnimationFrame` throttling; align by block index, not pixel position; test on large documents |
| Diff decorations conflict with existing editor decorations (code highlighting, callout styles) | Medium | Medium | Use decoration priority system (`DecorationSet` ordering); test with all block types |
| Performance degradation on large documents (500+ blocks) | Medium | Low | LCS is O(n*m) worst case; add early-exit for identical documents; run diff computation async if needed |
| Git extension API not available (user doesn't have git) | Low | Low | Graceful degradation — git trigger points hidden; external change review still works |
| Rapid sequential external changes while review is open | Medium | Medium | Queue changes; show notification "New changes available" with option to re-diff |
| Right panel edits during review make diff decorations stale | Medium | High | Decorations are computed once on entry and are purely visual hints; they don't affect editing. Accept staleness for v1; re-diff on demand as P2. |

## 11. Open Questions

*All open questions resolved.*

**Resolved Questions:**
| # | Question | Resolution |
|---|---|---|
| R1 | Editing during diff view — block edits, auto-accept, or allow concurrent? | **Allow concurrent edits.** Right panel is fully editable. Split-view model makes this natural. |
| R2 | Move detection for blocks? | **No move detection in v1.** Moves show as delete + add. Simpler algorithm, covers 90% of cases. |
| R3 | `prosemirror-changeset` vs. custom diff? | **Custom LCS block diff.** `prosemirror-changeset` operates on Steps (incremental edits), not static document snapshots. Custom LCS fits the use case with no external dependency. |
| R4 | Inline diff vs. split view? | **Split view.** Matches the git diff workflow the user expects. Old is read-only on left, new is editable on right. |
| R5 | Diff highlight colors — custom or match VS Code? | **Match VS Code's built-in diff colors** (`diffEditor.insertedTextBackground`, `diffEditor.removedTextBackground`) for consistency. |
| R6 | Panel split ratio? | **50/50 default.** |
| R7 | Placeholder row rendering? | **Dashed border with label** (e.g., "block added in new version"). |
| R8 | Live vs static diff decorations during right-panel editing? | **Static.** Decorations computed once on open. Simpler, appropriate for a viewer. |
| R9 | Git diff: HEAD only or allow selecting refs? | **HEAD only for v1.** Ref selection is a future enhancement. |

## 12. Implementation Issues

| # | Title | Status | Scope |
|---|-------|--------|-------|
| [001](../issues/block-level-diff-review/001-diff-engine-and-alignment.md) | Diff Engine and Alignment Logic | TODO | S |
| [002](../issues/block-level-diff-review/002-split-view-ui-and-decorations.md) | Split-View UI and Diff Decorations | TODO | M |
| [003](../issues/block-level-diff-review/003-git-integration.md) | Git Integration and End-to-End Wiring | TODO | M |
| [004](../issues/block-level-diff-review/004-external-change-review.md) | External Change Review | TODO | S |

**Progress:** 0/4 issues complete (0%)

## 13. Appendix

### A. Block Types Requiring Diff Support

| Block Type | TipTap Node | Nested Content? | Diff Complexity |
|---|---|---|---|
| Paragraph | `paragraph` | No (inline only) | Low |
| Heading | `heading` | No (inline only) | Low |
| Bullet List | `bulletList` | Yes (nested items) | Medium |
| Ordered List | `orderedList` | Yes (nested items) | Medium |
| Task List | `taskList` | Yes (nested items) | Medium |
| Code Block | `codeBlock` | No (text only) | Low |
| Blockquote | `blockquote` | Yes (nested blocks) | Medium |
| Callout | `callout` | Yes (nested blocks) | Medium |
| Table | `table` | Yes (rows/cells) | High |
| Image | `image` | No | Low |
| Horizontal Rule | `horizontalRule` | No | Low |

### B. Example Diff Scenarios

**Scenario 1: AI agent rewrites a paragraph**
```
LEFT (old, read-only)              RIGHT (new, editable)
┌─────────────────────────┐       ┌──────────────────────────────┐
│ # Introduction          │       │ # Introduction               │
├─────────────────────────┤       ├──────────────────────────────┤
│ The system uses a       │ AMBER │ The system leverages a       │ AMBER
│ simple cache.           │       │ distributed Redis-backed     │
│                         │       │ caching layer for optimal    │
│                         │       │ performance.                 │
├─────────────────────────┤       ├──────────────────────────────┤
│ Next paragraph...       │       │ Next paragraph...            │
└─────────────────────────┘       └──────────────────────────────┘
```

**Scenario 2: AI agent adds a new section**
```
LEFT (old, read-only)              RIGHT (new, editable)
┌─────────────────────────┐       ┌──────────────────────────────┐
│ Paragraph 3             │       │ Paragraph 3                  │
├─────────────────────────┤       ├──────────────────────────────┤
│                         │       │ ## New Section          │ GREEN
│     (placeholder)       │       │ Added paragraph 1       │ GREEN
│                         │       │ Added paragraph 2       │ GREEN
└─────────────────────────┘       └──────────────────────────────┘
```

**Scenario 3: AI agent removes a warning callout**
```
LEFT (old, read-only)              RIGHT (new, editable)
┌─────────────────────────┐       ┌──────────────────────────────┐
│ Paragraph 1             │       │ Paragraph 1                  │
├─────────────────────────┤       ├──────────────────────────────┤
│ ⚠️ Warning: Do not     │ RED   │                              │
│ do this in production   │       │     (placeholder)            │
├─────────────────────────┤       ├──────────────────────────────┤
│ Paragraph 2             │       │ Paragraph 2                  │
└─────────────────────────┘       └──────────────────────────────┘
```

### C. Synchronized Scrolling Algorithm

```typescript
// Simplified scroll sync logic
function syncScroll(sourcePanel: 'left' | 'right', scrollTop: number) {
  // Find which aligned row is at the scroll position in the source
  const sourceRows = sourcePanel === 'left' ? leftRows : rightRows;
  const targetRows = sourcePanel === 'left' ? rightRows : leftRows;

  // Find the row index at the current scroll position
  const rowIndex = findRowAtOffset(sourceRows, scrollTop);

  // Calculate the proportional position within that row
  const rowOffset = scrollTop - sourceRows[rowIndex].top;
  const proportion = rowOffset / sourceRows[rowIndex].height;

  // Apply the same proportional position to the aligned row in the target
  const targetTop = targetRows[rowIndex].top + (proportion * targetRows[rowIndex].height);

  targetPanel.scrollTo({ top: targetTop, behavior: 'instant' });
}
```

Row alignment is computed once when entering diff review mode, from the `BlockDiff[]` array. Each entry in the array corresponds to one row on each side (unchanged blocks share a row; added/removed blocks get a placeholder on the opposite side).
