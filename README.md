# Quartz — Clear Markdown Editor for VS Code

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/quartz.quartz-markdown-editor?label=VS%20Code%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=quartz.quartz-markdown-editor)

![Quartz Editor](https://raw.githubusercontent.com/Mathuran/quartz/main/images/quartzDemo.png)

A **Notion-style block-based WYSIWYG markdown editor** that lives inside VS Code. Edit `.md` files visually while keeping them as standard CommonMark + GFM markdown.

## Features

- **Block-based editing** — Every paragraph, heading, list, and code block is a draggable block
- **Slash commands** — Type `/` to insert any block type
- **Keyboard shortcuts** — Cmd+B for bold, Cmd+I for italic, and more
- **Round-trip fidelity** — Your markdown formatting is preserved when you save
- **Callouts** — 8 Obsidian-style admonition types (`> [!note]`, `> [!warning]`, etc.) with collapsible content and custom titles
- **Frontmatter** — Collapsible YAML frontmatter banner with raw editing
- **AI agent compatible** — Editor auto-refreshes when external tools (Claude Code, Cursor, Copilot) modify the file, with no data loss or feedback loops
- **Page layout mode** — Optional document-style view with configurable margins
- **Syntax highlighting** — Code blocks with language-aware highlighting
- **Tables** — Full table editing with Tab navigation
- **Task lists** — Interactive checkboxes that save to markdown
- **List reordering** — Move list items up/down with Option+Arrow keys
- **Theme support** — Automatic, light, or dark themes

### Slash Commands

Type `/` anywhere to quickly insert blocks:

![Slash Commands](https://raw.githubusercontent.com/Mathuran/quartz/main/images/slashCommandDemo.png)

### Table Editing

Create and edit tables with full keyboard navigation:

![Table Editing](https://raw.githubusercontent.com/Mathuran/quartz/main/images/quartzTableDemo.png)

### Callouts

8 Obsidian-style admonition types with colored borders and icons:

![Callouts](https://raw.githubusercontent.com/Mathuran/quartz/main/images/calloutDemo.png)

### Frontmatter

Collapsible YAML frontmatter banner for document metadata:

![Frontmatter](https://raw.githubusercontent.com/Mathuran/quartz/main/images/frontmatterDemo.png)

### Task Lists

Interactive checkboxes that save directly to markdown:

![Task Lists](https://raw.githubusercontent.com/Mathuran/quartz/main/images/taskListDemo.png)

### Code Blocks

Syntax-highlighted code blocks with language detection:

![Code Blocks](https://raw.githubusercontent.com/Mathuran/quartz/main/images/codeBlockDemo.png)

### Dark Theme

Full dark theme support that matches your VS Code theme:

![Dark Theme](https://raw.githubusercontent.com/Mathuran/quartz/main/images/darkThemeDemo.png)

## Installation

**[Install from VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=quartz.quartz-markdown-editor)**

Or manually:
1. Open VS Code
2. Go to Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search **"Quartz"**
4. Click **Install**

## Usage

1. Open any `.md` file
2. Right-click → **"Open With..."** → **"Quartz Markdown Editor"**
3. Start editing!

To set Quartz as the default editor for markdown files, enable `quartz.editor.defaultForMarkdown` in VS Code settings.

## Configuration

All settings are under `quartz.editor.*` in VS Code Settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `defaultForMarkdown` | `false` | Set Quartz as the default `.md` editor |
| `theme` | `"auto"` | Editor theme: `auto`, `light`, or `dark` |
| `fontFamily` | `"inherit"` | Font family (inherit uses VS Code's font) |
| `fontSize` | `16` | Font size in pixels |
| `pageLayout` | `true` | Enable letter-sized page view |
| `pageMargin` | `72` | Inner page margin in pixels |
| `imageDir` | `"./assets"` | Relative path for pasted images |
| `preserveFormatting` | `true` | Maintain original markdown style on round-trip |
| `showBlockHandles` | `true` | Show drag handles on block hover |

## Keyboard Shortcuts

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Bold | `Cmd+B` | `Ctrl+B` |
| Italic | `Cmd+I` | `Ctrl+I` |
| Strikethrough | `Cmd+Shift+S` | `Ctrl+Shift+S` |
| Inline code | `Cmd+E` | `Ctrl+E` |
| Highlight | `Cmd+Shift+H` | `Ctrl+Shift+H` |
| Bullet list | `Cmd+Shift+8` | `Ctrl+Shift+8` |
| Numbered list | `Cmd+Shift+7` | `Ctrl+Shift+7` |
| Task list | `Cmd+Shift+9` | `Ctrl+Shift+9` |
| Indent | `Tab` | `Tab` |
| Unindent | `Shift+Tab` | `Shift+Tab` |
| Move line up | `Opt+↑` | `Alt+↑` |
| Move line down | `Opt+↓` | `Alt+↓` |

## Block Input Rules

Type these at the start of a line to create blocks:

| Input | Result |
|-------|--------|
| `# ` | Heading 1 |
| `## ` | Heading 2 |
| `### ` | Heading 3 |
| `- ` | Bullet list |
| `1. ` | Numbered list |
| `- [ ] ` | Task list |
| `> ` | Blockquote |
| ` ``` ` | Code block |
| `---` | Horizontal rule |

## Known Limitations

- Some advanced markdown features (e.g., footnotes, definition lists) are displayed as raw text
- Images require absolute URLs or workspace-relative paths
- Maximum recommended file size: 10,000 lines for optimal performance

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/Mathuran/quartz).

## License

MIT
