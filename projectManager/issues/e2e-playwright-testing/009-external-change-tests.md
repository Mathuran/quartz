# [009] Write External Change Tests

## Metadata
- **Status:** DONE
- **Depends On:** 002, 003
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [e2e-playwright-testing](../../design-docs/e2e-playwright-testing.md)

## Description

Write tests that verify the `externalChange` message path works correctly — simulating scenarios where the markdown file is modified outside the editor (e.g., by a git pull or another editor). Covers P1 "External Changes" (2-3 tests).

## Acceptance Criteria

- [ ] `test/e2e/specs/external-change.spec.ts` exists with 2-3 tests:
  - Sending `externalChange` message replaces the editor content entirely
  - Sending `externalChange` after user has edited does not lose the external content (external content wins)
  - Sending multiple rapid `externalChange` messages settles on the last one
- [ ] Tests use `__updateConfig` or `window.postMessage` directly to simulate the extension host sending `externalChange`
- [ ] All tests pass via `npm run test:e2e`

## Technical Notes

### Suggested Approach
1. Create `test/e2e/specs/external-change.spec.ts`
2. To send `externalChange`, use `page.evaluate`:
   ```typescript
   await page.evaluate((content) => {
     window.postMessage({ type: 'externalChange', content }, '*');
   }, newContent);
   ```
3. After sending, wait for ProseMirror content to update (check for expected text in the DOM)
4. For the "rapid changes" test, send 3-5 messages in quick succession and verify only the last content remains

### Files to Create
- `test/e2e/specs/external-change.spec.ts`

### Key Considerations
- `externalChange` is handled in `App.tsx` line 70-71 — it calls `setContent(message.content)` which re-renders the editor with new content
- The editor should re-parse the markdown and render it fresh — verify by checking that old block elements are removed and new ones appear
- There may be a race condition if `externalChange` arrives while a debounced `update` is pending — the test should verify the editor stabilizes

## Tests Required

### E2E Tests (this IS the test issue)
- [ ] External change replaces editor content
- [ ] External change after user edit overwrites with external content
- [ ] Rapid external changes settle on final content

## Definition of Done

- [ ] All acceptance criteria met
- [ ] All 2-3 tests pass via `npm run test:e2e`
- [ ] No regressions in existing tests
