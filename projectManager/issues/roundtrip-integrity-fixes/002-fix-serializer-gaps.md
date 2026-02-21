# [002] Fix Serializer Gaps for Complex Documents

## Metadata
- **Status:** DONE
- **Depends On:** 001-investigate-roundtrip-timeout
- **Blocks:** 003-add-roundtrip-tests
- **Scope:** M
- **Design Doc:** [roundtrip-integrity-fixes](../../design-docs/roundtrip-integrity-fixes.md)

## Description

Based on the diagnosis from issue 001, fix any serializer gaps that prevent complex documents from roundtripping correctly. This may include handling edge cases in node serialization, empty content arrays, or missing attributes.

## Acceptance Criteria

- [ ] Document with heading + list + code + table serializes without error
- [ ] All parser-produced node types can be serialized
- [ ] Empty content arrays handled gracefully
- [ ] Missing attributes don't cause serialization failures

## Human Review Focus

- **Look at:** Serializer changes based on diagnosis
- **Test:** Load complex document, edit, save - verify structure preserved
- **Decide:** Is the serialized output correct?

## Agent Autonomy Notes

- **Agent can decide:** Implementation details for edge case handling
- **Escalate to human:** If fix requires changes to serialization format

## Technical Notes

### Suggested Approach
Based on diagnosis, likely fixes include:
1. Add fallbacks for empty content: `content || []`
2. Handle missing attrs: `attrs || {}`
3. Add serialization for any node types the parser produces but serializer doesn't handle

### Files to Modify
- `src/markdown/serializer.ts` - Add edge case handling

### Key Considerations
- Every node type produced by parser must have serializer case
- Test with documents containing all block types
- Preserve formatting choices where possible (asterisks vs underscores)

## Tests Required

### Unit Tests
- [ ] Serialize heading + paragraph + list document
- [ ] Serialize document with code block
- [ ] Serialize document with table
- [ ] Serialize document with nested blockquotes

### E2E Tests
- [ ] Complex document roundtrip preserves structure

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Human review completed
- [ ] No content loss during roundtrip
