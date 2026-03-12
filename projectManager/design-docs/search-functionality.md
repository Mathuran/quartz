# Search Functionality Design Document

**Author:** AI Agent
**Status:** APPROVED
**Created:** 2026-03-07
**Last Updated:** 2026-03-07
**Reviewers:** Mathuran

---

## 1. Problem Statement

Quartz users cannot search within their documents or across their workspace. VS Code's built-in `Cmd+F` does not work inside custom editor webviews — pressing it does nothing. VS Code's sidebar search (`Cmd+Shift+F`) finds matches across files, but clicking results opens files in the default text editor, not Quartz. This means users must leave the rich editing experience to find content, then manually reopen files in Quartz and scroll to what they were looking for.

For a markdown editor that aspires to Notion-level polish, the absence of search is a critical gap. Every text editing tool users have ever used supports `Cmd+F`. Its absence is immediately noticed and makes the editor feel incomplete.

## 2. Goals and Non-Goals

### Goals

- **P0: In-document find (`Cmd+F`)** — Search the current document with match highlighting, match count, and next/previous navigation. Target: feels indistinguishable from VS Code's native find widget.
- **P0: In-document find and replace (`Cmd+H`)** — Replace individual matches or all matches in the current document.
- **P1: Cross-file search** — Search all `.md` files in the workspace from within Quartz, with results that open in Quartz mode (not the text editor).
- **P1: Match highlighting on open** — When opening a file from cross-file search results, scroll to and highlight the matched text.

### Non-Goals

- **Regex search** — Adds complexity for low user value in a WYSIWYG editor. Can be added later.
- **Search and replace across files** — High-risk operation; VS Code's built-in does this adequately for power users willing to use text mode.
- **Fuzzy/semantic search** — Out of scope. Plain text matching only.
- **Search within code blocks by language** — No special handling for code block content.
- **Saved searches or search history** — Unnecessary for v1.

## 3. Background and Context

### Why VS Code's Search Doesn't Work

Quartz implements `CustomTextEditorProvider`, which renders content in an isolated webview `<iframe>`. VS Code's find widget (`Cmd+F`) targets `TextEditor` instances (Monaco), not webview content. The `TextDocument` exists in the extension host for file persistence, but the rendered, visible content lives in the webview DOM — invisible to VS Code's search infrastructure.

### How Other Custom Editors Handle This

- **VS Code's Markdown Preview**: Implements its own find-in-page using browser's `window.find()` API (limited, no highlighting).
- **Draw.io, Foam**: Implement custom search UIs within their webviews.
- **Jupyter Notebooks (VS Code)**: Custom find widget with its own match tracking.

### Existing Patterns in Quartz to Reuse

| Pattern | Source | Reuse for Search |
|---------|--------|-----------------|
| Modal overlay UI | `TableOfContents.tsx` | Search panel component |
| ProseMirror decorations | `diffDecorationExtension.ts` | Match highlighting |
| Keyboard shortcut binding | `keyboardShortcuts.ts` | `Cmd+F`, `Cmd+H` bindings |
| Document traversal | `headingExtractor.ts` | Finding text matches |
| Extension host ↔ webview messaging | `QuartzEditorProvider.ts` | Cross-file search coordination |

## 4. Proposed Solution

### 4.1 Architecture Overview

The solution has two independent features that share highlighting infrastructure:

