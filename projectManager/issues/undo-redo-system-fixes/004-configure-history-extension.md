# [004] Configure History Extension

## Metadata
- **Status:** DONE
- **Depends On:** 002-fix-slash-command-undo, 003-fix-block-movement-undo
- **Blocks:** None
- **Scope:** S
- **Design Doc:** [undo-redo-system-fixes](../../design-docs/undo-redo-system-fixes.md)

## Description

Configure the TipTap History extension with appropriate settings for undo depth and grouping delay. This ensures intuitive undo behavior for typing (grouped by pause) and sufficient history depth for editing sessions.

## Acceptance Criteria

- [ ] History depth set to 50 undo states
- [ ] New group delay set to 500ms (typing groups by pause)
- [ ] 5 consecutive rapid Cmd+Z presses undo 5 distinct actions
- [ ] Typing within 500ms is grouped into single undo

## Human Review Focus

- **Look at:** History.configure() settings in Editor.tsx
- **Test:** Type quickly, undo - verify typing grouped; type slowly, undo - verify not grouped
- **Decide:** Does the undo grouping feel natural?

## Agent Autonomy Notes

- **Agent can decide:** Configuration values (already specified: 50 depth, 500ms delay)
- **Escalate to human:** If grouping feels wrong during testing

## Technical Notes

### Suggested Approach
Update Editor.tsx where History extension is configured:

```typescript
History.configure({
  depth: 50,          // Keep 50 undo states
  newGroupDelay: 500, // Group changes within 500ms
})
```

### Files to Modify
- `src/webview/Editor.tsx` - Add History configuration

### Key Considerations
- `depth: 50` is sufficient for typical editing sessions
- `newGroupDelay: 500` matches common editor behavior
- Monitor memory usage if concerned (50 states is reasonable)

## Tests Required

### Unit Tests
- N/A - configuration only

### E2E Tests
- [ ] Rapid typing grouped as single undo
- [ ] Slow typing (>500ms pauses) creates separate undo entries
- [ ] 5 consecutive undos work correctly

### Manual Testing
- [ ] Type quickly, undo - all typing undone at once
- [ ] Type, wait 1 second, type more, undo - only second part undone
- [ ] Perform 10 distinct actions, press Cmd+Z 10 times

## Definition of Done

- [ ] All acceptance criteria met
- [ ] E2E tests written and passing
- [ ] Human review completed
- [ ] Undo behavior feels intuitive
