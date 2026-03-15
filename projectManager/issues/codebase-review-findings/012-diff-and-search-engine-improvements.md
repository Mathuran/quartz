# [012] Diff and Search Engine Improvements

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** —
- **Scope:** M
- **Design Doc:** [codebase-review-findings](../../design-docs/codebase-review-findings.md)

## Description

The diff engine has O(n*m) JSON.stringify calls in the LCS comparison and an O(n*m) scan of a sparse boolean matrix. The search engine can't find matches that span across inline mark boundaries (e.g., searching "hello world" fails if "hello" is bold and " world" is plain). The heading extractor descends unnecessarily into all child nodes.

**Findings:** 5.3, 5.4, 5.8, 5.9, 5.15, 5.18, 5.19, 5.20, 5.21, 5.22

## Acceptance Criteria

- [ ] `diffEngine.ts`: Block fingerprints pre-computed before LCS loop (hash/stringify once per block, not per comparison)
- [ ] `diffEngine.ts`: LCS pairs returned as `[i, j]` tuples instead of full boolean matrix; `buildLCSMap` iterates the tuple list
- [ ] `searchEngine.ts`: Matches can span across inline mark boundaries within a block (concatenate text nodes, search over concatenated text, map positions back)
- [ ] `searchEngine.ts`: `wholeWord` check uses consistent casing for boundary detection
- [ ] `headingExtractor.ts`: `descendants` callback returns `false` for heading nodes (don't descend into children)
- [ ] `debounce.ts`: Type constraint changed from `unknown[]` to `any[]` for broader compatibility
- [ ] `languages.ts`: `ALL_LANGUAGES` deduplicates entries from `COMMON_LANGUAGES`

## Human Review Focus

- **Look at:** The cross-mark search implementation — ensure positions map correctly back to document positions
- **Test:** Search for text that spans bold/plain boundary — verify it's found and highlighted correctly
- **Test:** Open diff view on a large file (~500 lines) — verify it doesn't freeze
- **Decide:** N/A

## Agent Autonomy Notes

- **Agent can decide:** Hashing strategy for block fingerprints, text concatenation approach for cross-mark search
- **Escalate to human:** Nothing — these are straightforward performance and correctness fixes

## Technical Notes

### Suggested Approach
1. **Diff fingerprinting:**
   ```typescript
   const oldFingerprints = oldBlocks.map(b => JSON.stringify(normalize(b)));
   const newFingerprints = newBlocks.map(b => JSON.stringify(normalize(b)));
   // In LCS loop: compare oldFingerprints[i] === newFingerprints[j]
   ```
2. **LCS tuple pairs:** Instead of `inLCS[i][j] = true`, collect `pairs.push([i, j])` during backtrack
3. **Cross-mark search:**
   ```typescript
   doc.descendants((node, pos) => {
     if (node.isBlock && node.isTextblock) {
       let fullText = '';
       const segments: { from: number; length: number }[] = [];
       node.forEach((child, offset) => {
         if (child.isText) {
           segments.push({ from: pos + 1 + offset, length: child.text!.length });
           fullText += child.text;
         }
       });
       // Search fullText, map match positions back using segments
     }
   });
   ```
4. **Heading extractor:** Return `false` after processing heading node
5. **Debounce type:** Change `unknown[]` to `any[]`
6. **Languages:** `ALL_LANGUAGES = [...new Set([...COMMON_LANGUAGES, ...extraLanguages])].sort()`

### Files to Modify
- `src/webview/diff/diffEngine.ts` — Fingerprinting, tuple pairs
- `src/webview/search/searchEngine.ts` — Cross-mark search, wholeWord fix
- `src/webview/utils/headingExtractor.ts` — Early return
- `src/webview/utils/debounce.ts` — Type constraint
- `src/webview/constants/languages.ts` — Deduplication

### Key Considerations
- The cross-mark search is the most impactful fix — users will notice when search misses text spanning formatting
- The diff fingerprinting is important for large documents but less user-visible
- Position mapping in cross-mark search must account for the +1 offset at the start of text block content

## Tests Required

### Unit Tests
- [ ] Diff engine: 200-block document computes in < 100ms (performance test)
- [ ] Diff engine: LCS correctly identifies matching blocks
- [ ] Search: "hello world" found when "hello" is bold and " world" is plain
- [ ] Search: "test" found within a fully bold paragraph
- [ ] Search: wholeWord match works correctly in case-insensitive mode
- [ ] Languages: `ALL_LANGUAGES` has no duplicate entries
- [ ] Debounce: works with functions that have specific parameter types

### E2E Tests
- [ ] Search for text spanning formatted regions — verify highlight appears across the boundary

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing (if applicable)
- [ ] Human review completed (see Human Review Focus above)
- [ ] No regressions in diff view or search functionality
