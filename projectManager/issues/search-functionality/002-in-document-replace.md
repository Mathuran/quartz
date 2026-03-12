# [002] In-Document Find and Replace

## Metadata
- **Status:** DONE
- **Depends On:** 001
- **Blocks:** 003
- **Scope:** XS
- **Design Doc:** [search-functionality](../../design-docs/search-functionality.md)

## Description

Add replace functionality to the existing search bar from issue 001. This extends the SearchBar component with a replace input, Replace button, and Replace All button. `Cmd+H` opens the search bar with the replace input visible.

Replace All must execute as a single ProseMirror transaction so that `Cmd+Z` undoes all replacements in one step.

## Acceptance Criteria

- [ ] `Cmd+H` opens the search bar with both find and replace inputs visible
- [ ] Replace button replaces the current match and advances to the next match
- [ ] Replace All button replaces all matches at once
- [ ] `Cmd+Z` after Replace All undoes all replacements in a single undo step
- [ ] Replace works correctly with case sensitivity and whole word toggles active
- [ ] Replace preserves surrounding formatting (bold, italic, etc.)
- [ ] Match count updates after each replacement
- [ ] When `Cmd+F` is used (not `Cmd+H`), the replace input is hidden but can be toggled

## Human Review Focus

- **Look at:** Replace UI layout — does the replace input integrate cleanly with the find bar?
- **Test:** Replace a word, then `Cmd+Z` — does it undo correctly? Replace All, then `Cmd+Z` — does it undo everything in one step?
- **Test:** Replace a word inside bold text — does the bold formatting survive?

## Agent Autonomy Notes

- **Agent can decide:** Replace button icons/labels, toggle mechanism for showing/hiding replace input, transaction batching approach
- **Escalate to human:** If replace inside formatted text (bold, italic) causes formatting loss

## Technical Notes

### Suggested Approach

1. Extend `SearchBar.tsx` with a replace input and buttons (Replace, Replace All)
2. Add `Mod-h` keyboard shortcut in `keyboardShortcuts.ts`
3. Implement single replace using TipTap chain commands: `deleteRange` + `insertContentAt`
4. Implement Replace All by building a single ProseMirror transaction that applies all replacements (iterate matches in reverse order to avoid position shifts)

### Files to Modify
- `src/webview/components/SearchBar.tsx` — Add replace UI and logic
- `src/webview/styles/search.css` — Style replace input and buttons
- `src/webview/extensions/keyboardShortcuts.ts` — Add `Mod-h` binding

### Key Considerations
- When replacing all, iterate matches in **reverse document order** to avoid position invalidation
- Use `editor.state.tr` to build a single transaction for Replace All (ensures single undo step)
- After replacing, re-run the search to update match positions and count

## Tests Required

### Unit Tests
- [ ] Single replace updates content correctly at the right position
- [ ] Replace All replaces all occurrences
- [ ] Replace with empty string effectively deletes matches
- [ ] Replace All produces a single transaction (verify via transaction count or undo behavior)

### E2E Tests
- [ ] `Cmd+H` opens search bar with replace input
- [ ] Replace button replaces current match and advances
- [ ] Replace All replaces all matches; `Cmd+Z` undoes all at once

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Human review completed (see Human Review Focus above)
- [ ] No regressions in existing functionality
