# [002] Edge Case Tests and Hardening

## Metadata
- **Status:** DONE
- **Depends On:** 001
- **Blocks:** -
- **Scope:** S
- **Design Doc:** [ai-agent-compatibility](../../design-docs/ai-agent-compatibility.md)

## Description

Add integration tests for external change handling and harden any edge cases found during Phase 1 manual QA. This includes testing the change origin guard, debounce behavior, and feedback loop prevention at the integration level.

## Acceptance Criteria

- [ ] Integration test: external file change sends `externalChange` message to webview
- [ ] Integration test: webview-originated edits do NOT trigger `externalChange` back
- [ ] Integration test: rapid external changes are debounced to a single notification
- [ ] Any edge case bugs found during Phase 1 review are fixed
- [ ] All test suites pass (unit, integration, E2E)

## Human Review Focus

- **Look at:** New integration test file — are the test cases sufficient? Do they cover the feedback loop scenario?
- **Test:** Run `npm run test:integration` and `npm run test:e2e` — all pass
- **Decide:** Is test coverage adequate to ship?

## Agent Autonomy Notes

- **Agent can decide:** Test structure, mock strategy, assertion approach
- **Escalate to human:** If integration tests reveal the boolean flag approach is insufficient (feedback loops in practice), escalate before switching to content hash comparison

## Technical Notes

### Suggested Approach

1. Create `test/integration/external-change.test.ts`
2. Test scenarios:
   - Modify `TextDocument` programmatically, verify `externalChange` message is posted
   - Send `update` message from webview mock, verify no `externalChange` echo
   - Apply 5 rapid document changes, verify only 1 `externalChange` fires after debounce
3. Fix any edge case bugs surfaced during Phase 1 human review

### Files to Create
- `test/integration/external-change.test.ts`

### Files to Modify (if edge cases found)
- `src/QuartzEditorProvider.ts` — Any fixes from Phase 1 review
- `src/webview/App.tsx` — Any timing adjustments

### Key Considerations
- Integration tests run inside a real VS Code instance — use `vscode.workspace.openTextDocument` and `vscode.workspace.applyEdit` to simulate external changes
- The E2E tests in `test/e2e/specs/external-change.spec.ts` already exist — verify they pass with the Phase 1 fix

## Tests Required

### Integration Tests
- [ ] External file change triggers `externalChange` message
- [ ] Own edits (from webview) do not trigger `externalChange`
- [ ] Rapid changes are debounced to single notification

### E2E Tests
- [ ] Verify existing `external-change.spec.ts` tests pass (no new tests needed)

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Integration tests written and passing
- [ ] E2E external-change tests passing
- [ ] Human review completed
- [ ] No regressions in any test suite
