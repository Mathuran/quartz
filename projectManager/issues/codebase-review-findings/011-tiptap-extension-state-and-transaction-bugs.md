# [011] TipTap Extension State and Transaction Bugs

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** —
- **Scope:** M
- **Design Doc:** [codebase-review-findings](../../design-docs/codebase-review-findings.md)

## Description

Several TipTap extensions have state management and transaction handling bugs. The slash command extension uses module-level mutable state shared across instances with a leaked global event listener. The horizontal rule extension creates new transactions instead of using the handler-provided one. The diff decoration and search highlight plugins rebuild decorations from scratch on every transaction.

**Findings:** 5.5, 5.6, 5.7, 5.10, 5.11, 5.12, 5.13, 5.14, 5.16, 5.17

## Acceptance Criteria

- [x] `slashCommandExtension.ts`: `isSlashMenuActive` moved from module-level to plugin state; global event listener cleaned up on plugin destroy
- [x] `slashCommandExtension.ts`: Dead plugin state code (lines 72-79) removed
- [x] `slashCommandExtension.ts`: Backspace/deletion handled to update slash menu query
- [x] `horizontalRuleExtension.ts`: InputRule handlers use `chain()` API or handler-provided transaction instead of `state.tr`
- [x] `diffDecorationExtension.ts`: `blockDiffMap` tracked in plugin state; DecorationSet only rebuilt when map changes; `DecorationSet.map()` used for document changes without map changes
- [x] `searchHighlightExtension.ts`: DecorationSet cached in plugin state; only rebuilt when matches change; mapped on other transactions
- [x] `keyboardShortcuts.ts`: Dead no-op `Mod-c/x/v` handlers removed
- [x] `inputRules.ts`: Task list input rule position calculation verified correct after chain operations

## Human Review Focus

- **Look at:** The slash command plugin state migration — ensure menu still shows/hides correctly
- **Test:** Type `/` to open slash menu, type query, backspace to edit query, select command
- **Test:** Type `---` to insert horizontal rule — verify it works and undo removes it
- **Decide:** Whether bold+italic input rule limitation (5.10 — rejects nested syntax) is worth fixing now

## Agent Autonomy Notes

- **Agent can decide:** Plugin state shape, decoration caching strategy, event listener cleanup approach
- **Escalate to human:** If the horizontal rule chain() approach breaks the input rule behavior (may need testing)

## Technical Notes

### Suggested Approach
1. **Slash command state:**
   ```typescript
   // Move to plugin state
   state: {
     init: () => ({ active: false, slashPos: -1 }),
     apply: (tr, prev) => {
       const meta = tr.getMeta('slashMenu');
       return meta !== undefined ? meta : prev;
     }
   }
   ```
2. **Slash command event listener:** Register in plugin `view()` method, clean up in `destroy()`
3. **Slash command backspace:** Add `handleKeyDown` for Backspace that re-evaluates the query
4. **Horizontal rule:** Replace `insertHorizontalRule(state, state.tr, range)` with `chain().deleteRange(range).setHorizontalRule().run()` or equivalent
5. **Diff decoration caching:** Store both `blockDiffMap` and `DecorationSet` in state; in `apply`, check if map changed via metadata, rebuild if so, otherwise `map()` the existing set
6. **Search highlight caching:** Same pattern — cache DecorationSet, rebuild only on meta change
7. **Dead code removal:** Remove `Mod-c/x/v` handlers, remove unused plugin state in slash command

### Files to Modify
- `src/webview/extensions/slashCommandExtension.ts` — State migration, event listener, backspace handling, dead code removal
- `src/webview/extensions/horizontalRuleExtension.ts` — Transaction fix
- `src/webview/extensions/diffDecorationExtension.ts` — Decoration caching
- `src/webview/extensions/searchHighlightExtension.ts` — Decoration caching
- `src/webview/extensions/keyboardShortcuts.ts` — Dead code removal
- `src/webview/extensions/inputRules.ts` — Task list position verification

### Key Considerations
- The slash command state migration is the most complex change — test thoroughly
- Decoration caching is a significant performance win for large documents
- The horizontal rule fix may require checking TipTap's InputRule handler API to understand what transaction context is available

## Tests Required

### Unit Tests
- [ ] Slash menu activates on `/` input
- [ ] Slash menu query updates on backspace
- [ ] Slash menu deactivates on Escape or command selection
- [ ] Horizontal rule input rule produces correct document state

### E2E Tests
- [ ] Type `/heading` → select → heading inserted
- [ ] Type `---` → horizontal rule inserted → undo → removed
- [ ] Open two editors simultaneously — slash menu state independent

### Manual Testing
- [ ] Type `/`, then backspace twice, then type new query — verify menu updates correctly
- [ ] Large document with diff view — verify no visible lag on typing

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Human review completed (see Human Review Focus above)
- [ ] No regressions in slash menu, horizontal rule, diff view, or search functionality
