# [003] Add Comprehensive Roundtrip Tests

## Metadata
- **Status:** TODO
- **Depends On:** 002-fix-serializer-gaps
- **Blocks:** None
- **Scope:** S
- **Design Doc:** [roundtrip-integrity-fixes](../../design-docs/roundtrip-integrity-fixes.md)

## Description

Add comprehensive roundtrip tests to ensure documents with various combinations of block types preserve their structure through the parse-serialize cycle. These tests serve as regression protection for future changes.

## Acceptance Criteria

- [ ] Unit tests for roundtrip with all block type combinations
- [ ] E2E test for complex document roundtrip with longer timeout
- [ ] Tests verify content preservation, not exact whitespace match
- [ ] All roundtrip tests pass

## Human Review Focus

- **Look at:** Test coverage for block type combinations
- **Test:** Run full test suite
- **Decide:** Is test coverage sufficient?

## Agent Autonomy Notes

- **Agent can decide:** Test structure, assertions, block combinations to test
- **Escalate to human:** None expected

## Technical Notes

### Suggested Approach
Add to test files:

```typescript
// Unit test
describe('Complex Document Roundtrip', () => {
  it('should preserve heading + list + code structure', () => {
    const input = `# Title\n\n- Item\n\n\`\`\`js\ncode\n\`\`\``;
    const parsed = parseMarkdown(input);
    const output = serializeMarkdown(parsed);

    expect(output).toContain('# Title');
    expect(output).toContain('- Item');
    expect(output).toContain('```');
  });
});

// E2E test with longer timeout
test('complex document roundtrips', async ({ page }) => {
  // ... load complex doc
  await page.waitForTimeout(1000); // Longer for complex doc
  const output = await waitForUpdate(page, -1, 5000); // 5s timeout
  expect(output).toContain('# Title');
  // ... more assertions
});
```

### Files to Modify
- `test/unit/parser-edge-cases.test.ts` or new file - Add roundtrip unit tests
- `test/e2e/specs/edge-cases.spec.ts` or new file - Add/fix roundtrip e2e test

### Key Considerations
- Use longer timeouts (5s) for complex document tests
- Verify structure (contains key markers) not exact match
- Test various combinations: heading+list, list+code, table+blockquote

## Tests Required

### Unit Tests
- [ ] Heading + paragraph + list roundtrip
- [ ] Code block + paragraph roundtrip
- [ ] Table + paragraph roundtrip
- [ ] Blockquote + list roundtrip
- [ ] Full complex document roundtrip

### E2E Tests
- [ ] Complex document edit and save preserves structure

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Comprehensive test coverage for roundtrip scenarios
- [ ] Human review completed
- [ ] All tests passing
