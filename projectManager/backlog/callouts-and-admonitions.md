# Callouts and Admonitions

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P0                           |
| **Tags**       | editor, ux, parsing          |
| **Related**    | [notion-markdown-editor](../design-docs/notion-markdown-editor.md), [markdown-parsing-fixes](../design-docs/markdown-parsing-fixes.md) |
| **Created**    | 2026-02-20                   |

## Problem

Technical writers, developers, and note-takers frequently need to visually emphasize blocks of content — warnings, tips, notes, important callouts, and danger notices. Currently, Quartz renders blockquotes but has no support for styled callouts. Users working with Obsidian-flavored markdown (`> [!note]`, `> [!warning]`, etc.) or documentation-heavy projects see their callouts rendered as plain blockquotes, losing critical visual meaning.

This is the single most requested feature across markdown editors. Obsidian, GitHub, and most documentation frameworks support callouts natively. Without them, Quartz falls short for documentation and knowledge-base use cases.

## Desired Outcome

When a user types `> [!note]` or selects "Callout" from the slash menu, a visually styled callout block appears with:
- A colored left border and subtle background tint matching the callout type
- An icon indicating the type (info, warning, tip, danger, etc.)
- An optional title line
- Support for collapsible callouts (`> [!note]-` for collapsed by default)
- Round-trip fidelity — callouts serialize back to the `> [!type]` syntax

The user feels like they're writing in Obsidian or Notion, but inside VS Code.

## Scope & Boundaries

**In scope:**
- Parsing `> [!type]` syntax (Obsidian-compatible) into visual callout blocks
- At least 8 callout types: note, tip, warning, danger, info, example, quote, abstract
- Colored styling with icons per type
- Slash command `/callout` with type picker
- Collapsible callouts (toggle open/closed)
- Serialization back to `> [!type]` markdown

**Out of scope:**
- Custom user-defined callout types
- GitHub-flavored `> [!NOTE]` uppercase variant (can be added later)
- Nested callouts within callouts

## Open Questions

- Should we support both Obsidian (`> [!note]`) and GitHub (`> [!NOTE]`) syntax variants?
- Should callout type be changeable via a dropdown after creation?
- How should callouts interact with the existing blockquote extension?

## Notes

- Obsidian callout syntax is becoming a de facto standard across tools
- This feature would make Quartz immediately viable for documentation workflows
- TipTap has community extensions for similar block types that could accelerate implementation
