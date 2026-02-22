# Document Templates

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P2                           |
| **Tags**       | editor, ux, devex            |
| **Related**    | [claude-code-integration](../design-docs/claude-code-integration.md) |
| **Created**    | 2026-02-21                   |

## Problem

Structured documents (design docs, RFCs, ADRs, READMEs, changelogs) need to follow a consistent format with specific required sections. Today, users either start from scratch and forget sections, copy-paste from a previous document and edit out the old content, or rely on AI to generate the structure — which produces inconsistent results across documents.

When AI agents generate or edit structured documents, there is no contract defining what sections are required, what order they should appear in, or what content belongs in each section. The AI guesses, and often guesses differently each time. This leads to design docs with missing "Testing Strategy" sections, READMEs without "Installation" steps, and changelogs with inconsistent formatting.

The problem is worse in teams where multiple people (and multiple AI agents) create documents of the same type — there's no shared definition of "what a design doc looks like here."

## Desired Outcome

Users can define document templates that specify the structure of a document type: required sections, optional sections, section ordering, and brief descriptions of what each section should contain. Templates live as simple markdown or YAML files in the project.

From a template, users can:
1. **Scaffold** — Create a new document pre-filled with section headings and placeholder descriptions. The user (or an AI agent) fills in the content.
2. **Validate** — Check an existing document against a template. Missing required sections surface as warnings in the editor. Extra sections are fine.
3. **Guide AI** — When an AI agent generates content for a templated document, the template serves as the structural contract — the agent knows exactly what sections to produce.

Templates are project-scoped (live in the repo) and shareable across team members.

## Scope & Boundaries

**In scope:**
- Template definition format (markdown or YAML-based)
- Scaffold command: create a new document from a template (slash command + command palette)
- Validation: check a document against its associated template
- Inline warnings for missing required sections
- A small set of built-in templates (Design Doc, README, Changelog, ADR)

**Out of scope:**
- Section content validation (only structure is checked, not prose quality)
- Template inheritance or composition (template A extends template B)
- Template marketplace or sharing beyond the project repo
- Enforcing section ordering (warn on missing sections, don't reorder existing ones)

## Open Questions

- What's the simplest template format — a markdown file with heading annotations, or a YAML schema?
- How does a document declare which template it conforms to — frontmatter field, file path convention, or manual association?
- Should validation run automatically on save, or only on demand?

## Notes

- The Quartz project management plugin already uses implicit templates for design docs (`/design-doc` command produces a fixed structure) — this feature would make that pattern explicit and extensible
- Frontmatter is the natural place for template association: `template: design-doc`
- This pairs well with the `frontmatter-properties-editor` backlog item for editing template metadata in the WYSIWYG view
