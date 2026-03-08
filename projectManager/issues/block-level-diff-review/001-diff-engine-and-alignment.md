# [001] Diff Engine and Alignment Logic

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** 002, 003, 004
- **Scope:** S
- **Design Doc:** [block-level-diff-review](../../design-docs/block-level-diff-review.md)

## Description

Implement the core diff engine that computes block-level structural diffs between two JSONContent documents, plus the alignment logic that maps diff results to split-view row pairings.

This is pure logic with no UI — validated entirely through unit tests.

## Acceptance Criteria

- [ ] `diffEngine.ts` computes `BlockDiff[]` from two markdown strings using LCS with deep structural equality
- [ ] Adjacent removed + added blocks with same `type` are paired as `modified`
- [ ] `alignment.ts` produces row pairings from `BlockDiff[]` — unchanged/modified blocks share rows; added/removed get placeholder on opposite side
- [ ] `types.ts` exports `BlockDiff`, `DiffResult`, and alignment types
- [ ] Frontmatter change detection (`hasFrontmatterChange`) works
- [ ] Summary counts (`added`, `removed`, `modified`, `unchanged`) are accurate
- [ ] 30+ unit tests passing covering all block types and edge cases

## Human Review Focus

- **Look at:** Test cases — do they cover real-world AI agent edit patterns? (paragraph rewrites, section additions, callout removals, list changes)
- **Test:** Run `npm test` and confirm all diff engine tests pass
- **Decide:** Are the diff results intuitive? Does the modified-vs-delete+add heuristic produce sensible output?

## Agent Autonomy Notes

- **Agent can decide:** Internal data structures, LCS implementation details, helper function organization, test fixture format
- **Escalate to human:** If the LCS algorithm produces unexpected results for common edit patterns (e.g., a heading change causes all subsequent blocks to be misaligned)

## Technical Notes

### Suggested Approach
1. Create `src/webview/diff/types.ts` with `BlockDiff`, `DiffResult`, and alignment interfaces
2. Create `src/webview/diff/diffEngine.ts`:
   - `computeDiff(oldMarkdown: string, newMarkdown: string): DiffResult`
   - Parse both inputs via `parseMarkdown()`
   - Extract top-level block arrays from `doc.content`
   - Implement LCS with deep equality (`JSON.stringify` comparison or recursive structural equality)
   - Classify non-LCS blocks as added/removed, then pair adjacent same-type as modified
   - Detect frontmatter changes by comparing extracted frontmatter strings
3. Create `src/webview/diff/alignment.ts`:
   - `computeAlignment(diffs: BlockDiff[]): AlignedRow[]`
   - Each `AlignedRow` has `{ left: JSONContent | 'placeholder', right: JSONContent | 'placeholder', diffType }`
4. Write unit tests in `test/unit/diff-engine.test.ts` and `test/unit/diff-alignment.test.ts`

### Files to Create
- `src/webview/diff/types.ts`
- `src/webview/diff/diffEngine.ts`
- `src/webview/diff/alignment.ts`
- `test/unit/diff-engine.test.ts`
- `test/unit/diff-alignment.test.ts`

### Key Considerations
- Import `parseMarkdown` from `src/markdown/parser.ts` — it returns `{ doc, frontmatter }`
- Deep equality must handle all block types including nested ones (lists, blockquotes, callouts, tables)
- The `modified` heuristic (adjacent removed + added with same type) should only pair blocks that are directly adjacent in the diff output, not across intervening unchanged blocks
- Include `unchanged` entries in the diff output — the alignment logic and split-view UI need them

## Tests Required

### Unit Tests — Diff Engine (`test/unit/diff-engine.test.ts`)
- [ ] Identical documents → all `unchanged`, zero changes in summary
- [ ] Single paragraph added at end → 1 `added`
- [ ] Single paragraph added at beginning → 1 `added`
- [ ] Single paragraph added in middle → 1 `added`
- [ ] Single paragraph removed from end → 1 `removed`
- [ ] Single paragraph removed from beginning → 1 `removed`
- [ ] Single paragraph removed from middle → 1 `removed`
- [ ] Paragraph content changed → 1 `modified` (not remove + add)
- [ ] Heading level changed (h1 → h2) → `modified` (same type `heading`)
- [ ] Multiple simultaneous changes (add + remove + modify)
- [ ] List item added to bullet list → list block is `modified`
- [ ] Callout content changed → `modified`
- [ ] Code block language changed → `modified`
- [ ] Code block content changed → `modified`
- [ ] Table row added → table block is `modified`
- [ ] Empty document → non-empty document → all `added`
- [ ] Non-empty → empty → all `removed`
- [ ] Block moved (paragraph from top to bottom) → shows as `removed` + `added`
- [ ] Frontmatter added → `hasFrontmatterChange: true`
- [ ] Frontmatter modified → `hasFrontmatterChange: true`
- [ ] Frontmatter removed → `hasFrontmatterChange: true`
- [ ] No frontmatter change → `hasFrontmatterChange: false`
- [ ] Summary counts match actual diffs
- [ ] Adjacent removed paragraph + added paragraph → paired as `modified`
- [ ] Adjacent removed heading + added paragraph → NOT paired (different types), stay as `removed` + `added`

### Unit Tests — Alignment (`test/unit/diff-alignment.test.ts`)
- [ ] All unchanged → all rows have real blocks on both sides
- [ ] Single added block → placeholder on left, real block on right
- [ ] Single removed block → real block on left, placeholder on right
- [ ] Modified block → real blocks on both sides, both marked as modified
- [ ] Complex mix → correct row count and alignment
- [ ] Empty diff → empty alignment

## Definition of Done

- [ ] All acceptance criteria met
- [ ] 30+ unit tests written and passing
- [ ] `npm test` passes with no regressions
- [ ] Human review completed
