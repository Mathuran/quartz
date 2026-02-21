# Option+Arrow Line Movement in Lists

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P0                           |
| **Tags**       | bug-adjacent, editor, ux     |
| **Related**    | [keyboard-shortcut-fixes](../design-docs/keyboard-shortcut-fixes.md) |
| **Created**    | 2026-02-21                   |

## Problem

When editing list items (bullet lists, numbered lists, and task lists), pressing **Option+Arrow Up/Down** (Alt+Arrow on Windows/Linux) moves the entire list block instead of the individual list item. This is a fundamental editing action that users rely on constantly to reorder content.

The expected behavior — matching VS Code's native text editor, Notion, and other editors — is that Option+Arrow should move just the current line/list item up or down within the list, not drag the whole list block as a unit.

This affects all list types (unordered, ordered, and task lists) and significantly disrupts the editing workflow.

## Desired Outcome

When a user places their cursor on a list item and presses Option+Arrow Up or Down:

1. Only that individual list item moves up or down within the list
2. The surrounding list items reflow naturally
3. The cursor stays with the moved item
4. This works consistently across bullet lists, numbered lists, and task lists
5. The behavior matches what users expect from VS Code's native editor and Notion

## Scope & Boundaries

**In scope:**
- Fix Option+Arrow Up/Down to move individual list items in bullet lists
- Fix Option+Arrow Up/Down to move individual list items in numbered lists
- Fix Option+Arrow Up/Down to move individual list items in task lists
- Ensure cursor follows the moved item

**Out of scope:**
- Option+Arrow behavior in non-list contexts (paragraphs, headings, etc.)
- Drag-and-drop reordering of list items
- Moving list items across different lists or nesting levels

## Open Questions

- Is this a TipTap default behavior that needs to be overridden, or is it caused by a custom extension?
- Should Option+Arrow at the top/bottom of a list move the item out of the list entirely, or stop at the boundary?

## Notes

- TipTap/ProseMirror treats list items as nodes within a list node — the default "move line" behavior may not understand this nesting
- May require a custom keyboard shortcut handler in `keyboardShortcuts.ts` to intercept Option+Arrow and perform a list-item-level transaction
