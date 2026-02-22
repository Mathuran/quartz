# [003] E2E Tests and Polish

## Metadata
- **Status:** DONE
- **Depends On:** 001, 002
- **Blocks:** -
- **Scope:** S
- **Design Doc:** [option-arrow-movement-v2](../../design-docs/option-arrow-movement-v2.md)

## Description

Add E2E Playwright tests for list item movement and fix any edge cases discovered during testing. Verify undo/redo behavior and round-trip fidelity after moves.

## Acceptance Criteria

- [ ] E2E spec file covers single-item, multi-item, boundary escalation, and undo
- [ ] Undo reverses a list item move as a single atomic operation
- [ ] Round-trip fidelity holds after reordering list items
- [ ] All E2E tests pass
- [ ] No regressions in existing E2E specs

## Human Review Focus

- **Look at:** E2E test coverage — do the tests cover the key user workflows?
- **Test:** Final manual smoke test: 5-item bullet list, task list, ordered list. Reorder items, undo, verify.
- **Decide:** Is the feature ready to ship?

## Agent Autonomy Notes

- **Agent can decide:** E2E test structure, page object helpers, assertion strategy
- **Escalate to human:** Any edge cases discovered during E2E testing that require design decisions

## Technical Notes

### Files to Create/Modify
- `test/e2e/specs/list-item-movement.spec.ts` — new E2E spec file

### Key Considerations
- Use the existing E2E harness and page objects
- Test keyboard shortcuts via `page.keyboard.press('Alt+ArrowUp')`
- Verify document content via the serialized markdown output

## Tests Required

### E2E Tests (`test/e2e/specs/list-item-movement.spec.ts`)
- [ ] Move single bullet list item up and down
- [ ] Move single task list item — verify check state preserved
- [ ] Move 2 selected items as a group
- [ ] Boundary escalation — first item up moves entire list
- [ ] Paragraph block movement still works
- [ ] Undo reverses a list item move
- [ ] Round-trip fidelity after move

## Definition of Done

- [ ] All acceptance criteria met
- [ ] E2E tests written and passing
- [ ] Human review completed (final smoke test)
- [ ] No regressions in existing E2E specs
