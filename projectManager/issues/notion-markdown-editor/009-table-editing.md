# [009] Table Editing

## Metadata
- **Status:** TODO
- **Depends On:** 002, 003, 005
- **Blocks:** None
- **Scope:** M
- **Design Doc:** [notion-markdown-editor](../../design-docs/notion-markdown-editor.md)

## Description

Add full table editing support. Tables should render as interactive grids where users can: add/remove rows and columns, tab between cells, type to edit cell content, and use inline formatting within cells. The parser handles GFM pipe tables and the serializer emits auto-aligned pipe tables.

## Acceptance Criteria

- [ ] GFM pipe tables parse and render as editable table grids
- [ ] Header row renders with distinct styling (bold, bottom border)
- [ ] Tab key moves to next cell (Shift+Tab to previous)
- [ ] Context menu or toolbar to add/remove rows and columns
- [ ] Inline marks work within cells (bold, italic, code, link)
- [ ] Serializer outputs auto-aligned pipe tables (columns padded with spaces)
- [ ] Tables with column alignment (`:---`, `:---:`, `---:`) parse and serialize correctly
- [ ] Round-trip fidelity for tables (including alignment markers)
- [ ] Slash command `/table` inserts a 3x3 default table
- [ ] Empty cells handled correctly in both parsing and serialization

## Technical Notes

### Suggested Approach
1. Use `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`
2. Add `markdown-it` GFM tables plugin (usually included in GFM preset)
3. Parser: GFM table tokens → `table`, `tableRow`, `tableCell`, `tableHeader` nodes with alignment attributes
4. Serializer: walk table nodes, calculate max column widths, pad cells, emit aligned pipe table
5. Add table toolbar (appears on table focus) with: add row, add column, delete row, delete column, toggle header
6. Style to match VS Code's native table rendering

### Files to Create/Modify
- `src/markdown/parser.ts` — Add table parsing rules
- `src/markdown/serializer.ts` — Add table serialization with auto-alignment
- `src/webview/components/TableToolbar.tsx` — Floating table manipulation toolbar
- `src/webview/styles/table.css` — Table-specific styles

### Key Considerations
- Table auto-alignment: calculate the max width of each column and pad with spaces. This produces nice-looking markdown output.
- Pipe characters inside cells need to be escaped (`\|`) during serialization
- Tables with merged cells are not supported (GFM limitation) — document this
- Performance: large tables (50+ rows) should still render smoothly. Consider virtualization if needed.
- Column alignment attribute must round-trip: `:---` (left), `:---:` (center), `---:` (right), `---` (default)

## Tests Required

### Unit Tests
- [ ] Parse 3x3 table with headers
- [ ] Parse table with column alignment markers
- [ ] Parse table with inline formatting in cells
- [ ] Parse table with escaped pipe in cell
- [ ] Serialize table with auto-aligned columns
- [ ] Serialize table preserving alignment markers
- [ ] Round-trip table with mixed alignment
- [ ] Empty cell handling (parse and serialize)

### Integration Tests
- [ ] Insert table via `/table` → edit cells → save → verify markdown
- [ ] Tab navigation between cells works
- [ ] Add row/column via toolbar → save → verify markdown
- [ ] Delete row/column via toolbar → save → verify markdown
- [ ] Inline bold/italic in table cell → save → verify markdown

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
