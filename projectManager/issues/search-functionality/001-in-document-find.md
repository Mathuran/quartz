# [001] In-Document Find with Match Highlighting

## Metadata
- **Status:** TODO
- **Depends On:** None
- **Blocks:** 002, 003
- **Scope:** S
- **Design Doc:** [search-functionality](../../design-docs/search-functionality.md)

## Description

Implement `Cmd+F` in-document search for the Quartz editor. This is the foundational search feature — a fixed search bar at the top-right of the editor with real-time match highlighting, match count, and next/previous navigation.

VS Code's built-in `Cmd+F` does not work in custom editor webviews, so this must be built from scratch using ProseMirror decorations and a React component.

## Acceptance Criteria

- [ ] `Cmd+F` opens a search bar fixed to the top-right of the editor (below the formatting toolbar)
- [ ] If text is selected when `Cmd+F` is pressed, the search input is pre-filled with the selection
- [ ] Typing in the search input highlights all matches in the document in real-time
- [ ] The "current" match has a visually distinct highlight from other matches
- [ ] Match count displays as "X of Y" (e.g., "3 of 12")
- [ ] `Enter` navigates to the next match; `Shift+Enter` navigates to the previous match
- [ ] Navigation wraps around (last match → first match and vice versa)
- [ ] The editor scrolls to bring the current match into view
- [ ] `Escape` closes the search bar and clears all highlights
- [ ] Toggle buttons for case sensitivity (Aa) and whole word (Ab) work correctly
- [ ] Empty query shows "0 results" and no highlights
- [ ] Search works inside code blocks, blockquotes, lists, and all block types
- [ ] Search bar uses VS Code theme variables for consistent theming (dark/light)

## Human Review Focus

- **Look at:** Visual design of the search bar — does it look like it belongs in VS Code? Check dark and light themes.
- **Test:** Open a document with repeated words, press `Cmd+F`, type a query, navigate with `Enter`/`Shift+Enter`. Does it feel native?
- **Test:** Edge cases — empty query, single character, query with no matches, query that matches 100+ times.
- **Decide:** Is the search bar position and styling acceptable before proceeding to replace functionality?

## Agent Autonomy Notes

- **Agent can decide:** Component structure, CSS class names, internal state management approach, debounce timing, decoration styling details
- **Escalate to human:** Search bar visual design if it looks significantly different from VS Code's native find widget

## Technical Notes

### Suggested Approach

1. Create `src/webview/extensions/searchHighlightExtension.ts` — a TipTap extension wrapping a ProseMirror plugin that manages a `DecorationSet`
2. Create `src/webview/components/SearchBar.tsx` — React component for the search UI
3. Create `src/webview/styles/search.css` — styles using VS Code CSS variables
4. Add keyboard shortcuts in `src/webview/extensions/keyboardShortcuts.ts` for `Mod-f`
5. Wire up the SearchBar component in `Editor.tsx`

### Key Implementation Details

**Match finding:** Traverse `editor.state.doc.descendants()` to find text nodes, then use `indexOf` to find matches within each text node. Accumulate `{ from, to }` positions.

**Decorations:** Use `Decoration.inline(from, to, { class: 'search-match' })` for all matches and `search-match-current` for the active match. Rebuild decoration set when query or current index changes.

**Scroll to match:** Use ProseMirror's `scrollIntoView` or get the DOM element for the current match decoration and call `element.scrollIntoView({ block: 'center' })`.

**Communication pattern:** Use custom DOM events (`quartz:openSearch`, `quartz:closeSearch`) dispatched from keyboard shortcuts and listened to in the React component. The React component calls methods on the TipTap editor instance to trigger decoration updates.

### Files to Create
- `src/webview/components/SearchBar.tsx` — Search bar UI component
- `src/webview/extensions/searchHighlightExtension.ts` — ProseMirror decoration plugin
- `src/webview/styles/search.css` — Search bar styles

### Files to Modify
- `src/webview/extensions/keyboardShortcuts.ts` — Add `Mod-f` binding
- `src/webview/Editor.tsx` — Register search extension, render SearchBar component

### Key Considerations
- Return `true` from the `Mod-f` keyboard handler to prevent the browser's native find from activating
- Reuse the decoration pattern from `diffDecorationExtension.ts`
- Reuse the keyboard navigation pattern from `TableOfContents.tsx`
- Debounce search at ~100-150ms to avoid jank on large documents

## Tests Required

### Unit Tests
- [ ] `findMatches()` returns correct positions for simple text
- [ ] `findMatches()` with case sensitivity off matches regardless of case
- [ ] `findMatches()` with case sensitivity on only matches exact case
- [ ] `findMatches()` with whole word on skips partial matches (e.g., "the" doesn't match "there")
- [ ] `findMatches()` with empty query returns empty array
- [ ] `findMatches()` with special characters (`.`, `*`, `(`) treats them as literals
- [ ] `findMatches()` with Unicode/CJK characters works correctly
- [ ] Match navigation wraps: next from last → first, previous from first → last

### E2E Tests
- [ ] `Cmd+F` opens search bar with focus on input
- [ ] Typing a query highlights matches in the editor
- [ ] `Enter` navigates to next match
- [ ] `Escape` closes search bar and clears highlights
- [ ] Selected text pre-fills search input

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Human review completed (see Human Review Focus above)
- [ ] No regressions in existing functionality
