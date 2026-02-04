# Quartz - Clear Markdown Editor

A Notion-style block-based WYSIWYG markdown editor for VS Code. Edit `.md` files visually while keeping them as standard CommonMark + GFM markdown.

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **VS Code** >= 1.85.0

## Setup

```bash
npm install
```

## Build

Build both the extension host (Node.js) and webview (browser) bundles:

```bash
npm run build
```

For development with file watching:

```bash
npm run build:watch
```

The build uses esbuild with two entry points:
- `src/extension.ts` → `dist/extension.js` (CJS, Node.js)
- `src/webview/index.tsx` → `dist/webview/index.js` (IIFE, browser)

## Testing

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Tests use [Vitest](https://vitest.dev/) and cover:

| Test file | Tests | Scope |
|-----------|-------|-------|
| `test/parser.test.ts` | 22 | Markdown → ProseMirror JSON parsing |
| `test/serializer.test.ts` | 18 | ProseMirror JSON → Markdown serialization |
| `test/roundtrip.test.ts` | 13 | Parse → serialize → compare fidelity |
| `test/features.test.ts` | 20 | Frontmatter, blockquotes, tables, images, edge cases |
| `test/debounce.test.ts` | 7 | Debounce utility (delay, flush, cancel) |
| `test/performance.test.ts` | 7 | Large document parsing/serialization benchmarks |

Total: **87 tests**

## Running in VS Code

1. Open this folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. Open any `.md` file
4. Right-click the file tab → "Reopen Editor With..." → "Quartz Markdown Editor"

To set Quartz as the default editor for markdown files, enable `quartz.editor.defaultForMarkdown` in VS Code settings.

## Project Structure

```
quartz/
├── src/
│   ├── extension.ts                    # VS Code extension entry point
│   ├── QuartzEditorProvider.ts         # CustomTextEditorProvider (file I/O, webview lifecycle)
│   ├── markdown/
│   │   ├── parser.ts                   # markdown-it → ProseMirror JSON
│   │   ├── serializer.ts              # ProseMirror JSON → Markdown
│   │   └── frontmatter.ts            # YAML frontmatter extraction
│   └── webview/
│       ├── index.tsx                   # React entry point
│       ├── App.tsx                     # Root component (VS Code message handling)
│       ├── Editor.tsx                  # TipTap editor with all extensions
│       ├── types.ts                    # EditorConfig interface
│       ├── commands/
│       │   └── slashCommands.ts       # Slash command registry (14 commands)
│       ├── components/
│       │   ├── PageContainer.tsx      # Letter-sized page layout (1:√2 ratio)
│       │   ├── SlashMenu.tsx          # Floating slash command menu
│       │   ├── FormattingToolbar.tsx   # BubbleMenu toolbar
│       │   └── RawBlock.tsx           # Non-editable fallback for unsupported content
│       ├── extensions/
│       │   ├── slashCommandExtension.ts   # ProseMirror plugin for / trigger
│       │   ├── keyboardShortcuts.ts       # All keyboard shortcuts
│       │   ├── dragHandle.ts              # Drag-and-drop block handles
│       │   └── virtualRendering.ts        # Off-screen block hiding for large docs
│       ├── styles/
│       │   ├── editor.css             # Main editor styles
│       │   └── rawBlock.css           # Raw block fallback styles
│       └── utils/
│           └── debounce.ts            # Debounce with flush/cancel
├── test/
│   ├── __mocks__/
│   │   └── vscode.ts                 # VS Code API mock for tests
│   ├── parser.test.ts
│   ├── serializer.test.ts
│   ├── roundtrip.test.ts
│   ├── features.test.ts
│   ├── debounce.test.ts
│   └── performance.test.ts
├── dist/                              # Build output (gitignored)
├── esbuild.js                         # Dual-bundle build script
├── package.json
├── tsconfig.json                      # Extension host TypeScript config
├── tsconfig.webview.json              # Webview TypeScript config
└── vitest.config.ts                   # Test configuration
```

## Configuration

All settings are under `quartz.editor.*` in VS Code:

| Setting | Default | Description |
|---------|---------|-------------|
| `defaultForMarkdown` | `false` | Set Quartz as the default `.md` editor |
| `theme` | `"auto"` | Editor theme: `auto`, `light`, or `dark` |
| `fontFamily` | `"inherit"` | Font family (inherit uses VS Code's font) |
| `fontSize` | `16` | Font size in pixels |
| `pageLayout` | `true` | Enable letter-sized page view |
| `pageWidth` | `816` | Page width in pixels |
| `pageMargin` | `72` | Inner page margin in pixels |
| `imageDir` | `"./assets"` | Relative path for pasted images |
| `preserveFormatting` | `true` | Maintain original markdown style on round-trip |
| `showBlockHandles` | `true` | Show drag handles on block hover |

## Packaging

To create a `.vsix` package for distribution:

```bash
npm run package
```

## Architecture

The extension has three layers:

1. **Extension Host** (`src/extension.ts`, `src/QuartzEditorProvider.ts`) - Node.js process that handles file I/O, registers the custom editor, and communicates with the webview via `postMessage`.

2. **Webview** (`src/webview/`) - React + TipTap application running in a sandboxed iframe with CSP. Renders the block editor and sends document changes back to the extension host.

3. **Markdown Bridge** (`src/markdown/`) - Bidirectional conversion between CommonMark+GFM markdown and TipTap's ProseMirror JSON document model. Uses `markdown-it` for parsing.

## License

MIT
