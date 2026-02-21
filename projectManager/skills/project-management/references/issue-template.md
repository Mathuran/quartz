# Issue Template

## File Naming Convention

Issues are numbered sequentially in implementation order:
```
issues/FEATURE-NAME/
├── 001-setup-database-schema.md
├── 002-implement-data-model.md
├── 003-create-api-endpoint.md
└── 004-add-validation-logic.md
```

## Issue File Structure

```markdown
# [NNN] Issue Title

## Metadata
- **Status:** TODO | IN_PROGRESS | BLOCKED | DONE
- **Depends On:** [list of issue numbers, e.g., 001, 002]
- **Blocks:** [list of issue numbers this blocks]
- **Scope:** XS | S | M | L
- **Design Doc:** [feature-name](../../design-docs/feature-name.md)

## Description

[Clear, concise description of what needs to be built. Include context
from the design doc but don't duplicate it. Focus on the specific scope
of this issue.]

## Acceptance Criteria

- [ ] Criterion 1: [specific, testable requirement]
- [ ] Criterion 2: [specific, testable requirement]
- [ ] Criterion 3: [specific, testable requirement]

## Human Review Focus

[What specifically the human should validate when this issue is complete.
Be precise — this tells the reviewer where to spend their time.]

- **Look at:** [what to inspect — UI output, test coverage, API shape, etc.]
- **Test:** [what to manually verify — click through X, confirm Y behavior]
- **Decide:** [any decisions needed before the next issue can start]

## Agent Autonomy Notes

[Guidance for the AI agent on what it can decide independently vs. what
requires human input.]

- **Agent can decide:** [implementation details, variable names, internal structure, test strategies]
- **Escalate to human:** [design choices that affect UX, breaking API changes, ambiguous requirements]

## Technical Notes

[Implementation guidance, gotchas, suggested approaches. Not a full
implementation spec — the agent can figure out the details.]

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
- [ ] Human review completed (see Human Review Focus above)
- [ ] No regressions in existing functionality
```

## Scope Definitions (Review-Cycle Based)

Scope measures human review effort, not coding effort. The AI agent handles implementation; the human gates quality.

**XS (Extra Small)**
- Agent completes in one pass
- Human review is a quick sanity check (< 5 min)
- Example: Config change, simple rename across files, add a flag

**S (Small)**
- Agent completes in one pass
- Human review takes 5-15 min to validate output
- Example: New utility function with tests, straightforward UI component

**M (Medium)**
- Agent may need 1-2 internal iterations
- Human review takes 15-30 min and may require one round of feedback
- Example: Feature component with interactions, new parser extension

**L (Large)**
- Agent needs multiple passes
- Human review involves testing behavior, not just reading code
- May need 1-2 rounds of feedback
- Consider splitting if there's a natural human review point in the middle
- Example: Complex interactive feature, new subsystem

**XL (Extra Large)**
- Do not create XL issues
- If scope feels XL, find the human validation point in the middle and split there

## Best Practices

### Drawing Issue Boundaries

The key question: **"Does the human need to see and approve this output before the agent continues?"**

1. **Split at human validation points** — where a human needs to review, approve, or decide
2. **Batch mechanical work** — if the agent can do A, B, C without human input, that's one issue
3. **Split at decision points** — if step B requires a human choice before step C, separate issues
4. **Each issue ends with a reviewable artifact** — tests passing, visible UI, working behavior
5. **Prefer fewer, larger issues** — agent speed means granularity is less valuable than clear review points

### Dependencies

- Minimize dependencies where possible
- Never create circular dependencies
- If an issue has more than 3 dependencies, consider restructuring
- Document WHY something is a dependency, not just that it is

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
- **IN_PROGRESS**: Agent is executing this issue
- **BLOCKED**: Cannot proceed (waiting on human decision or external dependency)
- **DONE**: All acceptance criteria met, human review passed
