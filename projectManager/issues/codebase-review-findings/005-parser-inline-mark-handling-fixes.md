# [005] Parser Inline Mark Handling Fixes

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** 007
- **Scope:** M
- **Design Doc:** [codebase-review-findings](../../design-docs/codebase-review-findings.md)

## Description

The inline handler in the markdown parser has a fragile mark stack management pattern that can corrupt state with overlapping markup. Additionally, `softbreak` tokens lose active marks, and several edge cases are unhandled. The mark stack `pop()` approach should be replaced with the targeted search-and-splice pattern already used for `link_close`.

**Findings:** 2.1, 2.3, 2.14, 2.15

## Acceptance Criteria

- [x] `strong_close`, `em_close`, `s_close`, and `mark_close` use targeted search-and-splice (matching the `link_close` pattern) instead of blind `pop()`
- [x] `softbreak` tokens carry forward the current `markStack` as marks on the emitted text node
- [x] `code_inline` handler guards against empty `token.content`
- [x] `default` case logs a warning for unknown token types (debug-level, not console.warn)
- [x] Existing parser tests still pass
- [x] New tests cover: overlapping marks, softbreak inside bold, empty inline code

## Human Review Focus

- **Look at:** The mark stack splice implementation — ensure it correctly handles nested/overlapping marks
- **Test:** Parse `**bold _bold-italic** italic_` and verify no corruption
- **Decide:** Whether the debug log for unknown tokens should be gated behind a verbose flag

## Agent Autonomy Notes

- **Agent can decide:** Exact implementation of splice logic, test structure, logging approach
- **Escalate to human:** If overlapping marks produce different results than expected — may need to discuss desired behavior

## Technical Notes

### Suggested Approach
1. Replace blind `pop()` in `strong_close`, `em_close`, `s_close`, `mark_close` with:
   ```typescript
   case 'strong_close':
     for (let j = markStack.length - 1; j >= 0; j--) {
       if (markStack[j].type === 'bold') {
         markStack.splice(j, 1);
         break;
       }
     }
     break;
   ```
2. Update `softbreak` to carry marks:
   ```typescript
   case 'softbreak': {
     const marks = markStack.length > 0 ? [...markStack] : undefined;
     result.push({ type: 'text', text: '\n', marks });
     break;
   }
   ```
3. Add empty content guard to `code_inline`
4. Add console.debug for unknown tokens in default case

### Files to Modify
- `src/markdown/handlers/inline.ts` — All changes

### Key Considerations
- The mark types used in the stack must match: `bold` for `strong`, `italic` for `em`, `strike` for `s`, `highlight` for `mark`
- Verify the TipTap mark type names match what the parser produces
- The `link_close` pattern at lines 72-78 is the reference implementation

## Tests Required

### Unit Tests
- [x] Parse `**bold _bold-italic** italic_` — verify marks are correctly applied (no corruption)
- [x] Parse `**bold\nstill bold**` (with softbreak) — verify newline node has bold mark
- [x] Parse `` ` ` `` (empty inline code) — verify no crash
- [x] Parse `**bold ~~strike** end~~` — verify overlapping marks handled correctly
- [x] Existing parser tests all pass (regression check)

### Roundtrip Tests
- [ ] `parse(serialize(parse(md))) === parse(md)` for documents with overlapping inline marks
- [ ] Roundtrip with softbreaks inside formatted text

## Definition of Done

- [x] All acceptance criteria met
- [x] Unit tests written and passing
- [ ] Roundtrip tests written and passing
- [ ] Human review completed (see Human Review Focus above)
- [x] No regressions in existing parser functionality
