# [002] Fix Slash Command Undo

## Metadata
- **Status:** TODO
- **Depends On:** 001-diagnose-undo-transactions
- **Blocks:** 004-configure-history-extension
- **Scope:** M
- **Design Doc:** [undo-redo-system-fixes](../../design-docs/undo-redo-system-fixes.md)

## Description

When a user inserts a heading via `/h1` slash command, pressing Cmd+Z does not remove the heading. The slash command likely dispatches multiple transactions instead of a single atomic transaction. Fix to ensure all slash command actions are undoable with one Cmd+Z.

## Acceptance Criteria

- [ ] Insert heading via `/h1`, press Cmd+Z - heading is removed
- [ ] Insert code block via `/code`, press Cmd+Z - code block is removed
- [ ] Insert bullet list via `/bullet`, press Cmd+Z - list is removed
- [ ] All slash commands are undoable in one step

## Human Review Focus

- **Look at:** Transaction chaining in slash command execution
- **Test:** Insert heading via slash, undo - verify single undo removes it
- **Decide:** Does undo feel correct and immediate?

## Agent Autonomy Notes

- **Agent can decide:** How to restructure command chains
- **Escalate to human:** If fix requires architectural changes

## Technical Notes

### Suggested Approach
Based on diagnosis from issue 001, likely fix is to combine multiple chain calls:

```typescript
// Problem: Multiple transactions
editor.chain().focus().clearNodes().run();
editor.chain().focus().setHeading({ level: 1 }).run();

// Solution: Single chained transaction
editor.chain()
  .focus()
  .clearNodes()
  .setHeading({ level: 1 })
  .run();
```

Also ensure menu dismissal and content insertion are atomic.

### Files to Modify
- `src/webview/extensions/slashCommandExtension.ts` - Consolidate chains

### Key Considerations
- Each slash command should result in exactly one history entry
- The range deletion (removing `/` text) must be part of the same transaction
- Test all slash command types, not just heading

## Tests Required

### Unit Tests
- N/A - best tested via e2e

### E2E Tests
- [ ] Insert `/h1`, undo - heading removed
- [ ] Insert `/code`, undo - code block removed
- [ ] Insert `/bullet`, undo - list removed
- [ ] Insert `/quote`, undo - blockquote removed

### Manual Testing
- [ ] Insert heading via slash command, press Cmd+Z immediately
- [ ] Verify original state (empty line or previous content) is restored

## Definition of Done

- [ ] All acceptance criteria met
- [ ] E2E tests written and passing
- [ ] Human review completed
- [ ] No regressions in slash command functionality
