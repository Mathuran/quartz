# [005] Fix Lists Inside Blockquotes

## Metadata
- **Status:** DONE
- **Depends On:** 004-fix-nested-blockquotes
- **Blocks:** None
- **Scope:** M
- **Design Doc:** [parser-edge-case-fixes](../../design-docs/parser-edge-case-fixes.md)

## Description

Lists inside blockquotes fail to parse correctly. The parser needs to handle list tokens (`bullet_list_open`, `ordered_list_open`) when encountered inside a blockquote context.

## Acceptance Criteria

- [ ] Bullet list inside blockquote parses and displays correctly
- [ ] Ordered list inside blockquote parses and displays correctly
- [ ] Multi-item lists inside blockquotes work
- [ ] Nested list inside blockquote works (list > sublist)

## Human Review Focus

- **Look at:** The blockquote parser's handling of list tokens
- **Test:** Load markdown with `> - item 1\n> - item 2` - verify list displays inside quote
- **Decide:** None

## Agent Autonomy Notes

- **Agent can decide:** Implementation details for list detection inside blockquote
- **Escalate to human:** If nested lists inside blockquotes become complex

## Technical Notes

### Suggested Approach
1. Inside `parseBlockquote`, add handling for list tokens
2. When encountering `bullet_list_open` or `ordered_list_open`, call existing list parser
3. Insert the resulting list node into the blockquote's content array
4. Properly track and update the token index after parsing list

### Files to Modify
- `src/markdown/parser.ts` - Add list handling inside `parseBlockquote`

### Key Considerations
- Reuse existing `parseListItems` function if available
- Handle the blockquote prefix (`>`) that appears in the markdown
- Update index correctly after consuming list tokens

## Tests Required

### Unit Tests
- [ ] `> - item` parses as blockquote with bullet list
- [ ] `> 1. item` parses as blockquote with ordered list
- [ ] Multi-item lists inside blockquotes
- [ ] Nested lists inside blockquotes

### E2E Tests
- [ ] Bullet list inside blockquote renders
- [ ] Ordered list inside blockquote renders

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Human review completed
- [ ] No regressions in existing blockquote or list parsing
