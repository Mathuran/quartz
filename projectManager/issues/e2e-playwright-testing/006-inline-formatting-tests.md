# [006] Write Inline Formatting Tests

## Metadata
- **Status:** DONE
- **Depends On:** 002, 003
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [e2e-playwright-testing](../../design-docs/e2e-playwright-testing.md)

## Description

Write tests that verify inline formatting renders correctly from markdown and that formatting can be applied via keyboard shortcuts. Covers P0 "Inline Formatting" (5-6 tests).

## Acceptance Criteria

- [ ] `test/e2e/specs/inline-formatting.spec.ts` exists with 5-6 tests covering:
  - Bold text (`**text**`) renders as `<strong>`
  - Italic text (`*text*`) renders as `<em>`
  - Inline code (`` `code` ``) renders as `<code>`
  - Strikethrough (`~~text~~`) renders as `<s>` or `<del>`
  - Links (`[text](url)`) render as `<a>` with correct href
  - Combined formatting (bold + italic, bold + code) renders with nested tags
- [ ] Tests use the `inline-formatting.md` fixture
- [ ] All tests pass via `npm run test:e2e`

## Technical Notes

### Suggested Approach
1. Create `test/e2e/specs/inline-formatting.spec.ts`
2. Load `inline-formatting.md` fixture for rendering verification
3. Also test individual inline content via `loadMarkdown` for isolation
4. Verify both tag presence and text content

### Files to Create
- `test/e2e/specs/inline-formatting.spec.ts`

### Key Considerations
- TipTap may render strikethrough as `<s>` or `<del>` depending on extension config — check both or use CSS selector `s, del`
- Links inside the editor may have additional TipTap attributes (e.g., `data-*`)
- Inline code inside code blocks should NOT be tested here (that's block rendering)

## Tests Required

### E2E Tests (this IS the test issue)
- [ ] Bold text renders as `<strong>` with correct text
- [ ] Italic text renders as `<em>` with correct text
- [ ] Inline code renders as `<code>` with correct text
- [ ] Strikethrough renders with correct tag
- [ ] Links render as `<a>` with correct href and text
- [ ] Combined formatting renders with nested tags

## Definition of Done

- [ ] All acceptance criteria met
- [ ] All 5-6 tests pass via `npm run test:e2e`
- [ ] No regressions in existing tests
