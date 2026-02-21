# [001] Diagnose Undo Transaction Issues

## Metadata
- **Status:** TODO
- **Depends On:** None
- **Blocks:** 002-fix-slash-command-undo, 003-fix-block-movement-undo
- **Scope:** S
- **Design Doc:** [undo-redo-system-fixes](../../design-docs/undo-redo-system-fixes.md)

## Description

Before fixing undo/redo issues, we need to diagnose why transactions aren't being recorded properly. This issue adds debug logging to understand the transaction flow for slash commands and block movement operations.

## Acceptance Criteria

- [ ] Debug logging added to slash command execution
- [ ] Debug logging added to block movement functions
- [ ] Debug logging added to History extension
- [ ] Log output captured showing transaction flow
- [ ] Root cause hypothesis documented

## Human Review Focus

- **Look at:** Console output showing transaction sequence
- **Test:** Perform slash command insert, then undo - observe logs
- **Decide:** Confirm root cause understanding before proceeding to fixes

## Agent Autonomy Notes

- **Agent can decide:** Where to add debug logging, log format
- **Escalate to human:** Share log output and proposed root cause

## Technical Notes

### Suggested Approach
1. Add console.log to slash command execution:
   ```typescript
   console.log('[Undo] Slash command: before chain');
   editor.chain().focus()...
   console.log('[Undo] Slash command: after chain');
   ```
2. Add logging to block movement functions in `keyboardShortcuts.ts`
3. Check if multiple transactions are dispatched (each should be one)
4. Verify History extension is receiving transactions

### Files to Modify
- `src/webview/extensions/slashCommandExtension.ts` - Add logging
- `src/webview/extensions/keyboardShortcuts.ts` - Add logging to moveBlock functions
- `src/webview/Editor.tsx` - Add logging to editor config if needed

### Key Considerations
- Logging is temporary for diagnosis
- Look for: multiple dispatches, async gaps, error swallowing
- Check if `appendTransaction` from other extensions interferes

## Tests Required

### Unit Tests
- N/A - diagnosis only

### E2E Tests
- N/A - manual log observation

### Manual Testing
- [ ] Execute slash command, check console for transaction logs
- [ ] Move block, check console for transaction logs
- [ ] Press undo, observe if history state changes are logged

## Definition of Done

- [ ] Debug logging implemented
- [ ] Log output captured and analyzed
- [ ] Root cause hypothesis documented in this issue
- [ ] Human confirms understanding of the issue
