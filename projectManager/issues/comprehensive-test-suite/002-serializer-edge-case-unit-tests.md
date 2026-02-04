# [002] Serializer Edge Case Unit Tests

## Metadata
- **Status:** TODO
- **Depends On:** —
- **Blocks:** 007
- **Scope:** M
- **Design Doc:** [comprehensive-test-suite](../../design-docs/comprehensive-test-suite.md)

## Description

Add ~15 new Vitest unit tests for the markdown serializer covering edge cases not in the existing `test/serializer.test.ts`. These target empty/malformed JSONContent, boundary values, and uncommon node combinations.

## Acceptance Criteria

- [ ] `test/unit/serializer-edge-cases.test.ts` exists with 15+ passing tests
- [ ] All tests run via `npm test` with no changes to `vitest.config.ts`
- [ ] No regressions in existing 87 tests

## Technical Notes

### Test Cases to Implement

1. Serialize doc with 0 content nodes (empty doc)
2. Serialize table with empty cells
3. Serialize table where header has fewer cells than body rows
4. Serialize ordered list starting at 0
5. Serialize ordered list starting at 999
6. Serialize task list with mixed checked/unchecked items
7. Serialize paragraph with adjacent marks (bold then italic, no gap)
8. Serialize link containing bold text
9. Serialize image with special characters in URL (spaces, unicode)
10. Serialize details/toggle block
11. Serialize deeply nested blockquotes (3 levels)
12. Serialize list item containing a blockquote
13. Serialize list item containing a code block
14. Serialize doc with every node type in sequence
15. Serialize hardBreak at end of paragraph (trailing spaces edge case)

### Files to Create
- `test/unit/serializer-edge-cases.test.ts`

### Key Considerations
- Import `serializeMarkdown` from `../src/markdown/serializer`
- Build JSONContent manually for each test (same pattern as existing serializer tests)
- Use the `doc()` and `paragraph()` helper pattern from `test/features.test.ts`

## Tests Required

### Unit Tests
- [ ] All 15 cases listed above pass or fail with documented reasons
- [ ] No existing tests break

## Definition of Done

- [ ] All acceptance criteria met
- [ ] 15+ new tests written and passing
- [ ] No regressions in existing functionality
