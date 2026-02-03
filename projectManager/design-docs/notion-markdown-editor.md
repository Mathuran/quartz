# Notion-Style Markdown Editor — VS Code Extension

**Author:** Mathuran Sadagopan
**Status:** APPROVED
**Created:** 2026-02-03
**Last Updated:** 2026-02-03 (Rev 2)
**Reviewers:** TBD
**Related Docs:** [claude-code-integration](./claude-code-integration.md), [project-management-ui](./project-management-ui.md)

---

## 1. Problem Statement

Markdown editing in VS Code is a split-brain experience. Users either write raw markdown syntax in a plain text editor and preview it in a separate pane, or they use preview-only renderers that don't allow editing. Neither approach matches the fluid, block-based editing experience that tools like Notion, Craft, and Obsidian provide — where content is manipulated visually while remaining stored as standard markdown.

For users who manage documentation-heavy projects (design docs, issue trackers, wikis, READMEs), this friction compounds. They context-switch between writing, formatting, and previewing hundreds of times per session. The result is slower authoring, inconsistent formatting, and an editing experience that feels like it belongs in 2015.

VS Code has 15M+ monthly active users and is the dominant editor for developers. Despite this, no VS Code extension delivers a production-quality Notion-style block editor that reads and writes standard `.md` files. The closest options (Markdown All in One, Foam, Dendron) enhance the raw editing experience but never leave the plain-text paradigm.

## 2. Goals and Non-Goals

### Goals

- **P0: Block-based WYSIWYG editing** — Render markdown as interactive blocks (paragraphs, headings, lists, code blocks, tables, callouts, toggles, images) that users manipulate visually. No raw markdown syntax visible during editing.
- **P0: Standard markdown compatibility** — Read any `.md` file and write valid CommonMark + GFM output. Users must be able to open files edited by Quartz in any other markdown tool without data loss.
- **P0: Slash command menu** — Type `/` to insert any block type. Support at least 16 block types at launch (see §4 for full list).
- **P1: Letter-sized document view** — Render the editing surface as a letter-sized page with a 1:√2 aspect ratio (ISO 216 / A-series proportion). The content area visually resembles a physical document page, centered within the webview panel. This gives documents a clean, bounded reading and editing experience rather than an infinitely scrolling text column.
- **P1: Drag-and-drop block reordering** — Grab any block by its handle and move it to a new position in the document.
- **P1: Inline formatting toolbar** — Select text to reveal a floating toolbar for bold, italic, strikethrough, code, link, and highlight.
- **P1: Keyboard-first editing** — All formatting and block operations accessible via keyboard shortcuts. Match Notion's shortcut conventions where possible.
- **P2: Table editing** — Add/remove rows and columns visually. Tab to navigate cells. Auto-align markdown pipe tables on save.
- **P2: Image handling** — Paste images from clipboard, drag-and-drop image files. Store images relative to the document or in a configurable assets directory.

### Non-Goals

- **Not a general-purpose rich-text editor** — We will not support fonts, colors, custom CSS, or arbitrary HTML. Formatting is limited to what CommonMark + GFM can represent.
- **Not a wiki/knowledge-graph system** — No backlinks, graph views, or cross-document linking at this stage. That scope belongs to a separate extension.
- **Not a collaborative editor** — No real-time multi-cursor editing or CRDT sync. Single-user editing only.
- **Not replacing VS Code's native markdown preview** — The extension provides its own editor panel. Users can still use the built-in preview if they prefer.
- **No proprietary file format** — We will never introduce a custom file format. All persistence is `.md` files.

## 3. Background and Context

### The VS Code Extension Ecosystem