```
┌─ Feature 1: In-Document Search (Webview only) ─────────────┐
│                                                              │
│  Cmd+F → SearchBar.tsx → searchDecorationExtension.ts       │
│            ↕ state                ↕ decorations              │
│         React UI            ProseMirror doc                  │
└──────────────────────────────────────────────────────────────┘

┌─ Feature 2: Cross-File Search (Extension Host + Webview) ───┐
│                                                              │
│  Cmd+Shift+F → VS Code QuickPick (extension.ts)            │
│       ↓ user selects result                                  │
│  vscode.commands → openTextDocument → openWith Quartz       │
│       ↓ postMessage                                          │
│  Webview highlights match position                           │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Feature 1: In-Document Find & Replace

#### UX Design

The search bar appears **fixed at the top-right of the editor area** (identical positioning to VS Code's native find widget). This is the universally expected location.

```
┌──────────────────────────────────────────────────────────────┐
│ [Formatting Toolbar]                                         │
├──────────────────────────────────────────────────────────┐   │
│                                              ┌──────────┤   │
│  Document content...                         │ Search   │   │
│                                              │ ┌──────┐ │   │
│  Some text with a ==highlighted match==      │ │ find │ │   │
│  here and another ==match== there.           │ │      │ │   │
│                                              │ │[Aa]  │ │   │
│                                              │ │[Ab]  │ │   │
│                                              │ │2 of 5│ │   │
│                                              │ │[↑][↓]│ │   │
│                                              │ │      │ │   │
│                                              │ │replace│ │   │
│                                              │ │┌────┐│ │   │
│                                              │ │[1][*]│ │   │
│                                              │ └──────┘ │   │
│                                              └──────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**Interaction flow:**

1. `Cmd+F` opens the search bar with the find input focused
2. If text is selected, it pre-fills the search input
3. Typing updates matches in real-time (debounced at 100ms for large docs)
4. All matches get a subtle background highlight; the "current" match gets a distinct highlight
5. `Enter` or `↓` button → next match; `Shift+Enter` or `↑` button → previous match
6. Match count shows "X of Y" (e.g., "3 of 12")
7. `Escape` closes the search bar and clears highlights
8. `Cmd+H` opens with the replace input also visible
9. Replace button replaces current match; Replace All replaces all matches
10. Toggle buttons: **Aa** (case sensitive), **Ab** (whole word)

**Why a fixed bar and not a modal overlay:**
- Modals block interaction with the document — users need to see context around matches
- VS Code's native find widget is a non-blocking bar, and users expect this pattern
- The Table of Contents modal works because you select-and-close; search requires ongoing interaction

#### Technical Design

**New files:**

| File | Purpose |
|------|---------|
| `src/webview/components/SearchBar.tsx` | React component for find/replace UI |
| `src/webview/extensions/searchHighlightExtension.ts` | TipTap extension for match decorations |
| `src/webview/styles/search.css` | Search bar styling |

**SearchBar.tsx** — React component:
- Controlled inputs for find and replace text
- State: `{ query, replacement, caseSensitive, wholeWord, currentIndex, totalMatches, showReplace }`
- Communicates with the TipTap extension via the editor instance (not message passing — everything is in-webview)
- Exposes keyboard shortcut handlers

**searchHighlightExtension.ts** — TipTap/ProseMirror extension:
- Plugin that maintains a `DecorationSet` of match highlights
- On search query change: traverses `editor.state.doc.descendants()` to find all text matches
- Creates inline `Decoration.inline()` for each match span with CSS classes
- Distinguishes "all matches" decoration (`.search-match`) from "current match" (`.search-match-current`)
- Navigation: tracks current match index, updates decoration classes, scrolls into view via `dom.scrollIntoView()`

**Match finding algorithm:**
```typescript
function findMatches(doc: ProseMirrorNode, query: string, options: SearchOptions): Match[] {
  const matches: Match[] = [];
  const searchText = options.caseSensitive ? query : query.toLowerCase();

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = options.caseSensitive ? node.text : node.text.toLowerCase();
    let index = 0;
    while ((index = text.indexOf(searchText, index)) !== -1) {
      if (options.wholeWord && !isWholeWord(node.text, index, searchText.length)) {
        index++;
        continue;
      }
      matches.push({ from: pos + index, to: pos + index + query.length });
      index++;
    }
  });
  return matches;
}
```

**Replace implementation:**
- Single replace: `editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, replacement).run()`
- Replace all: batched in a single transaction for undo grouping (one `Cmd+Z` undoes all replacements)

