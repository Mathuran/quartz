# Markdown Diagnostics

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P2                           |
| **Tags**       | editor, ux, parsing          |
| **Related**    | [parser-edge-case-fixes](../design-docs/parser-edge-case-fixes.md) |
| **Created**    | 2026-02-21                   |

## Problem

AI-generated markdown is structurally sloppy. Common issues include: relative links that point to files that don't exist, heading hierarchies that skip levels (h1 → h3), orphaned footnote references, images referencing missing files, and inconsistent list nesting. These issues are invisible in a WYSIWYG view — the document looks fine until someone clicks a broken link or the markdown renders poorly in another tool.

External linters (markdownlint) can catch some of these issues, but they operate on raw text and can't see the rendered document structure. A WYSIWYG editor has a unique advantage: it has the parsed document tree and can validate structural relationships that text-based linters miss.

Users working with AI-generated content need a fast feedback loop — write (or generate) content, see what's wrong, fix it. Currently there's no feedback loop at all within the Quartz editor.

## Desired Outcome

The editor shows inline diagnostic warnings for structural issues in the document. Warnings appear as subtle underlines or margin indicators on the affected blocks — not intrusive, but visible. Hovering shows the issue description. Where possible, a one-click auto-fix is available.

Diagnostics the editor should catch:
- **Broken relative links** — `[see here](./nonexistent.md)` where the target file doesn't exist in the workspace
- **Heading hierarchy gaps** — h1 followed directly by h3 with no h2
- **Duplicate headings** — multiple identical heading texts (breaks anchor links)
- **Orphaned footnotes** — footnote references with no definition, or definitions with no reference
- **Unreachable images** — `![alt](./missing.png)` where the image file doesn't exist
- **Empty sections** — a heading immediately followed by another heading with no content between them

Diagnostics update live as the user edits. They also run on document load to catch issues in AI-generated content immediately.

## Scope & Boundaries

**In scope:**
- Structural diagnostics based on the parsed document tree
- Inline visual indicators for each diagnostic
- Hover tooltips with issue descriptions
- Auto-fix for issues with obvious corrections (e.g., fix heading hierarchy by adjusting heading level)
- Workspace-aware checks (broken links resolve against the VS Code workspace)

**Out of scope:**
- Prose quality checks (grammar, spelling, readability scores)
- Style enforcement (line length, trailing whitespace, formatting preferences) — that's markdownlint's job
- Custom diagnostic rules or user-defined checks
- Diagnostics panel integration with VS Code's Problems view (start with inline only)

## Open Questions

- Should diagnostics integrate with VS Code's native Diagnostics API (yellow/red squiggles in the Problems panel) or stay self-contained within the WYSIWYG view?
- How expensive is workspace-wide link validation — should it be debounced or run only on demand for large workspaces?
- Should empty sections be a warning (some documents intentionally have placeholder headings)?

## Notes

- The parser already produces a full ProseMirror document tree — diagnostics can walk this tree without re-parsing
- VS Code's `workspace.findFiles` API can efficiently check whether link targets exist
- Heading hierarchy validation is trivial to implement — good candidate for the first diagnostic rule
- This feature pairs well with `document-templates` — template validation is a specialized form of diagnostics