VS Code extensions use the [Extension API](https://code.visualstudio.com/api) and can contribute custom editors via the `CustomTextEditorProvider` or `CustomReadonlyEditorProvider` interfaces. Custom editors render in a webview panel and communicate with the extension host via message passing. This is the mechanism we will use — the editor UI runs in a webview (HTML/CSS/JS), while file I/O and VS Code integration run in the extension host (Node.js).

### TipTap / ProseMirror

[TipTap](https://tiptap.dev/) is a headless rich-text editor framework built on [ProseMirror](https://prosemirror.net/). It provides:

- A schema-based document model (nodes and marks)
- An extensible plugin system for custom block types
- Built-in support for collaborative editing (not needed now, but future-proof)
- An active ecosystem with 50+ community extensions
- MIT license

TipTap is used in production by GitLab, Docmost, and Outline. It handles the hard parts of rich-text editing (selection, cursor management, input rules, undo/redo) while giving us full control over rendering and behavior.

### Prior Art in VS Code

| Extension | Approach | Limitation |
|-----------|----------|------------|
| Markdown All in One | Enhanced plain-text editing | No WYSIWYG, no blocks |
| Foam | Wiki-style links + backlinks | Text-only editing |
| Dendron | Hierarchical note-taking | Text-only, complex setup |
| Milkdown | ProseMirror-based WYSIWYG | Standalone app, not a VS Code extension |
| Zettlr | Academic markdown editor | Separate app, not integrated into VS Code |

None of these provide a block-based WYSIWYG experience inside VS Code that reads/writes standard markdown.

### This Extension's Relationship to Quartz

This extension is the first of three components in the Quartz VS Code ecosystem. It provides the editing foundation. The second component (Claude Code Integration) adds AI-assisted writing. The third (Project Management UI) adds visual issue tracking and design doc authoring. Each is designed as an independent module but they share the extension host and webview infrastructure.

## 4. Proposed Solution

### Overview

We will build a VS Code extension called **Quartz - Clear Markdown Editor** that registers a custom editor for `.md` files. When a user opens a markdown file, they can choose to open it in the Quartz Editor (or set it as default). The editor renders the markdown as a TipTap block editor inside a VS Code webview panel.

The architecture has three layers:

1. **Extension Host (Node.js)** — Handles file I/O, VS Code API integration, configuration, and message routing.
2. **Webview (React + TipTap)** — Renders the block editor UI, handles user interactions, and sends document changes back to the extension host.
3. **Markdown Bridge** — A bidirectional parser/serializer that converts between markdown (CommonMark + GFM) and TipTap's ProseMirror document model.

### Architecture

```
┌─────────────────────────────────────────────────┐
│                   VS Code                        │
│                                                  │
│  ┌──────────────────┐   ┌─────────────────────┐ │
│  │  Extension Host   │   │     Webview Panel    │ │
│  │  (Node.js)        │◄─►│  (React + TipTap)   │ │
│  │                   │   │                      │ │
│  │  • File I/O       │   │  • Block Editor UI   │ │
│  │  • VS Code API    │   │  • Slash Commands    │ │
│  │  • Config Mgmt    │   │  • Drag & Drop       │ │
│  │  • Markdown Bridge│   │  • Floating Toolbar   │ │
│  └────────┬─────────┘   └──────────────────────┘ │
│           │                                       │
│           ▼                                       │
│  ┌──────────────────┐                            │
│  │  .md Files        │                            │
│  │  (CommonMark+GFM) │                            │
│  └──────────────────┘                            │
└─────────────────────────────────────────────────┘
```

### Document Page Layout

The editor renders content inside a page container that uses a 1:√2 aspect ratio (the same proportion as ISO A-series paper, where width × √2 = height). This gives the editing surface the visual feel of a physical document rather than an unbounded text column.

**Layout behavior:**
- The page container is centered horizontally in the webview panel with a subtle shadow and background contrast to distinguish it from the VS Code chrome.
- Page width is determined by the available panel width (capped at a configurable max, default 816px — equivalent to US Letter at 96 DPI). Page height is calculated as `width × √2` (≈1,154px at default width).
- For documents longer than one page, additional pages are rendered below with a visible page break gap between them, similar to Google Docs or Word.
- Content flows continuously across pages — blocks are not clipped at page boundaries but page breaks are rendered visually.
- Content starts immediately from the top margin of the first page. No special title area or cover page treatment — the first block (whatever it is) renders at the top.
- At narrow panel widths (below 600px), the page layout is disabled and the editor falls back to a single fluid column to remain usable.

**Configuration:**
```jsonc
{
  "quartz.editor.pageLayout": true,        // Enable letter-sized page view
  "quartz.editor.pageWidth": 816,          // Page width in px (height = width × √2)
  "quartz.editor.pageMargin": 72           // Inner page margin in px (≈0.75in)
}
```

### Unsupported Syntax Fallback

When the editor encounters markdown syntax it cannot parse into a structured block (e.g., custom directives, non-standard extensions, or malformed markup), it falls back to VS Code's native markdown editor. The user sees a brief notification toast: *"This file contains syntax Quartz doesn't support. Opening in the default editor."* The toast auto-dismisses after a few seconds. This ensures users are never blocked from editing their files and avoids rendering unknown content incorrectly.

For files that are partially unsupported (one unknown block in an otherwise standard document), the unknown content is preserved as an opaque raw-text block that is displayed but not editable in Quartz. The raw content is round-tripped without modification.

### Markdown Bridge (Parser/Serializer)

This is the most critical component. It must handle round-trip conversion without data loss.

**Markdown → ProseMirror (Parsing):**
- Use [`markdown-it`](https://github.com/markdown-it/markdown-it) to parse markdown into an AST.
- Transform the AST into ProseMirror nodes using a custom mapping layer.
- Preserve frontmatter (YAML) as a special node type (not editable as blocks, but displayed and round-tripped).

**ProseMirror → Markdown (Serializing):**
- Walk the ProseMirror document tree and emit markdown tokens.
- Use [`prosemirror-markdown`](https://github.com/ProseMirror/prosemirror-markdown) as a base, extended for GFM features (tables, task lists, strikethrough).
- Preserve original formatting choices where possible (e.g., if the user wrote `*bold*` vs `**bold**`, keep it).

**Round-trip fidelity rules:**
1. Opening a file and immediately saving it must produce byte-identical output.
2. Adding a block and removing it must return to the original file content.
3. Frontmatter, HTML blocks, and unknown markdown extensions are preserved as opaque blocks.

### Block Types (Launch Set)

| Block | Markdown Representation | Slash Command |
|-------|------------------------|---------------|
| Paragraph | Plain text | (default) |
| Heading 1-6 | `# ` through `###### ` | `/h1` — `/h6` |
| Bullet List | `- ` | `/bullet` |
| Numbered List | `1. ` | `/numbered` |
| Task List | `- [ ] ` / `- [x] ` | `/todo` |
| Code Block | ` ``` ` | `/code` |
| Blockquote | `> ` | `/quote` |
| Callout | `> [!NOTE]` (GFM alerts) | `/callout` |
| Table | GFM pipe tables | `/table` |
| Horizontal Rule | `---` | `/divider` |
| Image | `![alt](src)` | `/image` |
| Toggle/Details | `<details><summary>` | `/toggle` |
| Math Block | `$$...$$` | `/math` |
| Frontmatter | `---\nyaml\n---` | (auto-detected) |
| Mermaid Diagram | ` ```mermaid ` | `/mermaid` |
| Embed/Link Card | `[title](url)` with preview | `/embed` |

### Slash Command System

When the user types `/` at the start of an empty block or after pressing Enter:

1. A floating menu appears listing all available block types.
2. The user can type to filter (fuzzy search).
3. Selecting an item transforms the current block or inserts a new one.
4. The menu is extensible — the Claude Code Integration design doc will add AI-specific slash commands (e.g., `/ask-claude`, `/summarize`).

**Implementation:** TipTap's `Suggestion` utility handles the menu trigger, positioning, and keyboard navigation. We provide a custom Vue/React component for rendering.

### Drag-and-Drop

Each block displays a grip handle on hover (left side, 6-dot icon). Dragging a block:

1. Shows a blue insertion line at valid drop targets.
2. On drop, the ProseMirror transaction moves the node in the document tree.
3. The serializer outputs the blocks in the new order.

Nested blocks (list items inside lists) can be dragged to change nesting level.

### Inline Formatting Toolbar

Selecting text reveals a floating toolbar with:

- **Bold** (Cmd+B)
- **Italic** (Cmd+I)
- **Strikethrough** (Cmd+Shift+S)
- **Code** (Cmd+E)
- **Link** (Cmd+K) — opens URL input
- **Highlight** (Cmd+Shift+H) — uses `==text==` markdown extension

The toolbar follows the selection and dismisses on blur.

### File I/O and Sync

The extension host owns all file operations:

1. **On open:** Read `.md` file → parse to ProseMirror doc → send to webview.
2. **On edit:** Webview sends document delta → extension host updates in-memory document.
3. **On save:** Serialize ProseMirror doc → write `.md` file.
4. **Dirty tracking:** VS Code's native dirty indicator works through the `CustomTextEditorProvider` API.
5. **External changes:** Watch for file changes from git, terminal, etc. Prompt user to reload or merge.

### Configuration

```jsonc
// settings.json
{
  "quartz.editor.defaultForMarkdown": false,  // Set as default .md editor
  "quartz.editor.theme": "auto",              // auto | light | dark
  "quartz.editor.fontFamily": "inherit",      // Inherit from VS Code or override
  "quartz.editor.fontSize": 16,               // Editor font size in px
  "quartz.editor.pageLayout": true,           // Enable letter-sized page view
  "quartz.editor.pageWidth": 816,             // Page width in px (height = width × √2)
  "quartz.editor.pageMargin": 72,             // Inner page margin in px (≈0.75in)
  "quartz.editor.imageDir": "./assets",        // Relative path for pasted images
  "quartz.editor.preserveFormatting": true,    // Maintain original markdown style on round-trip
  "quartz.editor.showBlockHandles": true       // Show drag handles on hover
}
```

## 5. Alternative Solutions Considered

### Alternative A: Enhance VS Code's Built-in Preview

**Approach:** Use VS Code's `MarkdownPreviewManager` API to create an editable preview pane — intercepting clicks and keystrokes to modify the underlying `.md` file in the text editor.

**Pros:**
- No webview needed — lighter weight.
- Automatic access to VS Code's markdown rendering pipeline.

**Cons:**
- The preview API is read-only by design. Making it editable requires brittle hacks (content-editable overlays, position mapping between rendered HTML and source markdown).
- Cursor management and selection would be unreliable.
- No block-level manipulation (drag-and-drop, slash commands).
- Would break with every VS Code update that changes preview internals.

**Why rejected:** The preview API was never designed for editing. Building on it would produce a fragile, limited experience.

### Alternative B: Embed a Standalone Editor (Milkdown / BlockNote)

**Approach:** Use an existing open-source block editor like [Milkdown](https://milkdown.dev/) or [BlockNote](https://blocknotejs.org/) and embed it in a VS Code webview.

**Pros:**
- Faster initial development — reuse existing editor logic.
- Both are ProseMirror-based, so the mental model is similar.

**Cons:**
- Milkdown's plugin API is opinionated and would constrain our customization (especially for Claude Code integration).
- BlockNote uses its own document model on top of ProseMirror, adding an abstraction layer we'd need to work around for markdown serialization.
- Neither has been tested inside VS Code webviews — webview CSP restrictions, message-passing latency, and theme integration would all need custom work.
- Dependency on external project roadmaps and breaking changes.

**Why rejected:** Using TipTap directly gives us the same ProseMirror foundation with full control over the schema, serialization, and extension points. The marginal speed gain of using a higher-level framework doesn't justify the loss of control for a project of this scope.

### Alternative C: Monaco Editor with Decorations

**Approach:** Use VS Code's native Monaco editor with custom decorations (inline images, rendered checkboxes, styled headings) to simulate WYSIWYG without leaving the text editor.

**Pros:**
- No webview — native editor performance and keyboard handling.
- Decorations API is well-documented and stable.

**Cons:**
- Decorations are visual overlays — the underlying text remains raw markdown. Users would still see `#` and `**` when their cursor enters a decorated region.
- No true block-level manipulation. Can't drag blocks or use slash commands to insert structured content.
- Tables, images, and complex blocks can't be properly edited with decorations alone.

**Why rejected:** This approach produces a "half-WYSIWYG" experience. Users would constantly encounter the raw markdown underneath, defeating the purpose. TipTap gives us a true structured editor.

## 6. Security, Privacy, and Compliance

### Webview Security

- The webview runs in a sandboxed iframe with a strict Content Security Policy (CSP).
- CSP will allow only: `self` scripts (bundled), `self` styles, and VS Code's webview resource scheme for images.
- No external network requests from the webview. All resources are bundled with the extension.
- The webview communicates with the extension host exclusively via `postMessage` — no direct file system access.

### File Access

- The extension reads and writes only files that the user explicitly opens in VS Code.
- Image paste operations write to a user-configured directory (default: `./assets` relative to the file). The user is informed where images are saved.
- No telemetry, analytics, or data collection. The extension is fully offline.

### Supply Chain

- Dependencies will be audited and pinned to specific versions.
- `markdown-it`, `prosemirror-*`, and `@tiptap/*` are well-maintained, widely-used packages with active security review.
- The extension will be published on the VS Code Marketplace with source available on GitHub.

### Data Integrity

- Before writing any file, the serializer validates that the output parses back to an equivalent document tree (round-trip check).
- If validation fails, the user is warned and the original file is not overwritten.
- An auto-backup mechanism saves `.md.bak` files before destructive operations (configurable, default: off).

## 7. Testing Strategy

### Unit Tests

- **Markdown Bridge (highest priority):** Comprehensive test suite for parser and serializer.
  - Round-trip tests: parse → serialize → compare for 100+ markdown fixtures covering edge cases (nested lists, tables with pipes in cells, frontmatter with special chars, mixed HTML/markdown).
  - Fixture files from CommonMark spec, GFM spec, and real-world documents.
  - Property-based tests: generate random ProseMirror documents, serialize, re-parse, and verify structural equality.
- **Block type tests:** Each of the 16 block types has dedicated tests for creation, editing, deletion, and serialization.
- **Slash command tests:** Menu filtering, insertion behavior, keyboard navigation.

### Integration Tests

- **VS Code extension tests:** Use `@vscode/test-electron` to run the extension in a real VS Code instance.
  - Open file → verify editor renders → edit → save → verify file contents.
  - Test dirty indicator, undo/redo, and external file change handling.
  - Test configuration changes apply in real-time.
- **Webview ↔ Extension Host communication:** Verify message passing under load (rapid edits, large files).

### End-to-End Tests

- **User scenario tests:** Script common workflows:
  1. Open a README.md → add a table → save → verify output.
  2. Create a new file → use slash commands to build a document → save.
  3. Open a file with frontmatter → edit body → verify frontmatter preserved.
  4. Paste an image → verify file created in assets dir → verify markdown link.
- **Cross-platform:** Test on macOS, Windows, and Linux.

### Performance Tests

- **Large file handling:** Open and edit files with 1K, 5K, and 10K lines. Measure:
  - Time to initial render (target: <500ms for 5K lines).
  - Keystroke latency (target: <16ms / 60fps).
  - Memory usage (target: <200MB for 10K lines).
- **Rapid editing:** Type at 120 WPM and verify no dropped characters or rendering lag.

## 8. Rollout Plan

### Phase 1: Alpha (Internal / Dev Preview)

- Core editor with paragraph, heading, list, code block, and blockquote support.
- Basic slash command menu.
- Markdown round-trip for supported block types.
- Manual installation via `.vsix` file.
- Target: Core team testing and feedback.

### Phase 2: Beta (VS Code Marketplace — Preview)

- All 16 block types supported.
- Drag-and-drop block reordering.
- Inline formatting toolbar.
- Image paste and drag-drop.
- Table editing.
- Published as "Preview" on the Marketplace.
- Collect feedback via GitHub Issues.

### Phase 3: Stable Release (v1.0)

- Round-trip fidelity verified against CommonMark spec test suite.
- Performance validated on large files.
- Configuration options finalized.
- Extension points API for Claude Code Integration (design doc #2) to hook into.
- Published as stable on the Marketplace.

### Monitoring and Rollback

- VS Code Marketplace provides download counts and ratings.
- GitHub Issues for bug reports with markdown file attachments for reproduction.
- If a release introduces data loss (file corruption), immediately unpublish and notify users.
- Semantic versioning: breaking changes only in major versions.

## 9. Dependencies and Risks

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| VS Code Extension API | Platform | CustomTextEditorProvider, Webview API. Stable, well-documented. |
| TipTap v2 | Library | Headless editor framework. MIT licensed. Active maintenance. |
| ProseMirror | Library | Underlying editor engine. Mature (8+ years). Stable API. |
| markdown-it | Library | Markdown parser. CommonMark compliant. Widely used. |
| React | Library | Webview UI framework. Used for TipTap rendering and slash command menu. |
| mermaid.js | Library | Diagram rendering for ```mermaid code blocks. MIT licensed. |
| KaTeX | Library | Math rendering for $$...$$ blocks. MIT licensed. |
| VS Code Marketplace | Distribution | Publishing and updates. |

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Markdown round-trip fidelity — complex documents lose formatting on save | High | Medium | Extensive test suite with real-world fixtures. Round-trip validation before write. Preserve original formatting where possible. |
| Webview performance — large documents cause lag | Medium | Medium | Virtual rendering for documents >1K blocks. Debounced serialization. Profile and optimize critical paths. |
| TipTap breaking changes in major updates | Medium | Low | Pin to specific minor version. Maintain a thin adapter layer. Monitor changelogs. |
| VS Code CustomTextEditorProvider API changes | High | Low | API has been stable since 2020. Abstract VS Code-specific code behind interfaces for testability. |
| Image handling edge cases (paths with spaces, unicode, symlinks) | Low | Medium | Normalize paths using VS Code's `Uri` utilities. Integration tests for edge cases. |
| Conflicting extensions (other markdown editors) | Low | Medium | Document how to configure Quartz as default vs. coexisting. Use distinct editor type ID. |

## 10. Open Questions

All previously open questions have been resolved:

| # | Question | Resolution |
|---|----------|------------|
| 1 | Should we support `.mdx` files in v1? | **Deferred.** MDX support is out of scope for v1. Standard `.md` files only. |
| 2 | Behavior for unsupported markdown syntax? | **Fall back to native VS Code editor.** If the file is too non-standard to render, Quartz opens it in the default text editor with a notification. Partially unsupported files render unknown blocks as opaque raw-text (see §4, Unsupported Syntax Fallback). |
| 3 | Support split view (WYSIWYG + raw markdown)? | **No.** Users can open the file in VS Code's native editor for raw markdown. No built-in split view. |
| 4 | Extension naming/branding? | **"Quartz - Clear Markdown Editor"** on the VS Code Marketplace. |
| 5 | Support Mermaid diagram rendering? | **Yes.** Mermaid diagrams in ` ```mermaid ` code blocks are rendered visually using `mermaid.js`. Added as a block type (see §4, Block Types). |
| 6 | Minimum VS Code version? | **Current stable version only.** Target the latest VS Code release at time of development. No back-compat with older versions. |

## 11. Implementation Issues

| # | Title | Status | Scope |
|---|-------|--------|-------|
| [001](../issues/notion-markdown-editor/001-extension-scaffold-and-custom-editor-provider.md) | Extension Scaffold and Custom Editor Provider | TODO | M |
| [002](../issues/notion-markdown-editor/002-markdown-to-prosemirror-parser.md) | Markdown-to-ProseMirror Parser | TODO | M |
| [003](../issues/notion-markdown-editor/003-prosemirror-to-markdown-serializer.md) | ProseMirror-to-Markdown Serializer | TODO | M |
| [004](../issues/notion-markdown-editor/004-round-trip-fidelity-and-format-preservation.md) | Round-Trip Fidelity and Format Preservation | TODO | M |
| [005](../issues/notion-markdown-editor/005-tiptap-core-editor-with-basic-blocks.md) | TipTap Core Editor with Basic Blocks | TODO | M |
| [006](../issues/notion-markdown-editor/006-page-layout-and-document-styling.md) | Page Layout and Document Styling | TODO | S |
| [007](../issues/notion-markdown-editor/007-slash-command-menu.md) | Slash Command Menu | TODO | M |
| [008](../issues/notion-markdown-editor/008-task-list-callout-and-toggle-blocks.md) | Task List, Callout, and Toggle Block Types | TODO | M |
| [009](../issues/notion-markdown-editor/009-table-editing.md) | Table Editing | TODO | M |
| [010](../issues/notion-markdown-editor/010-image-math-mermaid-and-embed-blocks.md) | Image, Math, Mermaid, and Embed Block Types | TODO | M |
| [011](../issues/notion-markdown-editor/011-inline-formatting-toolbar.md) | Inline Formatting Toolbar | TODO | S |
| [012](../issues/notion-markdown-editor/012-drag-and-drop-block-reordering.md) | Drag-and-Drop Block Reordering | TODO | M |
| [013](../issues/notion-markdown-editor/013-keyboard-shortcuts.md) | Keyboard Shortcuts | TODO | S |
| [014](../issues/notion-markdown-editor/014-external-file-change-handling-and-unsupported-syntax-fallback.md) | External File Change Handling and Unsupported Syntax Fallback | TODO | S |
| [015](../issues/notion-markdown-editor/015-performance-optimization-and-large-file-handling.md) | Performance Optimization and Large File Handling | TODO | M |

**Progress:** 0/15 issues complete (0%)

## 12. Appendix

### A. TipTap Extension Map

Each block type maps to a TipTap extension:

```
Paragraph     → @tiptap/extension-paragraph (built-in)
Heading       → @tiptap/extension-heading
BulletList    → @tiptap/extension-bullet-list
OrderedList   → @tiptap/extension-ordered-list
TaskList      → @tiptap/extension-task-list + @tiptap/extension-task-item
CodeBlock     → @tiptap/extension-code-block-lowlight (syntax highlighting)
Blockquote    → @tiptap/extension-blockquote
Table         → @tiptap/extension-table + table-row + table-cell + table-header
Image         → @tiptap/extension-image (extended for paste/drag-drop)
HorizontalRule→ @tiptap/extension-horizontal-rule
Math          → Custom extension using KaTeX
Callout       → Custom extension (GFM alerts syntax)
Toggle        → Custom extension (<details>/<summary>)
Frontmatter   → Custom extension (YAML code block with special rendering)
Mermaid       → Custom extension (renders ```mermaid code blocks using mermaid.js)
Embed         → Custom extension (link preview card)
```

### B. Keyboard Shortcuts (Default)

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Bold | Cmd+B | Ctrl+B |
| Italic | Cmd+I | Ctrl+I |
| Strikethrough | Cmd+Shift+S | Ctrl+Shift+S |
| Inline Code | Cmd+E | Ctrl+E |
| Link | Cmd+K | Ctrl+K |
| Heading 1 | Cmd+Alt+1 | Ctrl+Alt+1 |
| Heading 2 | Cmd+Alt+2 | Ctrl+Alt+2 |
| Heading 3 | Cmd+Alt+3 | Ctrl+Alt+3 |
| Bullet List | Cmd+Shift+8 | Ctrl+Shift+8 |
| Numbered List | Cmd+Shift+7 | Ctrl+Shift+7 |
| Task List | Cmd+Shift+9 | Ctrl+Shift+9 |
| Code Block | Cmd+Alt+C | Ctrl+Alt+C |
| Blockquote | Cmd+Shift+. | Ctrl+Shift+. |
| Slash Command | / | / |
| Undo | Cmd+Z | Ctrl+Z |
| Redo | Cmd+Shift+Z | Ctrl+Shift+Z |

### C. Content Security Policy (Webview)

```
default-src 'none';
script-src 'nonce-${nonce}';
style-src ${webview.cspSource} 'unsafe-inline';
img-src ${webview.cspSource} data:;
font-src ${webview.cspSource};
```
