# Issue Template

## File Naming Convention

Issues are numbered sequentially in implementation order:
```
issues/FEATURE-NAME/
├── 001-setup-database-schema.md
├── 002-implement-data-model.md
├── 003-create-api-endpoint.md
├── 004-add-validation-logic.md
└── 005-write-integration-tests.md
```

## Issue File Structure

```markdown
# [NNN] Issue Title

## Metadata
- **Status:** TODO | IN_PROGRESS | BLOCKED | DONE
- **Depends On:** [list of issue numbers, e.g., 001, 002]
- **Blocks:** [list of issue numbers this blocks]
- **Scope:** XS | S | M | L | XL
- **Design Doc:** [feature-name](../../design-docs/feature-name.md)

## Description

[Clear, concise description of what needs to be built. Include context
from the design doc but don't duplicate it. Focus on the specific scope
of this issue.]

## Acceptance Criteria

- [ ] Criterion 1: [specific, testable requirement]
- [ ] Criterion 2: [specific, testable requirement]
- [ ] Criterion 3: [specific, testable requirement]

## Technical Notes

[Implementation guidance, gotchas, suggested approaches. Not a full
implementation spec, but enough context to get started quickly.]

### Suggested Approach
1. Step one
2. Step two
3. Step three

### Files to Modify
- `path/to/file1.ts` - Add new function
- `path/to/file2.ts` - Update existing logic

### Key Considerations
- Consider X when implementing Y
- Watch out for edge case Z

## Tests Required

### Unit Tests
- [ ] Test case 1: [description]
- [ ] Test case 2: [description]

### Integration Tests
- [ ] Test case 1: [description]
- [ ] Test case 2: [description]

### Manual Testing (if applicable)
- [ ] Scenario 1: [steps to verify]

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] Documentation updated (if applicable)
- [ ] No regressions in existing functionality
```

## Scope Definitions

**XS (Extra Small)**
- < 1 hour of work
- Single file change
- Trivial logic
- Example: Fix typo, add logging, update config

**S (Small)**
- 1-4 hours of work
- Few files, limited scope
- Straightforward implementation
- Example: Add validation, simple API endpoint

**M (Medium)**
- 4-8 hours of work
- Multiple files, moderate complexity
- Some design decisions needed
- Example: New feature component, refactoring

**L (Large)**
- 1-2 days of work
- Significant scope
- Multiple components affected
- Example: New service, major feature

**XL (Extra Large)**
- 2+ days of work
- Consider breaking down further
- Complex cross-cutting concerns
- Example: Architecture change, new system

## Best Practices

### Writing Good Issues

1. **Be Specific**: "Add email validation" not "Handle emails better"
2. **Single Responsibility**: One issue = one logical change
3. **Testable**: Every issue should have verifiable acceptance criteria
4. **Self-Contained**: Include enough context to work independently

### Dependencies

- Minimize dependencies where possible
- Never create circular dependencies
- If an issue has more than 3 dependencies, consider restructuring
- Document WHY something is a dependency, not just that it is

### Scope Guidelines

- If scope > M, consider breaking into smaller issues
- XL issues often indicate incomplete planning
- Prefer many small issues over few large ones
- Each issue should be completable in a single focused session

### Test Requirements

- Every code change needs tests (unit at minimum)
- Integration tests for cross-component functionality
- "N/A" only for non-code changes (docs, config)
- Specify test scenarios, not just "write tests"

## Status Transitions

```
TODO → IN_PROGRESS → DONE
         ↓
      BLOCKED
         ↓
    IN_PROGRESS
```

- **TODO**: Ready to be worked on (dependencies met)
- **IN_PROGRESS**: Actively being worked on
- **BLOCKED**: Cannot proceed (document blocker)
- **DONE**: All acceptance criteria and tests complete
