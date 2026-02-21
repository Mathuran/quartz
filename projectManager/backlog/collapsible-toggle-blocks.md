# Collapsible Toggle Blocks

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P1                           |
| **Tags**       | editor, ux                   |
| **Related**    | [callouts-and-admonitions](./callouts-and-admonitions.md) |
| **Created**    | 2026-02-20                   |

## Problem

Long markdown documents become hard to navigate. Meeting notes, technical specs, FAQs, and documentation often have sections that are useful to keep but not always relevant to read. Users want to collapse sections to focus on what matters. Currently, Quartz has no way to hide or collapse content — every block is always fully visible.

Notion's toggles are one of its most-used features. Obsidian supports collapsible callouts. HTML `<details>` tags work in GitHub markdown but render as raw HTML in most editors.

## Desired Outcome

A user types `/toggle` in the slash menu or uses the `<details>` syntax and gets a collapsible block:
- A clickable arrow/chevron that expands or collapses the content
- A summary line visible when collapsed (the toggle title)
- Any content can live inside the toggle (paragraphs, lists, code blocks, etc.)
- Toggles can be nested inside other toggles
- Default state (open or closed) is configurable per toggle

The user can organize long documents into scannable, expandable sections.

## Scope & Boundaries

**In scope:**
- Visual toggle blocks with expand/collapse behavior
- Slash command `/toggle` to insert
- Support `<details>/<summary>` HTML syntax for compatibility
- Nested toggles
- Keyboard accessibility (Enter/Space to toggle)
- Serialization to `<details>` HTML blocks (GitHub/standard compatible)

**Out of scope:**
- Heading-level folding (collapsing everything under an H2)
- Remembering toggle state across editor sessions
- Outline/table-of-contents integration with toggles

## Open Questions

- Should toggles use `<details>` HTML syntax (portable) or a custom syntax?
- Should collapsible callouts (`> [!note]-`) be a variant of toggles or a separate feature?
- How should toggles behave during search (expand if match found inside)?

## Notes

- This pairs naturally with callouts — collapsible callouts are essentially callout + toggle combined
- `<details>` syntax is already supported by GitHub, making it a safe serialization choice
- Implementing toggles first may simplify the callouts feature (shared collapse logic)
