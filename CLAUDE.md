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

## Testing Architecture

Tests are organized into three tiers that run in dependency order — foundational tests fail fast before expensive tests execute.

### Test Pyramid

```
                    ┌─────────────┐
                    │   E2E (15)  │  Playwright — full browser tests
                   ┌┴─────────────┴┐
                   │Integration (5)│  @vscode/test-cli — VS Code runtime
                  ┌┴───────────────┴┐
                  │  Unit (16 files) │  Vitest — pure function tests
                  └─────────────────┘
```

### Execution Order (all tiers)

Each tier runs tests in dependency order. If a foundational test fails, dependent tests are skipped.

**Unit tests (Vitest)** — `npm test`
Uses Vitest `projects` with `sequence.groupOrder` for ordered execution:

| Order | Project | What it validates | Files |
|-------|---------|-------------------|-------|
| 0 | `parser` | Can we parse markdown into JSON? | `parser.test.ts`, `parser-edge-cases.test.ts`, `callout-parser.test.ts` |
| 1 | `serializer` | Can we serialize JSON back to markdown? | `serializer.test.ts`, `serializer-edge-cases.test.ts`, `callout-serializer.test.ts` |
| 2 | `roundtrip` | Does `parse(serialize(parse(md))) === parse(md)`? | `roundtrip.test.ts`, `roundtrip-all-blocks.test.ts`, `callout-roundtrip.test.ts`, `frontmatter-roundtrip.test.ts` |
| 3 | `features` | Do individual features work? | `features.test.ts`, `fixtures.test.ts`, `debounce.test.ts`, `list-item-movement.test.ts` |
| 4 | `edge-cases` | Stress tests and performance | `additional-edge-cases.test.ts`, `performance.test.ts` |

**Integration tests** — `npm run test:integration`
Uses `@vscode/test-cli` inside a real VS Code instance:

| Order | What it validates |
|-------|-------------------|
| 1 | Extension activates (`smoke.test.ts`, `activation.test.ts`) |
| 2 | Custom editor registers (`custom-editor.test.ts`) |
| 3 | Configuration applies (`configuration.test.ts`) |
| 4 | File roundtrip works (`file-roundtrip.test.ts`) |

**E2E tests (Playwright)** — `npm run test:e2e`
Uses Playwright `projects` with `dependencies` for ordered execution:

| Order | Project | What it validates | Specs |
|-------|---------|-------------------|-------|
| 1 | `foundational` | Editor loads, blocks render, inline marks render | `editor-load`, `block-rendering`, `inline-formatting` |
| 2 | `interactions` | Typing, shortcuts, theme, layout, sidebar | `editing`, `keyboard-shortcuts`, `theme`, `page-layout`, `sidebar-alignment` |
| 3 | `features` | Block movement, external changes, roundtrip, slash commands | `block-movement`, `external-change`, `roundtrip`, `slash-commands` |
| 4 | `integration` | Edge cases and full workflow | `edge-cases`, `edge-cases-2`, `comprehensive-editing-workflow` |

### When Adding New Tests

1. **Identify the tier:** Unit (pure functions), Integration (VS Code runtime), E2E (browser)
2. **Identify the level:** Place the test in the correct project/group based on what it depends on
3. **Add to the config:** Update `vitest.config.ts` or `playwright.config.ts` to include the new file in the right project
4. **Naming:** Unit tests in `test/unit/<feature>.test.ts`, E2E specs in `test/e2e/specs/<feature>.spec.ts`
5. **Round-trip rule:** Any new block type MUST have a roundtrip test proving `parse(serialize(parse(md))) === parse(md)`

### When Adding a New Feature (test checklist)

Every new feature should include tests at the appropriate levels:

- [ ] **Parser test** — Does the markdown parse into the expected JSON structure?
- [ ] **Serializer test** — Does the JSON serialize back to the expected markdown?
- [ ] **Roundtrip test** — Is `parse(serialize(parse(md))) === parse(md)` preserved?
- [ ] **Feature test** — Does the feature-specific behavior work? (e.g., keyboard shortcuts, slash commands)
- [ ] **Edge case tests** — What happens with empty content, nested structures, rapid input?
- [ ] **E2E test** — Does the feature work end-to-end in the browser?

### Test Infrastructure

- **E2E test server:** `npm run serve:e2e` starts a local server with `test/e2e/harness.html`
- **Page objects:** `test/e2e/pages/EditorPage.ts` — shared browser interaction helpers
- **Fixtures:** `test/e2e/fixtures/` (E2E), `test/fixtures/` (unit) — shared markdown test data
- **Mocks:** `test/__mocks__/vscode.ts` — VS Code API mock for unit tests

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
