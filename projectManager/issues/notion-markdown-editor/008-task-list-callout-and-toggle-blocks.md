# [008] Task List, Callout, and Toggle Block Types

## Metadata
- **Status:** TODO
- **Depends On:** 002, 003, 005
- **Blocks:** None
- **Scope:** M
- **Design Doc:** [notion-markdown-editor](../../design-docs/notion-markdown-editor.md)

## Description

Add three block types to the editor and Markdown Bridge: Task List (GFM checkboxes), Callout (GFM alerts `> [!NOTE]`), and Toggle (`<details><summary>`). Each needs a TipTap extension, parser support, serializer support, and round-trip tests.

## Acceptance Criteria

- [ ] **Task List:** Renders as checkboxes. Clicking toggles `- [ ]` ↔ `- [x]`. Nested task items supported.
- [ ] **Callout:** Renders as a styled box with icon and type label (NOTE, TIP, IMPORTANT, WARNING, CAUTION). Content inside is editable.
- [ ] **Toggle:** Renders as a collapsible section with a clickable summary. Expands/collapses on click.
- [ ] Parser handles all three types from markdown input
- [ ] Serializer outputs correct markdown for all three types
- [ ] Round-trip fidelity maintained for all three types
- [ ] Slash commands registered: `/todo`, `/callout`, `/toggle`

## Technical Notes

### Suggested Approach

**Task List:**
1. Use `@tiptap/extension-task-list` + `@tiptap/extension-task-item`
2. Add `markdown-it` plugin for GFM task lists (if not already included)
3. Parser: `- [ ] text` → `taskItem` node with `checked: false`
4. Serializer: `taskItem` → `- [x] ` or `- [ ] ` based on `checked` attribute

**Callout:**
1. Create custom TipTap extension `src/webview/extensions/callout.ts`
2. Parser: detect `> [!TYPE]` pattern in blockquote tokens, create `callout` node with `type` attribute
3. Serializer: emit `> [!TYPE]\n> content`
4. Render with colored left border, icon, and type badge (match GitHub alert styling)

**Toggle:**
1. Create custom TipTap extension `src/webview/extensions/toggle.ts`
2. Parser: detect `<details>` + `<summary>` HTML blocks
3. Serializer: emit `<details>\n<summary>title</summary>\n\ncontent\n\n</details>`
4. Render as collapsible with arrow indicator

### Files to Create/Modify
- `src/webview/extensions/callout.ts` — Custom callout extension
- `src/webview/extensions/toggle.ts` — Custom toggle extension
- `src/markdown/parser.ts` — Add parsing rules for task list, callout, toggle
- `src/markdown/serializer.ts` — Add serialization rules
- `src/webview/styles/blocks.css` — Callout and toggle styling

### Key Considerations
- Callout types should match GFM alert syntax exactly for GitHub compatibility
- Toggle content must be editable when expanded — not just static text
- Task list checkbox click should trigger a document update (not just a visual toggle)
- All three types need to work inside the slash command system

## Tests Required

### Unit Tests
- [ ] Task list parses `- [ ]` and `- [x]` correctly
- [ ] Task list checkbox toggle updates node attribute
- [ ] Task list serializes with correct marker
- [ ] Callout parses `> [!NOTE]` with content
- [ ] Callout parses all 5 types (NOTE, TIP, IMPORTANT, WARNING, CAUTION)
- [ ] Callout serializes with correct GFM alert syntax
- [ ] Toggle parses `<details><summary>` HTML
- [ ] Toggle serializes back to `<details>` HTML
- [ ] All three types round-trip correctly

### Integration Tests
- [ ] Create task list via `/todo` → check/uncheck → save → verify markdown
- [ ] Create callout via `/callout` → edit content → save → verify markdown
- [ ] Create toggle via `/toggle` → add content → collapse/expand → save → verify markdown

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
