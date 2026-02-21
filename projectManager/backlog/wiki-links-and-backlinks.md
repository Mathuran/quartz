# Wiki-Style Links and Backlinks

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P0                           |
| **Tags**       | editor, ux, devex            |
| **Related**    | [notion-markdown-editor](../design-docs/notion-markdown-editor.md) |
| **Created**    | 2026-02-20                   |

## Problem

Markdown files in a workspace are isolated documents. When writing notes, documentation, or a knowledge base, users constantly need to reference other files. Today, this requires manually typing the full relative path in standard link syntax (`[text](../path/to/file.md)`), which is slow, error-prone, and breaks easily when files move.

Obsidian's entire value proposition is built on `[[wiki-links]]` that make connecting ideas frictionless. Users who maintain knowledge bases in VS Code have no equivalent — they either use Obsidian alongside VS Code or manually manage links.

## Desired Outcome

When a user types `[[`, an autocomplete dropdown appears showing files in the workspace. Selecting a file inserts a wiki-link that:
- Renders as a styled internal link in the editor (distinct from external links)
- Shows a hover preview of the linked document's first few lines
- Ctrl/Cmd+clicks to open the linked file in VS Code
- Supports display text: `[[filename|display text]]`
- A "Backlinks" section (collapsible) at the bottom of the editor shows which files link to the current document

The user can build a web of connected documents without leaving VS Code.

## Scope & Boundaries

**In scope:**
- `[[filename]]` and `[[filename|alias]]` syntax parsing and rendering
- File autocomplete triggered by `[[`
- Hover preview on wiki-links
- Click-to-open in VS Code
- Backlinks panel showing incoming links to current file
- Serialization back to `[[...]]` syntax (preserved in markdown)

**Out of scope:**
- Graph view (visual network of connections)
- Automatic link updating when files are renamed
- Block-level references (`[[file#heading]]` or `[[file^block]]`)
- Transclusion (embedding another file's content inline)

## Open Questions

- Should wiki-links be serialized as `[[...]]` (Obsidian compat) or converted to standard `[text](path)` links?
- How should broken links (file not found) be displayed?
- Should the backlinks panel be inside the editor webview or a VS Code sidebar panel?
- How to handle files with the same name in different directories?

## Notes

- This is the #1 reason people use Obsidian over VS Code for notes
- The VS Code API provides workspace file search that can power the autocomplete
- Backlinks require scanning workspace files, which should be done lazily/cached
- This transforms Quartz from "a nice editor" to "a knowledge management tool"
