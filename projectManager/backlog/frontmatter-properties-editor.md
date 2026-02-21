# Frontmatter Properties Editor

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P0                           |
| **Tags**       | editor, ux, parsing          |
| **Related**    | [notion-markdown-editor](../design-docs/notion-markdown-editor.md) |
| **Created**    | 2026-02-20                   |

## Problem

Most markdown files in documentation systems, static site generators (Hugo, Jekyll, Astro), and knowledge bases (Obsidian) use YAML frontmatter for metadata — title, date, tags, status, author, etc. Currently, Quartz preserves frontmatter as a raw code block at the top of the document. Users must manually type YAML syntax with correct indentation, which is error-prone and tedious.

Obsidian solved this with their Properties panel (v1.4+), and it became one of their most praised features. There is no equivalent in any VS Code markdown editor today.

## Desired Outcome

When a user opens a markdown file with frontmatter, a clean visual panel appears above the document content showing each property as a form field:
- Text fields for strings
- Date pickers for date values
- Tag inputs for arrays (comma-separated, with autocomplete from workspace tags)
- Checkboxes for boolean values
- The panel is collapsible so it doesn't take space when not needed

Editing a property updates the YAML frontmatter seamlessly. Adding or removing properties is done through an "Add property" button. The experience feels like editing a database row, not writing YAML.

## Scope & Boundaries

**In scope:**
- Visual rendering of existing YAML frontmatter as form fields
- Type inference (string, number, boolean, date, array)
- Inline editing of property values
- Add/remove properties
- Collapse/expand the properties panel
- Round-trip fidelity — properties serialize back to valid YAML
- Property name autocomplete from other files in workspace

**Out of scope:**
- Creating frontmatter templates
- Schema validation against a config file
- Dataview/database-style queries across files
- Nested YAML objects (flatten to dotted keys or show raw)

## Open Questions

- Should the properties panel be above the editor or in a sidebar?
- How should we handle complex YAML values (nested objects, multi-line strings)?
- Should we infer types from existing values across the workspace for autocomplete?

## Notes

- Obsidian's Properties feature is consistently cited as a top reason users choose it over VS Code
- This would be a major differentiator — no VS Code markdown editor offers this today
- The existing frontmatter parser already extracts YAML; this builds a visual layer on top
