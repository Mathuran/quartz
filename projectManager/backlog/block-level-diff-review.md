# Block-Level Diff Review

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P1                           |
| **Tags**       | editor, ux, infrastructure   |
| **Related**    | [ai-agent-compatibility](./ai-agent-compatibility.md), [claude-code-integration](../design-docs/claude-code-integration.md) |
| **Created**    | 2026-02-21                   |

## Problem

When an AI agent rewrites a markdown file, the user currently has two options: accept the entire change blindly or reject it entirely. There is no way to see what specifically changed at a block level, and no way to cherry-pick individual changes.

This is a daily friction for anyone using AI to edit documentation, design docs, or READMEs. AI agents frequently make good changes to some sections while introducing unwanted rewrites in others — changing tone, removing context the author intentionally included, or restructuring sections the author preferred as-is. Without block-level visibility, users must manually diff the before/after in a separate tool, then re-apply the parts they wanted.

This problem compounds with `ai-agent-compatibility` — once external changes auto-reload into the editor, users need a way to review what changed rather than having content silently replaced.

## Desired Outcome

When an external change arrives (AI agent, git pull, other editor), the WYSIWYG view shows an inline diff at the block level. Each changed block (paragraph, heading, list, code block, etc.) is visually highlighted — additions in green, deletions in red, modifications showing both old and new. The user can accept or reject each block individually with a single click. Accepting all or rejecting all is also available as a bulk action.

After the user finishes reviewing, the editor settles into the accepted state and the diff UI disappears. If the user takes no action, the new content is accepted by default after a configurable timeout (or on the next edit).

## Scope & Boundaries

**In scope:**
- Block-level diff computation between old and new document content
- Inline visual diff rendering in the WYSIWYG editor
- Per-block accept/reject controls
- Bulk accept-all / reject-all actions
- Integration with the external change detection from `ai-agent-compatibility`

**Out of scope:**
- Character-level or word-level inline diffs within a single block (block-level granularity is sufficient)
- Three-way merge conflict resolution
- Diff view for local undo/redo history
- Side-by-side diff layout (inline only)

## Open Questions

- What diffing algorithm works best at the block (ProseMirror node) level — structural tree diff vs. flattened block list comparison?
- Should the diff view persist across editor sessions, or reset when the file is closed?
- How should this interact with rapid sequential AI edits — show diff against original pre-AI content, or against each incremental change?

## Notes

- This feature builds on top of `ai-agent-compatibility` — that feature provides the external change detection plumbing, this feature provides the review UX
- ProseMirror has a `prosemirror-changeset` library that may be useful for computing structural diffs
- Similar UX exists in Google Docs "Suggested Edits" and GitHub PR review — both proven patterns
