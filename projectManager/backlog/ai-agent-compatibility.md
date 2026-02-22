# AI Agent Compatibility for Markdown Editing

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P0                           |
| **Tags**       | editor, ux, bug-adjacent     |
| **Related**    | [claude-code-integration](../design-docs/claude-code-integration.md) |
| **Created**    | 2026-02-21                   |

## Problem

When a user has a `.md` file open in the Quartz WYSIWYG editor and an external AI coding agent (Claude Code, Cursor, Copilot, Aider, etc.) edits the same file on disk, the editor does not refresh to reflect the changes. The user continues seeing stale content in the WYSIWYG view while the underlying file has been rewritten.

This is a critical problem because AI-assisted development is now a primary workflow. Developers routinely have markdown files open in VS Code while an AI agent makes changes — editing READMEs, updating documentation, modifying design docs. If the editor doesn't pick up those changes, users either work with stale content (risking data loss when they save) or must close and reopen the file manually every time the agent edits it.

The workaround today is to close the Quartz editor tab and reopen the file, which breaks flow and defeats the purpose of a live editor.

## Desired Outcome

When an external process (AI agent, terminal command, git operation, another editor) modifies a `.md` file that's open in Quartz, the WYSIWYG view updates automatically within 1-2 seconds to reflect the new content. The user sees the updated document without any manual intervention.

If the user has unsaved local edits in the WYSIWYG editor when an external change arrives, the editor should either:
- Show a notification asking whether to keep local changes or accept the external update, or
- Accept the external update (since AI agents typically produce the "intended" version)

The update should not add to the undo history — the user shouldn't be able to "undo" an external file change back to stale content.

## Scope & Boundaries

**In scope:**
- Detecting external file changes while the editor is open
- Refreshing the WYSIWYG view with the new file content
- Handling the conflict case (local unsaved edits vs. external changes)
- Ensuring external content loads don't pollute the undo history

**Out of scope:**
- Real-time collaborative editing (multiple cursors, OT/CRDT)
- Integrating AI directly into the editor (separate feature: claude-code-integration)
- Partial/diff-based updates (full document reload is acceptable)

## Open Questions

- Does VS Code's `CustomTextEditorProvider` already fire `onDidChangeTextDocument` when external processes modify the file, or do we need a `FileSystemWatcher`?
- Should we debounce rapid external changes (e.g., an agent making multiple rapid saves)?
- What's the right UX for the conflict case — auto-accept external changes, or prompt the user?

## Notes

- The `QuartzEditorProvider` already has some debouncing logic for external changes but it may not be fully wired to the webview
- TipTap's `setContent` adds to undo history by default — must use raw ProseMirror transaction with `tr.setMeta('addToHistory', false)` for external content loads (documented in project memory)
- This is a prerequisite for the claude-code-integration feature — if the editor can't handle external file changes, inline AI features won't work either
