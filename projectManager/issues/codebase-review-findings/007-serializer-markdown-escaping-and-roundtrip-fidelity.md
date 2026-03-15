# [007] Serializer Markdown Escaping and Round-Trip Fidelity

## Metadata
- **Status:** DONE
- **Depends On:** 005, 006
- **Blocks:** 008
- **Scope:** L
- **Design Doc:** [codebase-review-findings](../../design-docs/codebase-review-findings.md)

## Description

The serializer has no markdown escaping at all — text content, URLs, alt text, and inline code are written verbatim. This causes round-trip fidelity failures and malformed markdown for content containing markdown-significant characters like `*`, `**`, `]`, `)`, and backticks. Additionally, ordered list `start: 0` is silently lost, nested list indentation is wrong for ordered lists, and list items silently drop non-paragraph/non-list block children.

**Findings:** 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.11, 3.12, 3.14, 3.16

## Acceptance Criteria

- [x] Plain text nodes escape markdown-significant characters (`*`, `_`, `#`, `>`, `` ` ``, `[`, `]`, `~`, `|`) when they would trigger markdown parsing
- [x] Inline code wraps with double backticks + space when content contains backticks
- [x] Link/image hrefs with `)` are URL-encoded or wrapped in `<angle brackets>`
- [x] Link text with `]` is escaped as `\]`
- [x] Image alt text with `]` is escaped as `\]`
- [x] Ordered list `start` uses `??` instead of `||` (preserves `start: 0`)
- [x] Heading `level` uses `??` instead of `||` and clamps to 1-6
- [x] Nested list indentation uses marker width (2 for `- `, 3 for `1. `, 4 for `10. `) instead of fixed 2
- [x] List items with block-level children (blockquotes, code blocks, images, etc.) delegate to `serializeNode` instead of dropping
- [x] Table alignment info preserved in separator row (`:---`, `:---:`, `---:`) if present in node attrs
- [x] Empty table body rows produce proper empty-cell rows with pipe delimiters
- [x] Image serialization logic deduplicated between `inline.ts` and `image.ts`

## Human Review Focus

- **Look at:** The escaping logic — ensure it doesn't over-escape (e.g., `*` inside code blocks shouldn't be escaped)
- **Test:** Create content with Wikipedia URLs `https://en.wikipedia.org/wiki/Page_(disambiguation)`, text with `**literal asterisks**`, inline code with backticks
- **Decide:** Whether to use URL encoding or angle brackets for URLs with parentheses

## Agent Autonomy Notes

- **Agent can decide:** Escaping implementation approach (regex vs. character-by-character), where to place shared utilities
- **Escalate to human:** If escaping produces visually ugly but correct markdown — tradeoff between readability and correctness

## Technical Notes

### Suggested Approach
1. **Text escaping:** Create `escapeMarkdown(text: string): string` that escapes characters only at positions where they would trigger markdown parsing (context-aware escaping is ideal, but simple backslash-escaping is a good start)
2. **Inline code:** Use `` `` text `` `` (double backtick with spaces) when text contains single backtick
3. **URL escaping:** Replace `)` with `%29` in hrefs, or use `<url>` format: `[text](<url with parens>)`
4. **Alt/link text:** Escape `]` as `\]`
5. **Ordered list start:** Change `|| 1` to `?? 1`
6. **Heading level:** Change `|| 1` to `?? 1` and add `Math.max(1, Math.min(6, level))`
7. **Nested list indent:** Pass marker width through context or compute from parent type
8. **List item fallback:** Add `else { serializeNode(child, indent + markerWidth) }` branch
9. **Table alignment:** Check node attrs for alignment and emit colons in separator
10. **Table empty rows:** Emit `|   |   |` matching column count
11. **Image dedup:** Extract shared `serializeImage()` function

### Files to Modify
- `src/markdown/serializers/inline.ts` — Text escaping, code backtick handling, URL escaping, image dedup
- `src/markdown/serializers/image.ts` — Use shared image serializer
- `src/markdown/serializers/orderedList.ts` — `??` fix
- `src/markdown/serializers/heading.ts` — `??` fix + clamp
- `src/markdown/serializers/listUtils.ts` — Dynamic indent, fallback branch
- `src/markdown/serializers/table.ts` — Alignment, empty rows
- New: `src/markdown/serializers/utils.ts` (or add to existing) — Shared escaping utilities

### Key Considerations
- Escaping must be context-aware: don't escape `*` inside code blocks or raw HTML
- The inline serializer processes marks *around* text — escaping happens to the inner text, not the mark delimiters
- Over-escaping (escaping every `*` even when not at a word boundary) produces ugly but correct markdown
- Under-escaping causes round-trip failures — err on the side of correctness

## Tests Required

### Unit Tests
- [x] Text with `*asterisks*` in paragraph serializes with backslash escapes
- [x] Text with `# at start` in paragraph serializes with backslash escape on `#`
- [x] Inline code with backtick: `` `code with ` inside` `` uses double backticks
- [x] Link with URL `https://example.com/page_(1)` serializes correctly
- [x] Link text with `]` serializes with escape
- [x] Image alt with `]` serializes with escape
- [x] Ordered list with `start: 0` preserves `0.` prefix
- [x] Heading with `level: 0` produces `# ` (clamped to 1)
- [x] Heading with `level: 7` produces `###### ` (clamped to 6)
- [x] Nested bullet list inside ordered list indented to 3 spaces
- [x] Nested list inside 2-digit ordered list indented to 4 spaces
- [x] List item with blockquote child serializes the blockquote
- [x] List item with code block child serializes the code block
- [x] Table with alignment `center` produces `:---:` separator
- [x] Empty table row produces `|   |   |` with correct column count

### Roundtrip Tests
- [x] `parse(serialize(parse(md))) === parse(md)` for text with `**literal asterisks**`
- [x] Roundtrip for inline code with backticks
- [x] Roundtrip for links with parentheses in URLs
- [x] Roundtrip for ordered list starting at 0
- [x] Roundtrip for nested lists inside ordered lists

## Definition of Done

- [x] All acceptance criteria met
- [x] Unit tests written and passing
- [x] Roundtrip tests written and passing
- [ ] Human review completed (see Human Review Focus above)
- [x] No regressions in existing serializer functionality
