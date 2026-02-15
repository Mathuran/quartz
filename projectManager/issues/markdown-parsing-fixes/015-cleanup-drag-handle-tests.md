# [015] Clean Up Drag Handle Tests

## Metadata
- **Status:** DONE
- **Depends On:** 001, 002
- **Blocks:** —
- **Scope:** XS
- **Design Doc:** [markdown-parsing-fixes](../../design-docs/markdown-parsing-fixes.md)

## Description

After removing the drag handle (issue 001) and adding block movement shortcuts (issue 002), clean up the existing drag handle e2e tests and update to test the new behavior.

## Acceptance Criteria

- [ ] `test/e2e/specs/drag-drop.spec.ts` is deleted or repurposed
- [ ] `test/e2e/pages/editor.page.ts` removes `dragHandle()` method
- [ ] New tests for `Alt+Arrow` block movement are in place
- [ ] No test failures related to drag handle
- [ ] Test suite runs cleanly

## Technical Notes

### Files to Delete/Modify
- `test/e2e/specs/drag-drop.spec.ts` — Delete or repurpose
- `test/e2e/pages/editor.page.ts` — Remove `dragHandle()` locator method

### Files to Create
- `test/e2e/specs/block-movement.spec.ts` — New tests for Alt+Arrow

### New Test Cases

```typescript
// block-movement.spec.ts
test.describe('Block Movement', () => {
  test('Alt+ArrowDown moves paragraph down', async ({ page }) => {
    // Setup: 3 paragraphs
    // Place cursor in first
    // Press Alt+ArrowDown
    // Verify first paragraph is now second
  });

  test('Alt+ArrowUp moves paragraph up', async ({ page }) => {
    // Setup: 3 paragraphs
    // Place cursor in second
    // Press Alt+ArrowUp
    // Verify second paragraph is now first
  });

  test('Alt+ArrowUp at top does nothing', async ({ page }) => {
    // Place cursor in first paragraph
    // Press Alt+ArrowUp
    // Verify no change (no error either)
  });
});
```

### Key Considerations
- Ensure no dead code references to drag handle remain
- Update any documentation that mentions drag handle

## Tests Required

### Integration Tests
- [ ] Test suite runs without errors after cleanup
- [ ] No references to drag handle in test output

### Manual Testing
- [ ] Run `npm test` — all tests pass
- [ ] No "drag handle" references in error messages

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Test suite runs cleanly
- [ ] Code reviewed
- [ ] No dead code or references to drag handle
