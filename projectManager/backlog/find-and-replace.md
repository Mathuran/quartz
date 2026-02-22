# Find and Replace in WYSIWYG Editor

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P1                           |
| **Tags**       | editor, ux                   |
| **Related**    | [keyboard-shortcut-fixes](../design-docs/keyboard-shortcut-fixes.md) |
| **Created**    | 2026-02-21                   |

## Problem

Quartz replaces VS Code's native text editor with a custom webview-based WYSIWYG editor. Because of this, VS Code's built-in `Cmd+F` / `Ctrl+F` find-and-replace does not work inside the editor. Users who open a markdown file in Quartz have no way to search within or replace text in their document.

This is a fundamental editor capability that every user expects to work. The workaround — switching to VS Code's default text editor to search, then switching back — breaks the editing flow entirely. Users editing longer documents (notes, documentation, READMEs) are affected most frequently.

## Desired Outcome

When a user presses `Cmd+F` (macOS) or `Ctrl+F` (Windows/Linux), a find bar appears at the top of the editor — visually consistent with VS Code's native find bar. They can:

- Type a search query and see all matches highlighted in the document
- Navigate between matches with `Enter` / `Shift+Enter` (or arrow buttons)
- See a match count indicator (e.g., "3 of 12")
- Press `Cmd+H` / `Ctrl+H` to expand the replace field
- Replace the current match or all matches
- Press `Escape` to dismiss the find bar

The experience should feel native to VS Code — users shouldn't notice they're in a custom editor.

## Scope & Boundaries

**In scope:**
- Find bar UI with search input, match highlighting, and navigation
- Replace bar with single and replace-all actions
- Keyboard shortcuts: `Cmd/Ctrl+F` (find), `Cmd/Ctrl+H` (replace), `Escape` (dismiss)
- Case-sensitive toggle
- Match count display

**Out of scope:**
- Regex search (can be added later)
- Whole-word matching toggle (can be added later)
- Find across multiple files (VS Code's native search handles this)
- Find-in-selection

## Open Questions

- Should the find bar use TipTap's built-in search/replace utilities or a custom implementation over ProseMirror's `TextSelection`?
- Should match highlighting use decorations (ProseMirror `DecorationSet`) or CSS-based highlighting?
- How should find interact with collapsed callout blocks — search inside them or skip?

## Notes

- TipTap has a community `SearchAndReplace` extension that could serve as a starting point
- VS Code's find bar styling can be approximated using `--vscode-*` CSS variables for native look and feel
- This was identified as a gap during competitive analysis — every comparable editor (Typora, Obsidian, Notion) supports find and replace