**Keyboard shortcut registration** (in `keyboardShortcuts.ts`):
```typescript
'Mod-f': () => { window.dispatchEvent(new CustomEvent('quartz:openSearch')); return true; }
'Mod-h': () => { window.dispatchEvent(new CustomEvent('quartz:openSearch', { detail: { replace: true } })); return true; }
```

#### Edge Cases

- **Empty query**: Show no highlights, display "0 results"
- **Query matches across node boundaries** (e.g., "hello **world**" searching for "hello world"): v1 will NOT match across node boundaries. This is consistent with VS Code and Notion behavior. Text in different ProseMirror nodes is searched independently.
- **Large documents (1000+ matches)**: Debounce search at 150ms; decorations are lightweight (ProseMirror handles this efficiently)
- **Search while in code blocks**: Searches code block text content normally
- **Search in frontmatter**: Frontmatter is rendered separately by `FrontmatterBanner.tsx`. v1 will NOT search frontmatter content. (Non-goal, can add later.)

### 4.3 Feature 2: Cross-File Search via Default Editor Association

#### UX Design: Work With VS Code, Not Against It

After evaluating multiple custom approaches (Quick Pick, sidebar panel — see Alternatives section), the recommended approach is to **not build a custom cross-file search UI at all**. Instead, make VS Code's built-in `Cmd+Shift+F` search work with Quartz by setting Quartz as the default editor for `.md` files.

**Why this is the right approach:**
- `Cmd+Shift+F` is muscle memory for every VS Code user. Overriding it with a different UI in one specific editor context would be confusing and inconsistent.
- VS Code's built-in search is powerful — regex, include/exclude filters, replace across files. We can't match that.
- The actual problem isn't "we need our own search" — it's "search results open in the wrong editor." Fixing the root cause is simpler and more correct.
- Zero new UI to build, test, or maintain.

**How it works:**

1. On extension activation, Quartz sets `workbench.editorAssociations` to map `*.md` → `quartz.markdownEditor` (if not already configured)
2. User presses `Cmd+Shift+F` → VS Code's normal search sidebar opens (familiar, expected)
3. User searches, finds results across `.md` files
4. User clicks a search result → file opens in Quartz (because it's now the default editor)
5. User uses `Cmd+F` (in-document search from Feature 1) to locate the specific text within the document

**Edge case — user wants text mode:** The existing `quartz.toggleEditor` command lets users switch between Quartz and text mode at any time. This preserves full flexibility.

#### Technical Design

**Extension host side** (`extension.ts`):

On activation, check and set the editor association:

```typescript
async function ensureDefaultEditor() {
  const config = vscode.workspace.getConfiguration('workbench');
  const associations = config.get<Record<string, string>>('editorAssociations') || {};

  if (!associations['*.md']) {
    await config.update('editorAssociations', {
      ...associations,
      '*.md': 'quartz.markdownEditor'
    }, vscode.ConfigurationTarget.Global);
  }
}
```

**Considerations:**
- Only set the association if the user hasn't explicitly configured one (don't override user preferences)
- This is a one-time setup on first activation
- Users who prefer text mode for `.md` can remove the association via VS Code settings
- The `quartz.toggleEditor` command remains available for per-file switching

## 5. Alternative Solutions Considered

### Alternative A: Custom Quick Pick for Cross-File Search (`Cmd+Shift+F` override)

**Approach:** Override `Cmd+Shift+F` when a Quartz editor is active to open a VS Code Quick Pick with live search results across `.md` files.

**Pros:**
- Results guaranteed to open in Quartz
- Custom result formatting with context snippets

**Cons:**
- Overrides a universally known shortcut — confusing for users with muscle memory
- Quick Pick is ephemeral — can't scan through multiple results without re-searching
- Inconsistency: same shortcut does different things depending on active editor
- Builds an inferior version of what VS Code's search already does well (no regex, no include/exclude, no replace across files)

**Why not chosen:** The inconsistency of overriding `Cmd+Shift+F` would confuse experienced VS Code users. Setting Quartz as the default `.md` editor solves the root problem (results open in wrong editor) without changing any expected behavior.

### Alternative B: Sidebar Webview Panel for Cross-File Search

