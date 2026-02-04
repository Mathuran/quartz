# [001] Parser Edge Case Unit Tests

## Metadata
- **Status:** TODO
- **Depends On:** —
- **Blocks:** 007
- **Scope:** M
- **Design Doc:** [comprehensive-test-suite](../../design-docs/comprehensive-test-suite.md)

## Description

Add ~15 new Vitest unit tests for the markdown parser covering edge cases not in the existing `test/parser.test.ts`. These target deeply nested structures, malformed input, boundary conditions, and uncommon markdown patterns that the current 22 parser tests do not exercise.

## Acceptance Criteria

- [ ] `test/unit/parser-edge-cases.test.ts` exists with 15+ passing tests
- [ ] All tests run via `npm test` with no changes to `vitest.config.ts`
- [ ] No regressions in existing 87 tests

## Technical Notes

### Test Cases to Implement

1. Deeply nested lists (4 levels: bullet → ordered → task → bullet)
2. Blockquote containing code block
3. Table with pipes inside inline code in cells (`| \`a|b\` |`)
4. Table with 20+ columns
5. Empty document (only whitespace)
6. Document with only frontmatter and no body
7. Frontmatter with special YAML characters (`:`, `#`, `[]`, `{}`)
8. Consecutive horizontal rules (`---\n\n---\n\n---`)
9. Adjacent code blocks with different languages
10. Link with title attribute: `[text](url "title")`
11. Image with empty alt: `![](url)`
12. Nested inline marks: `***bold italic***`, `` **`bold code`** ``
13. HTML block that is not `<details>` (raw passthrough)
14. Paragraph with only inline code and no other text
15. Extremely long single line (10K+ characters)

### Files to Create
- `test/unit/parser-edge-cases.test.ts`

### Key Considerations
- Import `parseMarkdown` from `../src/markdown/parser`
- Some edge cases may reveal parser bugs — fix them or document as known limitations
- Use the same `describe`/`it`/`expect` patterns as existing test files

## Tests Required

### Unit Tests
- [ ] All 15 cases listed above pass or fail with documented reasons
- [ ] No existing tests break

## Definition of Done

- [ ] All acceptance criteria met
- [ ] 15+ new tests written and passing
- [ ] No regressions in existing functionality
