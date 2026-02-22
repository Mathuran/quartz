# AI Agent Compatibility Design Document

**Author:** Claude
**Status:** APPROVED
**Created:** 2026-02-21
**Last Updated:** 2026-02-21
**Reviewers:** Mathuran Sadagopan
**Related Docs:** [backlog](../backlog/ai-agent-compatibility.md), [claude-code-integration](./claude-code-integration.md)

---

## 1. Problem Statement

When a user has a `.md` file open in the Quartz WYSIWYG editor and an external AI coding agent (Claude Code, Cursor, Copilot, Aider) edits the same file on disk, the editor does not refresh. The user sees stale content. If they then make edits in the WYSIWYG view, their save overwrites the agent's changes, causing data loss.

This is P0 because AI-assisted development is now a primary workflow for the target audience. Developers routinely have markdown files open while agents edit READMEs, documentation, and design docs. The current workaround — closing and reopening the file — breaks flow and is error-prone.

## 2. Goals and Non-Goals

### Goals

- **P0:** When an external process modifies a `.md` file open in Quartz, the WYSIWYG view updates within 500ms without manual intervention
- **P0:** External content loads do not add entries to the undo history — users cannot "undo" back to stale content
- **P0:** The editor does not trigger a save-back (feedback loop) when receiving an external change — external changes are received passively
- **P1:** Rapid sequential external changes (e.g., agent saving 5 times in 2 seconds) are debounced to avoid unnecessary re-renders, settling on the final content
- **P1:** If the user has a pending debounced edit when an external change arrives, the external change wins (agent's version takes priority)

### Non-Goals

- Conflict resolution UI (prompt asking "keep local or accept external") — external changes always win
- Partial/diff-based updates — full document reload is acceptable and simpler
- Real-time collaborative editing (OT/CRDT)
- Integrating AI directly into the editor (separate feature)

## 3. Background and Context

### Root Cause Analysis

The plumbing for external changes already exists but is **not wired up**:

1. **Extension host** (`QuartzEditorProvider.ts:41-52`): The `onDidChangeTextDocument` listener fires when the file changes, but the handler body at line 49-50 is empty — it has a comment `// Debounce external change notifications` but never sends a message to the webview.

2. **Webview App** (`App.tsx:40-42`): Already handles `externalChange` messages and passes updated content to the `Editor` component via state.

3. **Editor component** (`Editor.tsx:213-247`): Already handles content updates from props — parses the new markdown, calls `setContent` with undo history suppression via `tr.setMeta('addToHistory', false)`.

The fix is straightforward: complete the empty handler in `QuartzEditorProvider.ts` to send an `externalChange` message with the updated document content. The webview already does the right thing.

### Feedback Loop Risk

A critical subtlety: when the editor receives an external change and calls `setContent`, TipTap fires `onUpdate`, which triggers `serializeMarkdown` → `postMessage({ type: 'update' })` → `applyEdits()` → `WorkspaceEdit.replace()`. This replace fires another `onDidChangeTextDocument` event, creating an infinite loop.

The solution is a **change origin guard**: track whether a change came from the webview (our edit) or from outside (external edit), and only forward external changes to the webview.

## 4. Proposed Solution

### Overview

Complete the missing wiring in `QuartzEditorProvider.ts` with a debounced external change notifier and a change origin guard to prevent feedback loops.

### Detailed Design

#### 4.1 Change Origin Guard

Track edits originating from the webview using a flag:

```typescript
// In resolveCustomTextEditor:
let isApplyingWebviewEdit = false;

// In the 'update' message handler:
case 'update':
  isApplyingWebviewEdit = true;
  await this.applyEdits(document, message.content);
  isApplyingWebviewEdit = false;
  return;
```

In the `onDidChangeTextDocument` handler, skip changes that originated from the webview:

```typescript
const onDocumentChange = vscode.workspace.onDidChangeTextDocument((e) => {
  if (e.document.uri.toString() !== document.uri.toString()) return;
  if (e.contentChanges.length === 0) return;
  if (isApplyingWebviewEdit) return; // Skip our own edits

  // Debounce and send external change
  sendExternalChange();
});
```

#### 4.2 Debounced External Change Notification

Debounce rapid external changes (300ms, matching the editor's update debounce) and send the final content:

```typescript
let externalChangeTimeout: ReturnType<typeof setTimeout> | undefined;

function sendExternalChange() {
  if (externalChangeTimeout) clearTimeout(externalChangeTimeout);
  externalChangeTimeout = setTimeout(() => {
    webviewPanel.webview.postMessage({
      type: 'externalChange',
      content: document.getText(),
    });
  }, 300);
}
```

#### 4.3 Suppress Outbound Updates During External Load

When the webview receives an `externalChange`, it calls `setContent`, which fires `onUpdate`. This would normally send the re-serialized content back to VS Code, triggering another edit. The `suppressUpdateRef` in `App.tsx:28` already exists but is unused. Wire it up:

```typescript
// In App.tsx externalChange handler:
case 'externalChange':
  suppressUpdateRef.current = true;
  setContent(message.content);
  // Re-enable after the editor processes the update
  setTimeout(() => { suppressUpdateRef.current = false; }, 500);
  break;
```

The `handleUpdate` callback at `App.tsx:52-55` already checks `suppressUpdateRef.current` and returns early.

#### 4.4 Cancel Pending User Edits on External Change

If the user has a pending debounced edit (300ms timer in `Editor.tsx:167-171`) when an external change arrives, the external change should cancel it. The `setContent` call in `Editor.tsx:231` triggers `onUpdate` which resets the debounce timer — but since `suppressUpdateRef` is true, the update won't fire. This is the correct behavior: the external content wins.

### Data Flow (External Change)

```
File on disk changes (AI agent save)
  → VS Code fires onDidChangeTextDocument
  → QuartzEditorProvider: isApplyingWebviewEdit? No → debounce 300ms
  → postMessage({ type: 'externalChange', content: document.getText() })
  → App.tsx: suppressUpdateRef = true, setContent(newContent)
  → Editor.tsx: useEffect detects initialContent change
    → safeParse(newContent) → setContent(doc) with addToHistory=false
    → onUpdate fires but suppressUpdateRef=true → no-op
  → setTimeout → suppressUpdateRef = false
  → User sees updated content, undo history clean
```

## 5. Alternative Solutions Considered

### Alternative A: FileSystemWatcher Instead of onDidChangeTextDocument

Use `vscode.workspace.createFileSystemWatcher` to watch the file directly on disk rather than relying on the TextDocument event.

**Pros:** Works even if VS Code hasn't loaded the document into memory; more reliable for external processes.
**Cons:** Fires on disk writes which may be incomplete (partial writes); TextDocument events are already debounced by VS Code and guaranteed to reflect complete content; adds unnecessary complexity. The `onDidChangeTextDocument` event already fires for external file changes when the document is open in a `CustomTextEditorProvider`.

**Decision:** Rejected. `onDidChangeTextDocument` is sufficient and simpler.

### Alternative B: Content Hash Comparison

Instead of a change origin guard, hash the content on both sides. When the webview sends an update, store the hash. When `onDidChangeTextDocument` fires, compare the new content hash to the stored hash — if they match, it's our own edit; if they differ, it's external.

**Pros:** More robust than a boolean flag; works even if VS Code batches or reorders events.
**Cons:** Hashing adds CPU overhead on every change; the boolean flag approach is standard practice in VS Code custom editors and well-understood. Could use as a fallback if the flag approach has edge cases.

**Decision:** Start with the boolean flag. Add hash comparison only if feedback loop bugs surface.

## 6. Security, Privacy, and Compliance

- No new APIs, network calls, or data storage introduced
- External file content is already trusted (it's the user's own workspace file)
- No change to CSP policy — messages stay within the existing webview ↔ extension host channel
- The `suppressUpdateRef` timeout (500ms) is a defense against accidentally suppressing user edits permanently — it auto-resets even if the external change flow errors

## 7. Testing Strategy

### Unit Tests (Vitest) — Project: `features`, groupOrder: 3

No new unit tests needed — the parser/serializer roundtrip behavior is unchanged.

### Integration Tests (@vscode/test-cli)

**New test file:** `test/integration/external-change.test.ts`

| Test | Description |
|------|-------------|
| External file change updates editor | Programmatically modify the TextDocument and verify the webview receives `externalChange` |
| Own edits don't trigger external change | Send an `update` from webview, verify no `externalChange` is sent back |
| Rapid external changes are debounced | Apply 5 rapid changes, verify only 1 `externalChange` message is sent |

### E2E Tests (Playwright) — Project: `features`

Existing `test/e2e/specs/external-change.spec.ts` already covers:
- External change replaces editor content
- External change after user edit overwrites with external content
- Rapid external changes settle on final content

These tests should pass once the wiring is complete. If they were previously skipped or mocked, enable them.

### Manual QA

1. Open a `.md` file in Quartz
2. In a terminal, run `echo "# Changed by agent" > file.md`
3. Verify the editor updates within 1 second
4. Press `Cmd+Z` — verify it does NOT undo back to old content
5. Type in the editor, then quickly run the terminal command again — verify agent's version wins

## 8. Rollout Plan

### Phase 1: Wire up external change handler (Scope: S)

- **Agent delivers:** Updated `QuartzEditorProvider.ts` with change origin guard and debounced `externalChange` message. Updated `App.tsx` to use `suppressUpdateRef`. All existing tests passing.
- **Human reviews:** Code diff (~30 lines changed). Manual QA: open file in Quartz, edit it externally, verify refresh.
- **Approved when:** External changes appear in the editor, no feedback loop, undo history clean.

### Phase 2: Edge case hardening (Scope: S)

- **Agent delivers:** Integration test for external changes. Edge case fixes if found during Phase 1 review (e.g., race conditions, rapid changes).
- **Human reviews:** Test cases, any edge case fixes.
- **Approved when:** All tests pass, no regressions in E2E suite.

## 9. Human Validation Plan

| Checkpoint | Agent Produces | Human Validates | Blocks |
|------------|---------------|-----------------|--------|
| Phase 1 code | ~30 line diff in 2 files | Manual QA: external edit → refresh, no loop, clean undo | Phase 2 |
| Phase 2 tests | Integration test file, E2E confirmation | Test coverage adequacy | Ship |

**Blocking human decisions:** None — the approach is clear, no design ambiguity.

## 10. Dependencies and Risks

**Dependencies:** None. All required APIs (`onDidChangeTextDocument`, `webview.postMessage`) are already used in the codebase.

**Risks:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Feedback loop (edit echo) | High — infinite loop freezes editor | Low — guard flag prevents it | Boolean flag + suppressUpdateRef + 500ms auto-reset |
| Race condition: user edits during external change | Medium — user loses a few keystrokes | Low — 300ms debounce window is short | External change wins by design; acceptable tradeoff |
| `applyEdits` is async but flag is sync | Medium — flag could be cleared before edit completes | Low — `WorkspaceEdit.applyEdit` returns a Promise | Await the promise before clearing the flag |

## 11. Open Questions

| Question | Owner | Status |
|----------|-------|--------|
| Should `applyEdits` await the Promise from `vscode.workspace.applyEdit()`? Currently fire-and-forget. | Agent | Resolve during Phase 1 |
| Does the 500ms `suppressUpdateRef` timeout need tuning for very large documents? | Human (manual QA) | Test during Phase 1 |

## 12. Implementation Issues

| # | Title | Status | Scope |
|---|-------|--------|-------|
| [001](../issues/ai-agent-compatibility/001-wire-external-change-handler.md) | Wire Up External Change Handler and Feedback Loop Prevention | DONE | S |
| [002](../issues/ai-agent-compatibility/002-edge-case-tests-and-hardening.md) | Edge Case Tests and Hardening | TODO | S |

**Progress:** 1/2 issues complete (50%)
