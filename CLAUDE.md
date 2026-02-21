# Quartz — Pretty Markdown Editor

A Notion-style WYSIWYG block editor for VS Code that edits `.md` files with round-trip fidelity.

## Quick Reference

- **Version:** 0.1.1
- **Stack:** TypeScript, React 18, TipTap 2.11, markdown-it 14, esbuild
- **VS Code engine:** ^1.85.0
- **Entry points:** `src/extension.ts` (extension), `src/webview/index.tsx` (webview)

## Architecture

See [System Architecture Design Doc](projectManager/design-docs/quartz-system-architecture.md) for full details.

```
VS Code Extension Host          Webview (React)
┌─────────────────────┐         ┌─────────────────────────┐
│ extension.ts        │         │ App.tsx → Editor.tsx     │
│ QuartzEditorProvider│ ◄─msg─► │   ├── parser.ts (MD→JSON)│
│   (CustomTextEditor)│         │   ├── serializer.ts     │
└─────────────────────┘         │   ├── 9 custom extensions│
                                │   └── 6 UI components   │
                                └─────────────────────────┘
```

**Data flow:** File → `QuartzEditorProvider` → webview message → `parser.ts` (markdown-it) → TipTap JSONContent → user edits → `serializer.ts` → webview message → `WorkspaceEdit.replace()` → file saved.

## Key Directories

```
src/
├── extension.ts                # VS Code extension entry
├── QuartzEditorProvider.ts     # Custom editor provider
├── markdown/                   # Parser, serializer, frontmatter
└── webview/
    ├── components/             # FormattingToolbar, SlashMenu, LinkDialog, etc.
    ├── extensions/             # 9 custom TipTap extensions
    ├── commands/               # Slash command definitions
    ├── styles/                 # editor.css, rawBlock.css
    └── utils/                  # debounce
test/
├── *.test.ts                   # Unit tests (Vitest)
├── unit/                       # Additional unit/edge-case tests
├── integration/                # VS Code integration tests
├── e2e/                        # Playwright E2E tests (15 spec files)
└── qa/                         # Manual QA checklists
```

## Development

```bash
npm run build            # Build extension + webview
npm run build:watch      # Watch mode
npm test                 # Unit tests (Vitest)
npm run test:e2e         # E2E tests (Playwright)
npm run test:integration # VS Code integration tests
npm run test:all         # All test suites
npm run package          # Create .vsix
```

## Testing Conventions

- **Unit tests** use Vitest — files in `test/` and `test/unit/`
- **E2E tests** use Playwright — specs in `test/e2e/specs/`, page objects in `test/e2e/pages/`
- **Integration tests** use `@vscode/test-cli` — files in `test/integration/`
- Round-trip fidelity: `parse(serialize(parse(md))) === parse(md)` must hold for all supported block types
- E2E test server: `npm run serve:e2e` starts a local server with `test/e2e/harness.html`

## Code Conventions

- Custom TipTap extensions go in `src/webview/extensions/`
- UI components go in `src/webview/components/`
- Markdown processing logic stays in `src/markdown/` (not in webview components)
- Debounce updates to VS Code at 300ms (`src/webview/utils/debounce.ts`)
- All URLs in link input rules must be sanitized (no `javascript:`, `vbscript:`, suspicious `data:`)

## Design Documents

| Document | Description |
|----------|-------------|
| [System Architecture](projectManager/design-docs/quartz-system-architecture.md) | Full system architecture, data flow, component details |
| [Notion Markdown Editor](projectManager/design-docs/notion-markdown-editor.md) | Original product design |
| [Parser Edge Case Fixes](projectManager/design-docs/parser-edge-case-fixes.md) | Parser/serializer edge cases |
| [Keyboard Shortcut Fixes](projectManager/design-docs/keyboard-shortcut-fixes.md) | Keyboard shortcut improvements |
| [Roundtrip Integrity Fixes](projectManager/design-docs/roundtrip-integrity-fixes.md) | Round-trip fidelity fixes |
| [Undo/Redo System Fixes](projectManager/design-docs/undo-redo-system-fixes.md) | Undo/redo behavior |
| [Slash Menu Edge Cases](projectManager/design-docs/slash-menu-edge-cases.md) | Slash menu improvements |
| [E2E Playwright Testing](projectManager/design-docs/e2e-playwright-testing.md) | E2E test infrastructure |
| [Marketplace Launch](projectManager/design-docs/vscode-marketplace-launch.md) | VS Code marketplace publishing |

## Project Management

Uses structured project management via `projectManager/`. See `projectManager/skills/project-management/SKILL.md` for the full workflow.

**Commands:**
- `/feature-request <title>` — Create a backlog item
- `/design-doc <feature-name>` — Create a design document
- `/review-doc <feature-name>` — Review a design document
- `/create-issues <feature-name>` — Break design doc into issues
- `/issue-status [feature-name]` — Show issue status
