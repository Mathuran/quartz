# Undo/Redo System Fixes Design Document

**Author:** Claude
**Status:** APPROVED
**Created:** 2026-02-20
**Last Updated:** 2026-02-20
**Reviewers:** TBD

---

## 1. Problem Statement

The Quartz editor's undo/redo functionality fails in several critical scenarios:

1. **Undo after slash command insertion** - When a user inserts a heading via `/h1`, pressing Cmd+Z does not remove the heading
2. **Undo after block movement** - When a user moves a block with Alt+Arrow, Cmd+Z does not restore the original order
3. **Multiple rapid undos** - Pressing Cmd+Z multiple times in quick succession does not properly revert to earlier states

These issues break a fundamental editing expectation: that any action can be undone. Users lose confidence in the editor when undo doesn't work reliably, and may avoid using features like slash commands or block movement out of fear of making irreversible changes.

---

## 2. Goals and Non-Goals

### Goals

- **P0:** Undo after slash command insertion reverts to pre-command state within 1 Cmd+Z press
- **P0:** Undo after block movement restores original block order within 1 Cmd+Z press
- **P0:** 5 consecutive rapid Cmd+Z presses successfully undo 5 distinct actions
- **P1:** Redo (Cmd+Shift+Z) restores any undone action correctly
- **P1:** Undo history survives across focus changes within the same session
- **P2:** Undo grouping is intuitive (typing groups by pause, not by character)

### Non-Goals

- Persistent undo history across sessions (requires local storage)
- Collaborative undo (multi-user scenarios)
- Undo for external file changes (VS Code handles this)
- Fine-grained undo configuration UI

---

## 3. Background and Context

### Current Implementation

The editor uses TipTap's built-in History extension which wraps ProseMirror's `prosemirror-history` module. This provides:

- Automatic transaction grouping based on time and composition
- Undo/redo commands bound to keyboard shortcuts
- History stored in memory as a stack of document states

### Root Causes Identified

1. **Slash command transactions:** The slash command extension may dispatch multiple transactions or use `appendTransaction` in a way that doesn't create proper history entries
2. **Block movement transactions:** The `moveBlockUp`/`moveBlockDown` functions create complex transactions that may not be atomic from history's perspective
3. **Rapid undo debouncing:** TipTap's history may group rapid changes or have race conditions with debounced updates

### Related Files

- `src/webview/extensions/keyboardShortcuts.ts` - Block movement implementation
- `src/webview/extensions/slashCommandExtension.ts` - Slash command handling
- `src/webview/Editor.tsx` - TipTap editor configuration with History extension

### TipTap History Configuration

```typescript
// Current configuration
History // Default settings
```

The History extension accepts configuration options like `depth` (max history items) and `newGroupDelay` (ms before starting new undo group).

---

## 4. Proposed Solution

### Overview

The fix involves ensuring all editor actions create atomic, undoable transactions. This requires:

1. Wrapping slash command actions in single transactions with proper marks
2. Ensuring block movement creates single atomic transactions
3. Reviewing history extension configuration for appropriate grouping

### Detailed Fixes

#### Fix 1: Slash Command Undo

The slash command likely dispatches actions via `editor.chain()` which should already create proper transactions. The issue may be that the command creates multiple separate transactions:

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

Additionally, ensure the slash menu dismissal and content insertion are part of the same transaction.

#### Fix 2: Block Movement Undo

The current `moveBlockDown`/`moveBlockUp` functions manually manipulate transactions:

```typescript
function moveBlockDown(editor: Editor): boolean {
  const { state, dispatch } = editor.view;
  const tr = state.tr;

  // Multiple operations on tr
  tr.delete(nextBlockPos, nextBlockEndPos);
  tr.delete(startPos, endPos);
  tr.insert(startPos, nextContent.content);
  tr.insert(startPos + nextContent.size, movingContent.content);

  dispatch(tr.scrollIntoView());
  return true;
}
```

This should work correctly as a single transaction. The issue may be with:

1. **Selection changes** not being tracked
2. **Mapping** between delete/insert operations causing issues
3. **Multiple dispatches** happening due to other extensions

**Solution:** Wrap in `editor.chain()` pattern and use TipTap's command API:

```typescript
function moveBlockDown(editor: Editor): boolean {
  return editor.chain()
    .command(({ tr, dispatch, state }) => {
      // All operations in a single command
      // ...
      if (dispatch) dispatch(tr.scrollIntoView());
      return true;
    })
    .run();
}
```

#### Fix 3: History Extension Configuration

Configure the History extension with appropriate settings:

```typescript
History.configure({
  depth: 50, // Keep 50 undo states (sufficient for typical editing sessions)
  newGroupDelay: 500, // Group changes within 500ms
})
```