**Approach:** Create a custom sidebar panel with a search input and file-grouped results rendered in a webview.

**Pros:**
- Persistent — stays open while navigating between files
- Can show richer UI (syntax-highlighted previews, match counts per file)

**Cons:**
- Significantly more complex to build (custom webview, HTML/CSS, state management)
- Slower to open (webview must initialize)
- Reinvents what VS Code's search sidebar already does
- Sidebar space is limited; competes with Explorer, Outline, Git panels

**Why not chosen:** Too much complexity for a problem that's solved by setting the default editor association.

### Alternative C: Browser's `window.find()` API for In-Document Search

**Approach:** Use the web platform's built-in `window.find()` method to search the webview's rendered text.

**Pros:**
- Trivial to implement (one line of code)
- Handles cross-node text matching

**Cons:**
- No custom highlighting (browser's native highlight only, no styling control)
- No match count
- No replace functionality
- Inconsistent behavior across browsers/Electron versions
- Cannot integrate with ProseMirror's position system (can't map finds to document positions for replace)
- Deprecated API with no replacement

**Why not chosen:** Too limited for a production editor. No replace, no match count, no styling control.

## 6. Security, Privacy, and Compliance

- **No data leaves the editor.** All search is local — no network requests, no telemetry.
- **No new file access.** Cross-file search uses `workspace.findFiles` and `workspace.openTextDocument`, which are standard VS Code APIs scoped to the workspace.
- **Replace operations** modify the document through TipTap's transaction system, which feeds through the existing `WorkspaceEdit.replace()` path — no new write mechanism.
- **Input sanitization:** Search queries are used as literal strings in `indexOf`/`includes`, not as regex or DOM selectors. No injection risk.

## 7. Testing Strategy

### Unit Tests (Vitest)

| Test | What it validates |
|------|-------------------|
| `search-engine.test.ts` | `findMatches()` — case sensitivity, whole word, empty queries, special characters, Unicode |
| `search-engine.test.ts` | Match navigation — next/previous wrapping, index tracking |
| `search-engine.test.ts` | Replace — single replace updates content correctly, replace-all in single transaction |

### E2E Tests (Playwright)

| Test | What it validates |
|------|-------------------|
| `search.spec.ts` | `Cmd+F` opens search bar, typing shows matches, Enter navigates, Escape closes |
| `search.spec.ts` | `Cmd+H` opens replace, replace single, replace all |
| `search.spec.ts` | Case sensitivity and whole word toggles work |
| `search.spec.ts` | Selected text pre-fills search input |
| `search.spec.ts` | Match highlighting renders correctly |

### Integration Tests

| Test | What it validates |
|------|-------------------|
| `default-editor.test.ts` | Editor association is set on first activation and respects existing config |

### Manual QA

- [ ] Search works with CJK characters
- [ ] Search bar doesn't overlap content in narrow editor widths
- [ ] Performance with 500+ matches in a large document
- [ ] Replace all followed by `Cmd+Z` undoes everything in one step

## 8. Rollout Plan

### Phase 1: In-Document Find (Scope: S — 1 review cycle)

- **Agent delivers:**
  - `SearchBar.tsx` component with find UI
  - `searchHighlightExtension.ts` with match decorations
  - `search.css` styles using VS Code theme variables
  - Keyboard bindings (`Cmd+F`, `Escape`, `Enter`, `Shift+Enter`)
  - Unit tests for match finding algorithm
  - E2E test for basic find flow
- **Human reviews:** Visual design of search bar, interaction feel, edge cases
- **Approved when:** `Cmd+F` search feels native; matches highlight correctly; navigation works

### Phase 2: In-Document Replace (Scope: XS — 1 review cycle)

- **Agent delivers:**
  - Replace UI added to `SearchBar.tsx`
  - Replace and Replace All implementation
  - `Cmd+H` keybinding
  - Unit tests for replace operations
  - E2E test for replace flow
- **Human reviews:** Replace behavior, undo behavior after replace-all
- **Approved when:** Replace works correctly; `Cmd+Z` after replace-all undoes all in one step

