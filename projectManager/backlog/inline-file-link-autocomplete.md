# Inline File Link Autocomplete

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P1                           |
| **Tags**       | editor, devex, ux            |
| **Related**    | [wiki-links-and-backlinks](./wiki-links-and-backlinks.md), [notion-markdown-editor](../design-docs/notion-markdown-editor.md) |
| **Created**    | 2026-02-20                   |

## Problem

When inserting a standard markdown link (`[text](path)`), users must remember or manually browse for the correct file path. This is especially painful in large workspaces with deeply nested directories. Typos in paths create broken links that are hard to detect. Image paths are even worse — users often copy-paste absolute paths that break when the project is cloned elsewhere.

Every modern editor (Notion, Obsidian, Google Docs) provides instant search-and-link for internal references. VS Code's built-in markdown preview resolves links but the editing experience offers no path assistance.

## Desired Outcome

When a user types `](` after link text, or uses `Cmd+K` to insert a link, an autocomplete dropdown appears showing:
- Files in the workspace, searchable by name
- Recently opened files at the top
- Images filtered when in an image context (`![alt](`)
- Relative paths auto-calculated from the current file's location

Selecting a file inserts the correct relative path. The link "just works" without the user needing to know the directory structure.

## Scope & Boundaries

**In scope:**
- File path autocomplete triggered when typing inside `](` or via link dialog
- Fuzzy search across workspace files
- Relative path calculation from current file
- Image file filtering for image links
- Integration with existing Cmd+K link dialog
- Broken link detection (visual indicator for links to missing files)

**Out of scope:**
- URL autocomplete for external links
- Bookmark/anchor linking within the same file
- Auto-fixing broken links when files move
- Image preview in the autocomplete dropdown

## Open Questions

- Should the autocomplete show file previews (first line of content)?
- How should we handle very large workspaces (10,000+ files) — index lazily?
- Should broken links show a warning inline or only on hover?

## Notes

- This is a lower-effort, high-value feature that dramatically reduces friction
- Can share infrastructure with wiki-links (same file search backend)
- If wiki-links are implemented first, this becomes a natural extension for standard link syntax
- The VS Code workspace API provides efficient file search that can power this
