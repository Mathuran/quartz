# [003] Round-Trip All Blocks Unit Tests

## Metadata
- **Status:** TODO
- **Depends On:** —
- **Blocks:** 007
- **Scope:** S
- **Design Doc:** [comprehensive-test-suite](../../design-docs/comprehensive-test-suite.md)

## Description

Add ~12 new Vitest unit tests that verify round-trip fidelity (parse → serialize → compare) for every individual block type, a combined document, and double round-trip idempotency. The existing `test/roundtrip.test.ts` has 13 tests but doesn't cover every block type individually or test double round-trip stability.

## Acceptance Criteria

- [ ] `test/unit/roundtrip-all-blocks.test.ts` exists with 12+ passing tests
- [ ] Each of the 13 implemented block types has a dedicated round-trip test
- [ ] Double round-trip idempotency verified: `serialize(parse(serialize(parse(md)))) === serialize(parse(md))`
- [ ] No regressions in existing 87 tests

## Technical Notes

### Test Cases to Implement

1. Paragraph round-trip
2. Heading (H1-H6) round-trip
3. Bullet list round-trip
4. Ordered list round-trip
5. Task list round-trip
6. Code block (with and without language) round-trip
7. Blockquote round-trip
8. Table round-trip
9. Horizontal rule round-trip
10. Image round-trip
11. Combined document with every block type
12. Double round-trip idempotency
13. Round-trip with frontmatter + all block types in body

### Files to Create
- `test/unit/roundtrip-all-blocks.test.ts`

### Key Considerations
- Import both `parseMarkdown` and `serializeMarkdown`
- For round-trip comparison, normalize trailing whitespace (serializer always adds trailing newline)
- The double round-trip test (`serialize(parse(serialize(parse(md))))`) is the strongest fidelity check — if this fails it indicates the parser/serializer disagree on a representation

## Tests Required

### Unit Tests
- [ ] All 13 cases pass
- [ ] No existing tests break

## Definition of Done

- [ ] All acceptance criteria met
- [ ] 12+ new tests written and passing
- [ ] No regressions in existing functionality
