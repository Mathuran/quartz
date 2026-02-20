# [004] Fix Deeply Nested Blockquotes (3-4 levels)

## Metadata
- **Status:** DONE
- **Depends On:** None
- **Blocks:** 005-fix-lists-in-blockquotes
- **Scope:** M
- **Design Doc:** [parser-edge-case-fixes](../../design-docs/parser-edge-case-fixes.md)

## Description

Nested blockquotes beyond 2 levels do not render correctly. The recursive `parseBlockquote` function has depth tracking issues. Support up to 4 levels of nested blockquotes as decided in the design doc.

## Acceptance Criteria

- [ ] 3-level nested blockquote renders with proper hierarchy
- [ ] 4-level nested blockquote renders with proper hierarchy
- [ ] Each nesting level has visual differentiation (indentation/styling)
- [ ] Content within deeply nested blockquotes is preserved

## Human Review Focus

- **Look at:** The `parseBlockquote` function refactoring
- **Test:** Load markdown with `> > > > Deeply nested` - verify all 4 levels display
- **Decide:** Is the visual styling of nested levels acceptable?

## Agent Autonomy Notes

- **Agent can decide:** Internal recursion implementation
- **Escalate to human:** Visual styling of deeply nested blockquotes

## Technical Notes

### Suggested Approach
1. Find `parseBlockquote` function in `parser.ts`
2. Refactor to use explicit recursion with proper index tracking
3. Handle nested `blockquote_open` by recursing immediately
4. Cap at 4 levels (any deeper treated as 4th level)

### Files to Modify
- `src/markdown/parser.ts` - Refactor `parseBlockquote` function

### Key Considerations
- Test with content between nested quote levels
- Ensure proper index tracking when returning from recursion
- Consider performance with deeply nested structures

## Tests Required

### Unit Tests
- [ ] `> Level 1` parses correctly
- [ ] `> > Level 2` parses correctly
- [ ] `> > > Level 3` parses correctly
- [ ] `> > > > Level 4` parses correctly
- [ ] `> > > > > Level 5` treated as level 4

### E2E Tests
- [ ] 3-level nested blockquote renders in editor
- [ ] 4-level nested blockquote renders in editor

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Human review completed
- [ ] No regressions in existing blockquote parsing
