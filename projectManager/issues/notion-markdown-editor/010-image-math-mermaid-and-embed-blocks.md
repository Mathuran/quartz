# [010] Image, Math, Mermaid, and Embed Block Types

## Metadata
- **Status:** TODO
- **Depends On:** 002, 003, 005
- **Blocks:** 015
- **Scope:** M
- **Design Doc:** [notion-markdown-editor](../../design-docs/notion-markdown-editor.md)

## Description

Add the remaining four block types to complete the full 16-block launch set: Image (with paste/drag-drop), Math (KaTeX rendering), Mermaid diagrams (mermaid.js rendering), and Embed/Link Cards (URL preview). Each needs TipTap extension, parser, serializer, and slash command registration.

## Acceptance Criteria

- [ ] **Image:** `![alt](src)` renders as an inline image. Paste from clipboard saves to configured `imageDir` and inserts markdown link. Drag-and-drop image files works. Alt text editable.
- [ ] **Math:** `$$...$$` blocks render using KaTeX. Clicking a math block enters edit mode showing the LaTeX source.
- [ ] **Mermaid:** ` ```mermaid ` code blocks render the diagram visually using mermaid.js. Clicking enters edit mode showing the mermaid source.
- [ ] **Embed:** `/embed` command prompts for URL and inserts a link card with title preview (fetched from URL metadata when possible, falls back to plain link).
- [ ] All four types parse from markdown and serialize back correctly
- [ ] Round-trip fidelity maintained for all four types
- [ ] Slash commands: `/image`, `/math`, `/mermaid`, `/embed`

## Technical Notes

### Suggested Approach

**Image:**
1. Use `@tiptap/extension-image` extended with paste/drop handlers
2. On paste: intercept clipboard event, extract image blob, save to `imageDir` (via message to extension host), insert `![](relative-path)`
3. On drag-drop: similar flow, but read from dropped file
4. Parser: `![alt](src)` → `image` node with `src` and `alt` attributes
5. Serializer: emit `![alt](src)` — preserve relative paths

**Math:**
1. Create custom extension `src/webview/extensions/math.ts`
2. Render: use KaTeX to render LaTeX to HTML inside a node view
3. Click handler: switch to source-editing mode (textarea overlay)
4. Parser: detect `$$...$$` blocks (markdown-it plugin for math)
5. Serializer: emit `$$\n...\n$$`

**Mermaid:**
1. Create custom extension `src/webview/extensions/mermaid.ts`
2. Render: detect code blocks with `language: "mermaid"`, render with mermaid.js instead of syntax highlighting
3. Click handler: switch to code editing mode
4. Parser/serializer: handled as code block with language `mermaid`

**Embed:**
1. Create custom extension `src/webview/extensions/embed.ts`
2. Render: display as a card with URL, title, and description (if available)
3. Metadata fetch: extension host fetches URL metadata (title, description, favicon) and sends to webview
4. Parser: detect `[title](url)` with specific node type for embeds (or store as link with card decoration)
5. Serializer: emit as `[title](url)`

### Files to Create
- `src/webview/extensions/math.ts`
- `src/webview/extensions/mermaid.ts`
- `src/webview/extensions/embed.ts`
- `src/webview/extensions/imageExtended.ts`
- `src/webview/styles/blocks.css` — Styles for math, mermaid, embed cards

### Key Considerations
- KaTeX and mermaid.js are large libraries — lazy-load them (only import when a math/mermaid block exists in the document)
- Image paste: the extension host handles the file write since the webview has no filesystem access
- Image paths should be relative to the document by default, configurable via `quartz.editor.imageDir`
- Mermaid rendering can fail for invalid syntax — show error message inline instead of crashing
- Embed metadata fetching is best-effort — if it fails, show a plain link card with just the URL

## Tests Required

### Unit Tests
- [ ] Image: parse `![alt](path)` → image node with correct attributes
- [ ] Image: serialize image node back to `![alt](path)`
- [ ] Math: parse `$$\nE=mc^2\n$$` → math node with LaTeX content
- [ ] Math: serialize math node back to `$$` block
- [ ] Math: KaTeX renders valid LaTeX without error
- [ ] Math: KaTeX shows error for invalid LaTeX
- [ ] Mermaid: code block with `mermaid` language renders diagram
- [ ] Mermaid: round-trips as ` ```mermaid ` code block
- [ ] Embed: parse link → embed node with URL

### Integration Tests
- [ ] Paste image from clipboard → file saved to imageDir → markdown link inserted
- [ ] Drag-drop image file → file saved → markdown link inserted
- [ ] Edit math block source → re-renders with KaTeX
- [ ] Edit mermaid source → re-renders diagram
- [ ] Insert embed via `/embed` → card displays URL

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