### Phase 3: Default Editor Association for Cross-File Search (Scope: XS — 1 review cycle)

- **Agent delivers:**
  - Logic in `extension.ts` to set `workbench.editorAssociations` for `*.md` on first activation
  - Guard to not override existing user configuration
  - Integration test for the association setup
- **Human reviews:** Verify `Cmd+Shift+F` search results open in Quartz; verify user preferences are respected
- **Approved when:** VS Code's built-in search results for `.md` files open in Quartz by default

## 9. Human Validation Plan

| Checkpoint | Agent Produces | Human Validates | Blocks |
|------------|---------------|-----------------|--------|
| Phase 1 complete | Working find with highlights + tests | Visual polish, interaction feel | Phase 2 |
| Phase 2 complete | Working replace + undo behavior | Replace correctness, undo grouping | Phase 3 |
| Phase 3 complete | Default editor association + guard logic | Search results open in Quartz, user prefs respected | Release |
| Final review | All tests passing, no regressions | Full workflow end-to-end | Ship |

**Blocking human decisions:**
1. **Search bar positioning**: Top-right fixed bar (recommended) vs. top of editor full-width bar? → Resolved: top-right to match VS Code's native find widget.

## 10. Dependencies and Risks

### Dependencies

- None. All required APIs (`DecorationSet`, `doc.descendants()`, `workspace.findFiles`, `window.createQuickPick`) are already available in the codebase's dependencies.

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Search bar overlaps content on narrow widths | Medium | Medium | Use responsive CSS; collapse to full-width bar below 400px |
| Performance with very large documents (10k+ lines) | Medium | Low | Debounce search; use efficient string matching; decorations are lightweight |
| `Cmd+F` conflicts with browser's native find in webview | High | High | Return `true` from keyboard handler to prevent default; test on all platforms |
| Setting default editor overrides user preference | Medium | Low | Only set if user hasn't configured an association; respect existing settings |
| Replace operation corrupts document | High | Low | Replace goes through TipTap's transaction system (proven path); comprehensive tests |

## 11. Open Questions

| Question | Owner | Status |
|----------|-------|--------|
| Should `Cmd+Shift+F` override VS Code's built-in search when Quartz is active? | Mathuran | **Resolved — No, use default editor association instead** |
| Should cross-file search include/exclude frontmatter content? | Mathuran | **Resolved — Include frontmatter** |
| Do we want a "Search" section in the VS Code activity bar (sidebar icon)? | Mathuran | Open — would enable persistent search results panel in future |

## 12. Implementation Issues

| # | Title | Status | Scope |
|---|-------|--------|-------|
| [001](../issues/search-functionality/001-in-document-find.md) | In-Document Find with Match Highlighting | TODO | S |
| [002](../issues/search-functionality/002-in-document-replace.md) | In-Document Find and Replace | TODO | XS |
| [003](../issues/search-functionality/003-cross-file-search.md) | Default Editor Association for Cross-File Search | TODO | XS |

**Progress:** 0/3 issues complete (0%)

## 13. Appendix

### VS Code Find Widget Reference

VS Code's native find widget supports:
- Find / Replace
- Case sensitive (Aa)
- Whole word (Ab)
- Regex (.*)
- Match count (X of Y)
- Previous / Next (arrows or Shift+Enter / Enter)
- Replace / Replace All
- Preserve case in replace
- Find in selection

For v1, Quartz will implement: Find, Replace, Case Sensitive, Whole Word, Match Count, Previous/Next, Replace, Replace All. Regex, Preserve Case, and Find in Selection are deferred.

### Keyboard Shortcuts Reference

| Shortcut | Action |
|----------|--------|
| `Cmd+F` | Open find bar |
| `Cmd+H` | Open find and replace |
| `Escape` | Close search bar |
| `Enter` | Next match |
| `Shift+Enter` | Previous match |
| `Cmd+Shift+F` | VS Code's built-in search (works because Quartz is default `.md` editor) |
