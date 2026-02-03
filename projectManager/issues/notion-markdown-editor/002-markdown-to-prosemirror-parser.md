# [002] Markdown-to-ProseMirror Parser

## Metadata
- **Status:** TODO
- **Depends On:** 001
- **Blocks:** 004, 005, 008, 009, 010
- **Scope:** M
- **Design Doc:** [notion-markdown-editor](../../design-docs/notion-markdown-editor.md)

## Description

Build the markdown-to-ProseMirror parsing layer (one half of the Markdown Bridge). This takes raw markdown text, parses it with `markdown-it`, and transforms the AST into a ProseMirror document node tree that TipTap can render.

This issue covers the core block types needed for the Alpha phase: paragraph, headings (1-6), bullet list, ordered list, code block, blockquote, horizontal rule, and inline marks (bold, italic, strikethrough, code, link). Additional block types (tables, task lists, images, callouts, etc.) are added in later issues.

## Acceptance Criteria

- [ ] `markdown-it` configured with CommonMark + GFM extensions
- [ ] Parser transforms markdown-it tokens to ProseMirror nodes for: paragraph, heading, bullet list, ordered list, code block (with language), blockquote, horizontal rule
- [ ] Inline marks parsed: bold, italic, strikethrough, inline code, link (with href)
- [ ] Frontmatter (YAML between `---`) preserved as a special opaque node
- [ ] Nested lists (up to 4 levels) parse correctly
- [ ] Unknown/unsupported syntax preserved as raw-text opaque blocks
- [ ] Empty documents parse to a single empty paragraph node
- [ ] Parser handles malformed markdown gracefully (no crashes)

## Technical Notes

### Suggested Approach
1. Install `markdown-it` and GFM plugin (`markdown-it-gfm` or individual plugins for tables, strikethrough, task lists)
2. Create `src/markdown/parser.ts` — main parse function: `parseMarkdown(text: string): ProseMirrorNode`
3. Define the ProseMirror schema in `src/editor/schema.ts` matching TipTap's expected node types
4. Write a token-to-node transformer that walks the markdown-it token stream and builds ProseMirror nodes
5. Handle frontmatter by pre-extracting it before feeding to markdown-it (frontmatter isn't standard CommonMark)
6. Wrap any unrecognized token types in a `rawBlock` node that stores the original markdown text

### Files to Create
- `src/markdown/parser.ts` — Main parser
- `src/markdown/tokenTransformer.ts` — markdown-it tokens → ProseMirror nodes
- `src/editor/schema.ts` — ProseMirror schema definition
- `src/markdown/frontmatter.ts` — Frontmatter extraction utility

### Key Considerations
- The schema must be aligned with TipTap's extension system — each node type corresponds to a TipTap extension
- `markdown-it` uses a token stream (not a tree), so the transformer needs to handle open/close token pairs
- Preserve source positions if possible (useful for debugging round-trip issues)
- Code blocks must preserve the language identifier (` ```typescript ` → `language: "typescript"`)

## Tests Required

### Unit Tests
- [ ] Parse empty string → single empty paragraph
- [ ] Parse headings H1-H6 with correct level attribute
- [ ] Parse bullet list with nested items (3 levels)
- [ ] Parse ordered list with start number
- [ ] Parse code block with language identifier
- [ ] Parse blockquote with nested content
- [ ] Parse horizontal rule
- [ ] Parse inline bold, italic, strikethrough, code, link
- [ ] Parse mixed inline marks (bold+italic)
- [ ] Parse frontmatter YAML block
- [ ] Parse unknown syntax as raw block (no crash)
- [ ] Parse document with 1000+ lines without error

### Integration Tests
- [ ] Parse real-world README.md files from popular GitHub repos
- [ ] Parse CommonMark spec examples (subset covering supported types)

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
