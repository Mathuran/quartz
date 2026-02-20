# [003] Fix Task List Capital X Recognition

## Metadata
- **Status:** DONE
- **Depends On:** None
- **Blocks:** None
- **Scope:** S
- **Design Doc:** [parser-edge-case-fixes](../../design-docs/parser-edge-case-fixes.md)

## Description

Task lists with capital X (`- [X] Done`) are not recognized as checked items. Only lowercase `[x]` works. Both forms should be treated as checked per CommonMark GFM spec.

## Acceptance Criteria

- [ ] `- [X] Task` parses as checked task item
- [ ] `- [x] Task` continues to work (no regression)
- [ ] `- [ ] Task` parses as unchecked task item
- [ ] Mixed case in same document works correctly

## Human Review Focus

- **Look at:** The `isTaskItem` and `convertToTaskItem` functions in parser
- **Test:** Load markdown with `- [X] Done` - verify checkbox is checked
- **Decide:** None

## Agent Autonomy Notes

- **Agent can decide:** Regex pattern for case-insensitive matching
- **Escalate to human:** None expected

## Technical Notes

### Suggested Approach
1. Find `isTaskItem` function - verify regex includes `X`: `/^\[[ xX]\]\s/`
2. Find `convertToTaskItem` function - ensure `match[1].toLowerCase() === 'x'`
3. The regex should already support `[X]` but the check logic might not

### Files to Modify
- `src/markdown/parser.ts` - Update task item detection and conversion

### Key Considerations
- Use case-insensitive comparison: `match[1].toLowerCase() === 'x'`
- Don't change the unchecked case (`[ ]`) handling

## Tests Required

### Unit Tests
- [ ] `- [X] Task` parsed as `checked: true`
- [ ] `- [x] Task` parsed as `checked: true`
- [ ] `- [ ] Task` parsed as `checked: false`
- [ ] Mixed document with both `[X]` and `[x]` works

### E2E Tests
- [ ] Capital X task shows as checked in editor

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Human review completed
- [ ] No regressions in existing task list parsing
