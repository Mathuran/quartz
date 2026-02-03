# [003] ProseMirror-to-Markdown Serializer

## Metadata
- **Status:** TODO
- **Depends On:** 001
- **Blocks:** 004, 005, 008, 009, 010
- **Scope:** M
- **Design Doc:** [notion-markdown-editor](../../design-docs/notion-markdown-editor.md)

## Description

Build the ProseMirror-to-markdown serialization layer (the other half of the Markdown Bridge). This takes a ProseMirror document tree and emits valid CommonMark + GFM markdown text.

Covers the same core block types as issue 002: paragraph, headings, bullet list, ordered list, code block, blockquote, horizontal rule, and inline marks. The serializer must produce clean, idiomatic markdown output.

## Acceptance Criteria

- [ ] Serializer converts ProseMirror nodes to markdown for: paragraph, heading, bullet list, ordered list, code block (with language), blockquote, horizontal rule
- [ ] Inline marks serialized: bold (`**`), italic (`*`), strikethrough (`~~`), inline code (`` ` ``), link (`[text](url)`)
- [ ] Frontmatter opaque node serialized back as original YAML between `---`
- [ ] Raw-text opaque blocks serialized as original text (pass-through)
- [ ] Nested lists serialize with correct indentation
- [ ] Empty paragraphs serialize as blank lines
- [ ] No trailing whitespace in output (except where markdown requires it)
- [ ] Output uses consistent line endings (LF)

## Technical Notes

### Suggested Approach
1. Use `prosemirror-markdown`'s `MarkdownSerializer` as a base
2. Create `src/markdown/serializer.ts` — main function: `serializeMarkdown(doc: ProseMirrorNode): string`
3. Define serializer rules for each node type (paragraph, heading, list, etc.)
4. Handle mark serialization (bold wraps in `**`, italic in `*`, etc.)
5. Frontmatter and raw blocks are simple pass-through — emit stored text as-is
6. Post-process output to normalize whitespace and line endings

### Files to Create
- `src/markdown/serializer.ts` — Main serializer
- `src/markdown/serializerRules.ts` — Node/mark serialization rules

### Key Considerations
- List indentation: use 2 spaces per nesting level (CommonMark standard)
- Code block fences: use ` ``` ` with language, ensure closing fence
- Blockquote: prepend `> ` to every line including nested content
- Avoid unnecessary escaping — only escape characters that would be interpreted as markdown syntax
- Line breaks between blocks: two newlines between top-level blocks, single within lists

## Tests Required

### Unit Tests
- [ ] Serialize paragraph with plain text
- [ ] Serialize headings H1-H6 with `#` syntax
- [ ] Serialize bullet list with nested items
- [ ] Serialize ordered list with correct numbering
- [ ] Serialize code block with language identifier
- [ ] Serialize blockquote with nested content
- [ ] Serialize horizontal rule as `---`
- [ ] Serialize bold, italic, strikethrough, code, link marks
- [ ] Serialize frontmatter pass-through
- [ ] Serialize raw block pass-through
- [ ] Serialize empty document as empty string

### Integration Tests
- [ ] Serialized output is valid CommonMark (parse-serialize produces equivalent tree)

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