Also ensure no other extensions are interfering by using `appendTransaction` incorrectly.

### Architecture

```
User Action
    │
    ▼
TipTap Command (editor.chain())
    │
    ▼
ProseMirror Transaction (single, atomic)
    │
    ▼
History Extension (captures state)
    │
    ▼
Undo (pops state, restores document)
```

---

## 5. Alternative Solutions Considered

### Alternative 1: Custom History Implementation

**Pros:**
- Full control over undo behavior
- Could support features like branching history

**Cons:**
- Significant effort to implement correctly
- Loses ProseMirror's battle-tested history logic
- Must handle all edge cases ourselves

**Decision:** Rejected - standard history should work if used correctly

### Alternative 2: Document-Level Snapshots

**Pros:**
- Simpler mental model
- Guaranteed to capture all changes

**Cons:**
- Memory intensive for large documents
- Doesn't support collaborative editing
- Loses fine-grained undo (typing)

**Decision:** Rejected - too coarse-grained

---

## 6. Security, Privacy, and Compliance

### Security Considerations

- History is stored in memory only; no persistence to disk
- No sensitive data exposure from history functionality

### Privacy

- Undo history could theoretically contain deleted sensitive text
- Memory is cleared when editor is closed
- No logging of history contents

### Compliance

- No compliance implications

---

## 7. Testing Strategy

### Unit Tests

Add tests for transaction atomicity (these may need to be integration-level):

```typescript
describe('History - Slash Commands', () => {
  it('should undo heading insertion in one step', async () => {
    // Setup editor with paragraph
    // Execute slash command for h1
    // Press undo
    // Verify heading is removed
  });
});
```

### E2E Tests

The following failing tests should pass after fixes:

```typescript
test('undo after slash command insertion', async ({ page }) => {
  // Insert heading via slash command
  // Verify heading exists
  // Press Cmd+Z
  // Verify heading is removed
});

test('undo after block movement', async ({ page }) => {
  // Move block down
  // Press Cmd+Z
  // Verify original order restored
});

test('multiple rapid undos work correctly', async ({ page }) => {
  // Make 5 distinct changes
  // Press Cmd+Z 5 times rapidly
  // Verify original state
});
```

### Manual Testing Scenarios

1. Type text, press Cmd+Z, verify text removed
2. Use slash command for each block type, undo each
3. Move blocks up and down multiple times, undo sequence
4. Mix typing with formatting with slash commands, undo entire sequence

---

## 8. Rollout Plan

### Phase 1: Diagnosis and Logging

- **Agent delivers:** Debug logging in slash command and block movement, test to reproduce issue consistently
- **Human reviews:** Logs to understand transaction flow
- **Approved when:** Root cause identified with evidence

### Phase 2: Transaction Atomicity Fixes

- **Agent delivers:** Refactored slash command and block movement to use proper transaction patterns
- **Human reviews:** Undo behavior in editor, test results
- **Approved when:** All 3 failing e2e tests pass

### Phase 3: History Configuration Tuning

- **Agent delivers:** Optimized History configuration, additional edge case tests
- **Human reviews:** Undo grouping feels natural
- **Approved when:** Manual testing confirms intuitive behavior

### Rollback Plan

Revert to previous implementation. No data at risk since history is memory-only.

---

## 9. Human Validation Plan

| Checkpoint | Agent Produces | Human Validates | Blocks |
|------------|----------------|-----------------|--------|
| Root cause analysis | Diagnostic logs, hypothesis | Confirms understanding | Phase 2 |
| Transaction fixes | Code changes | Undo feels correct | Phase 3 |
| Configuration tuning | History config | Grouping intuition | Release |
| Final testing | All tests pass | 10-minute manual exploration | Release |

---

## 10. Dependencies and Risks

### Dependencies

- TipTap History extension behavior (well-documented)
- ProseMirror transaction model (well-documented)

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| TipTap/ProseMirror bug | High | Low | Check GitHub issues, consider upgrading |
| Fix breaks other undo scenarios | High | Medium | Comprehensive test suite including existing tests |
| Performance impact from history | Medium | Low | Limit history depth, monitor memory |
| Fix is more complex than anticipated | Medium | Medium | Time-box investigation, escalate if needed |

---

## 11. Open Questions

*Questions resolved:*

1. ~~**History depth:**~~ **RESOLVED:** 50 undo steps is sufficient.
2. ~~**Typing grouping:**~~ **RESOLVED:** 500ms grouping delay is appropriate.
3. **External extension interference:** Are any other TipTap extensions using `appendTransaction` that might interfere? (Owner: Engineering - requires code audit during Phase 1)

---

