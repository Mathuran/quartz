# [006] Parser Block-Level Content Loss Fixes

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** 007
- **Scope:** M
- **Design Doc:** [codebase-review-findings](../../design-docs/codebase-review-findings.md)

## Description

Several block-level handlers silently drop content. The blockquote handler only handles paragraphs and lists, silently dropping headings, code blocks, HRs, tables, and HTML blocks. The list handler forces all items to `taskItem` if any item is a task. The `<details>` regex fails for multi-token structures. Various bounds checks are missing.

**Findings:** 2.2, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.16, 2.17, 2.18, 2.19, 2.20, 2.21, 2.22

## Acceptance Criteria

- [x] `parseBlockquote` handles `fence`/`code_block`, `hr`, `heading_open`, `html_block`, and `table_open` inside blockquotes
- [ ] Mixed task/regular lists preserve regular items as `listItem` (not forced to `taskItem`) — deferred as design decision, TODO added in list.ts
- [x] `hasFrontmatter` uses the same YAML validation as `extractFrontmatter` (consistent behavior)
- [x] `<details>` handler has a fallback for multi-token structures (renders as raw HTML block if regex fails)
- [x] Heading handler bounds-checks `tokens[index + 1]` and `tokens[index + 2]`
- [x] `isTaskItem` regex supports `- [x]` without trailing space (empty task items)
- [x] `parseBlockquote` safety limit logs a warning when hit
- [x] Recursive `<details>` parsing has a depth limit (e.g., 10 levels)
- [x] Empty table produces at minimum a valid single-row table structure
- [x] Table row parsing handles missing `inline` token gracefully

## Human Review Focus

- **Look at:** The blockquote handler changes — ensure all new block types render correctly inside `> `
- **Test:** Parse a markdown file with `> # Heading`, `> \`\`\`code\`\`\``, `> ---` inside blockquotes
- **Decide:** Whether mixed task/regular lists should split into separate lists or preserve mixed structure

## Agent Autonomy Notes

- **Agent can decide:** Implementation approach for each handler fix, depth limit value, fallback behavior
- **Escalate to human:** Mixed task/regular list behavior (split vs. mixed preservation) — this is a design decision

## Technical Notes

### Suggested Approach
1. **Blockquote:** Add cases for `fence`, `hr`, `heading_open`, `html_block`, `table_open` in `parseBlockquote` at depth 1 — delegate to the appropriate handler via `context`
2. **Task lists:** Keep the current behavior for now but add a TODO comment — this is a design decision that needs user input
3. **Frontmatter:** Make `hasFrontmatter` use `extractFrontmatter` internally and check the result
4. **Details:** Add a try/catch around the regex match with raw HTML block fallback
5. **Heading/paragraph bounds:** Add `index + 1 < tokens.length` checks
6. **Task regex:** Change `/^\[[ xX]\]\s/` to `/^\[[ xX]\](\s|$)/` to match end-of-string
7. **Safety limit:** Add `console.warn` when limit is hit
8. **Recursion depth:** Pass a depth counter through `context.parseMarkdown`
9. **Empty table:** Return a table with one empty row if no rows found
10. **Table cell:** Handle `td_open` followed by `td_close` (no inline token)

### Files to Modify
- `src/markdown/handlers/blockquote.ts` — Add block type handling
- `src/markdown/handlers/list.ts` — Task list regex fix, add TODO for mixed list design decision
- `src/markdown/handlers/htmlBlock.ts` — Details fallback, recursion depth limit
- `src/markdown/handlers/heading.ts` — Bounds check
- `src/markdown/handlers/paragraph.ts` — Bounds check
- `src/markdown/handlers/table.ts` — Empty table, cell token handling
- `src/markdown/frontmatter.ts` — Consistent `hasFrontmatter`

### Key Considerations
- The blockquote fix is the highest impact — headings and code blocks inside blockquotes are common
- The mixed task list issue is a design decision; fixing the regex is unambiguous
- Adding a code comment about the trailing newline strip in `codeBlock.ts` (finding 2.22) is trivial

## Tests Required

### Unit Tests
- [x] Blockquote with heading: `> # Title` parses correctly
- [x] Blockquote with code block: `> \`\`\`js\ncode\n\`\`\`` parses correctly
- [x] Blockquote with HR: `> ---` parses correctly
- [ ] Mixed list: `- Regular\n- [x] Task` preserves regular item type — deferred as design decision
- [x] Empty task item: `- [x]` (no trailing text) detected as task
- [x] `hasFrontmatter` returns false for `---\nhello world\n---` (no YAML key-value)
- [x] Deeply nested `<details>` (11+ levels) does not stack overflow
- [x] Empty table produces valid structure
- [x] Heading at end of token stream (malformed) does not crash

### Roundtrip Tests
- [x] Blockquote containing heading, code block, and HR round-trips correctly
- [x] Frontmatter detection consistent between `hasFrontmatter` and `extractFrontmatter`

## Definition of Done

- [x] All acceptance criteria met (9/10 — mixed list deferred as design decision)
- [x] Unit tests written and passing
- [x] Roundtrip tests written and passing
- [ ] Human review completed (see Human Review Focus above)
- [x] No regressions in existing parser functionality
