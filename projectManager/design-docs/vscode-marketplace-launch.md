# VS Code Marketplace Launch — Quartz Markdown Editor

**Author:** Mathuran Sadagopan
**Status:** DRAFT
**Created:** 2026-02-15
**Last Updated:** 2026-02-15
**Reviewers:** TBD
**Related Docs:** [markdown-parsing-fixes](./markdown-parsing-fixes.md), [notion-markdown-editor](./notion-markdown-editor.md)

---

## 1. Problem Statement

Quartz is a Notion-style block-based WYSIWYG markdown editor for VS Code that has been in active development. The core editor functionality exists — TipTap/ProseMirror integration, markdown parsing/serialization, slash commands, drag-and-drop, keyboard shortcuts, and configuration options are implemented. However, the extension has never been published to the VS Code Marketplace.

Software engineers and technical writers who want to use Quartz today must clone the repository, install dependencies, and run from source. This limits adoption to developers comfortable with extension development workflows. Publishing to the Marketplace would make Quartz installable in one click, reaching VS Code's 34+ million monthly active users.

Before publishing, several gaps must be addressed: missing documentation (README, CHANGELOG, LICENSE display), marketplace metadata (icon, badges, categories), packaging configuration, and quality assurance to ensure the extension meets marketplace guidelines and user expectations.

---

## 2. Goals and Non-Goals

### Goals

| Priority | Goal |
|----------|------|
| **P0** | Publish Quartz to the VS Code Marketplace as a public, installable extension |
| **P0** | Create a compelling README with screenshots, feature list, and installation instructions that displays correctly on the Marketplace |
| **P0** | Add extension icon (128x128 PNG) and gallery banner for Marketplace listing |
| **P0** | Pass all automated tests (unit, integration, e2e) with 0 failures before release |
| **P0** | Resolve all blocking QA issues (see [markdown-parsing-fixes](./markdown-parsing-fixes.md)) |
| **P1** | Add CHANGELOG.md following Keep a Changelog format |
| **P1** | Configure GitHub Actions CI/CD pipeline for automated testing and publishing |
| **P1** | Achieve <5 second load time for 500+ line documents (performance requirement) |
| **P1** | Support all common markdown block types without errors (no silent failures on unsupported syntax) |
| **P2** | Reach 100 installs within 30 days of launch |
| **P2** | Maintain >4.0 star rating on Marketplace |

### Non-Goals

- **Not launching with AI features** — The Claude Code integration (design doc exists) is a separate future milestone
- **Not supporting non-markdown files** — .md files only for v1.0
- **Not competing on feature parity with Notion** — Focus on core editing, defer advanced features like databases, synced blocks, comments
- **Not building a standalone app** — VS Code extension only, no Electron wrapper or web version
- **Not monetizing** — Free and open-source (MIT license)

---

## 3. Background and Context

### Current State

The Quartz extension is functional but not production-ready:

**Implemented:**
- Custom editor provider for `.md` files
- TipTap editor with React webview
- Block types: paragraphs, headings (H1-H6), bullet lists, ordered lists, task lists, code blocks (with syntax highlighting), blockquotes, tables, horizontal rules, images
- Inline formatting: bold, italic, strikethrough, code, links, highlight
- Slash command menu for block insertion
- Drag-and-drop block reordering
- Keyboard shortcuts (Cmd+B, Cmd+I, etc.)
- Page layout mode with configurable width/margin
- Theme support (auto/light/dark)
- YAML frontmatter preservation
- Round-trip fidelity (markdown → editor → markdown)

**Missing for Launch:**
- README.md with screenshots and documentation
- CHANGELOG.md
- Extension icon
- Marketplace metadata (galleryBanner, badges, categories)
- CI/CD pipeline
- Bug fixes (see [markdown-parsing-fixes.md](./markdown-parsing-fixes.md))

### VS Code Marketplace Requirements

Per [VS Code Publishing Guidelines](https://code.visualstudio.com/api/working-with-extensions/publishing-extension):

1. **Publisher ID** — Must create/use a publisher account on the Marketplace
2. **package.json** metadata:
   - `name`, `displayName`, `description`, `version` ✓ (exists)
   - `publisher` — Currently "quartz", must match registered publisher ID
   - `icon` — 128x128 PNG (missing)
   - `galleryBanner` — Color and theme for Marketplace header (missing)
   - `categories` — At least one from the allowed list (currently "Other")
   - `repository` — GitHub URL (missing)
   - `license` — MIT ✓ (in package.json)
3. **README.md** — Displayed on Marketplace listing (missing)
4. **CHANGELOG.md** — Displayed in "Changelog" tab (missing)
5. **vsce** — VS Code Extension packaging tool, already in scripts (`npm run package`)

### Existing Test Infrastructure

| Type | Location | Status |
|------|----------|--------|
| Unit tests | `test/*.test.ts`, `test/unit/*.test.ts` | Implemented |
| Integration tests | `test/integration/*.test.ts` | Implemented |
| E2E tests | `test/e2e/specs/*.spec.ts` | Implemented (Playwright) |
| QA checklist | `test/qa/release-checklist.md` | Available for final sign-off |

### Known Issues from QA

See [markdown-parsing-fixes.md](./markdown-parsing-fixes.md) for blocking issues identified during QA and their resolution plan.

---

## 4. Proposed Solution

### Overview

The launch consists of four workstreams executed in sequence:

1. **Bug Fixes** — Resolve blocking QA issues (see [markdown-parsing-fixes.md](./markdown-parsing-fixes.md))
2. **Documentation & Assets** — Create README, CHANGELOG, icon, screenshots
3. **Marketplace Configuration** — Update package.json, set up publisher account
4. **CI/CD & Release** — Configure GitHub Actions, publish to Marketplace

### 4.1 Bug Fixes (P0)

Bug fixes are tracked in a separate design document: [markdown-parsing-fixes.md](./markdown-parsing-fixes.md). This launch depends on completing those fixes first.

### 4.2 Documentation & Assets (P0/P1)

**README.md** (P0)

Create a comprehensive README with:

```markdown
# Quartz — Clear Markdown Editor for VS Code

[Screenshot: Editor with various block types]

A Notion-style block-based WYSIWYG markdown editor that lives inside VS Code.

## Features

- **Block-based editing** — Every paragraph, heading, list, and code block is a draggable block
- **Slash commands** — Type `/` to insert any block type
- **Keyboard shortcuts** — Cmd+B for bold, Cmd+I for italic, and more
- **Round-trip fidelity** — Your markdown formatting is preserved when you save
- **Page layout mode** — Optional document-style view with configurable margins
- **Syntax highlighting** — Code blocks with language-aware highlighting
- **Tables** — Full table editing with Tab navigation
- **Task lists** — Interactive checkboxes that save to markdown

## Installation

1. Open VS Code
2. Go to Extensions (Cmd+Shift+X)
3. Search "Quartz"
4. Click Install

## Usage

1. Open any `.md` file
2. Right-click → "Open With..." → "Quartz Markdown Editor"
3. Start editing!

[GIF: Slash command menu in action]

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `quartz.editor.fontSize` | 16 | Editor font size in pixels |
| `quartz.editor.pageLayout` | true | Enable document-style page view |
| `quartz.editor.pageWidth` | 816 | Page width in pixels |
| `quartz.editor.theme` | auto | Theme (auto/light/dark) |

See all settings in VS Code: Preferences → Settings → search "quartz"

## Keyboard Shortcuts

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Bold | Cmd+B | Ctrl+B |
| Italic | Cmd+I | Ctrl+I |
| Strikethrough | Cmd+Shift+S | Ctrl+Shift+S |
| Inline code | Cmd+E | Ctrl+E |
| Bullet list | Cmd+Shift+8 | Ctrl+Shift+8 |
| Numbered list | Cmd+Shift+7 | Ctrl+Shift+7 |
| Task list | Cmd+Shift+9 | Ctrl+Shift+9 |

## Known Limitations

- Some advanced markdown features (e.g., footnotes, definition lists) are displayed as raw text
- Images require absolute URLs or workspace-relative paths
- Maximum recommended file size: 500 lines for optimal performance

## Contributing

[Link to GitHub repo]

## License

MIT
```

**CHANGELOG.md** (P1)

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-02-XX

### Added
- Initial public release
- Block-based WYSIWYG editing for markdown files
- Slash command menu for block insertion
- Drag-and-drop block reordering
- Inline formatting toolbar (bold, italic, strikethrough, code, link, highlight)
- Keyboard shortcuts for common formatting
- Table editing with Tab navigation
- Task list checkboxes
- Code block syntax highlighting
- Page layout mode with configurable width and margins
- Theme support (auto, light, dark)
- YAML frontmatter preservation
- Round-trip markdown fidelity
```

**Extension Icon** (P0)

- Design: Abstract "Q" letterform or stylized document/block icon
- Size: 128x128 PNG with transparent background
- Colors: Complement VS Code's dark/light themes (suggest: deep blue/purple gradient)
- File: `images/icon.png`

**Screenshots** (P0)

Capture 3-4 screenshots for Marketplace gallery:
1. Editor with mixed content (heading, paragraph, code block, list)
2. Slash command menu open
3. Table editing
4. Light and dark theme comparison

Store in `images/` directory.

### 4.3 Marketplace Configuration (P0)

**Update package.json:**

```jsonc
{
  "name": "quartz-markdown-editor",
  "displayName": "Quartz — Clear Markdown Editor",
  "description": "A Notion-style block-based WYSIWYG markdown editor for VS Code",
  "version": "1.0.0",
  "publisher": "quartz-editor",  // Must match registered publisher ID
  "icon": "images/icon.png",
  "galleryBanner": {
    "color": "#1a1a2e",
    "theme": "dark"
  },
  "categories": [
    "Other",
    "Visualization"
  ],
  "keywords": [
    "markdown",
    "editor",
    "wysiwyg",
    "notion",
    "block editor",
    "tiptap"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/quartz"
  },
  "homepage": "https://github.com/YOUR_USERNAME/quartz#readme",
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/quartz/issues"
  },
  "license": "MIT",
  // ... existing configuration
}
```

**Create Publisher Account:**

1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with Microsoft account
3. Create publisher with ID: `quartz-editor` (or available alternative)
4. Generate Personal Access Token (PAT) with `Marketplace (Publish)` scope

### 4.4 CI/CD Pipeline (P1)

**GitHub Actions workflow:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e

  package:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run package
      - uses: actions/upload-artifact@v4
        with:
          name: vsix
          path: '*.vsix'
```

**Release workflow:** `.github/workflows/release.yml`

```yaml
name: Release

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run package
      - name: Publish to Marketplace
        run: npx vsce publish -p ${{ secrets.VSCE_PAT }}
```

**Required secrets:**
- `VSCE_PAT`: Personal Access Token from Azure DevOps with Marketplace publish scope

### 4.5 Release Process

1. **Pre-release checklist:**
   - [ ] All unit tests pass (`npm test`)
   - [ ] All integration tests pass (`npm run test:integration`)
   - [ ] All e2e tests pass (`npm run test:e2e`)
   - [ ] QA checklist completed with all tests passing
   - [ ] README.md reviewed and screenshots current
   - [ ] CHANGELOG.md updated for version
   - [ ] Version bumped in package.json
   - [ ] Extension packaged locally (`npm run package`) and tested

2. **Publish:**
   - Create GitHub release with tag `v1.0.0`
   - GitHub Actions publishes to Marketplace automatically
   - Verify listing at https://marketplace.visualstudio.com/items?itemName=quartz-editor.quartz-markdown-editor

3. **Post-release:**
   - Monitor GitHub issues for bug reports
   - Respond to Marketplace reviews
   - Track install count and rating

---

## 5. Alternative Solutions Considered

### Alternative A: Publish to Open VSX Registry Only

**Approach:** Publish to Open VSX (open-source VS Code extension registry used by VS Codium, Gitpod, etc.) instead of the official Marketplace.

**Pros:**
- No Microsoft account required
- Reaches open-source VS Code forks

**Cons:**
- Much smaller user base (<5% of VS Code users)
- Missing from the default VS Code Extensions view
- Less discoverability

**Why rejected:** The goal is maximum reach. We can publish to both registries, but the Microsoft Marketplace must be the primary target.

### Alternative B: Private/Internal Release First

**Approach:** Distribute the .vsix file manually (via GitHub releases or internal channels) for 4-8 weeks before public Marketplace listing.

**Pros:**
- Gather feedback from known users before public launch
- Fix bugs without affecting Marketplace rating
- Build testimonials for launch

**Cons:**
- Delays reaching the broader audience
- Manual installation friction reduces testers
- No Marketplace reviews to build social proof

**Why rejected:** The QA checklist and test suite provide sufficient confidence. A private beta would delay launch without proportionate benefit. We can iterate quickly post-launch.

### Alternative C: Paid Extension or Freemium Model

**Approach:** Launch as a paid extension ($5-10 one-time) or freemium (core features free, advanced features paid).

**Pros:**
- Revenue to fund development
- Attracts serious users

**Cons:**
- Paid extensions have lower adoption (90%+ of Marketplace extensions are free)
- Complex licensing and payment infrastructure
- Feature gating complicates UX
- Competes against free alternatives (built-in preview, Markdown All in One, etc.)

**Why rejected:** The goal is adoption, not revenue. Free + open-source (MIT) maximizes reach and community contribution.

---

## 6. Security, Privacy, and Compliance

### Data Handling

- **No telemetry:** Quartz does not collect usage analytics, crash reports, or any user data
- **No network requests:** The extension operates entirely offline; no API calls are made
- **Local files only:** All file operations use VS Code's workspace file system API; no data leaves the user's machine

### Extension Permissions

The extension requires no special VS Code permissions beyond:
- `customEditors` contribution point (declares the editor provider)
- Standard file read/write through VS Code's document API

No access to:
- Terminal
- Debug sessions
- Source control
- Network
- External processes

### Supply Chain Security

- All dependencies are from npm with verified publishers
- `package-lock.json` locks exact versions
- Dependabot or Renovate can be configured for automated security updates
- No native modules or compiled binaries

### Compliance

- **MIT License:** Permissive open-source license, commercial use allowed
- **No GDPR concerns:** No personal data collected
- **Marketplace compliance:** Extension follows all VS Code Marketplace policies

---

## 7. Testing Strategy

### Unit Tests (Existing)

| Test File | Coverage |
|-----------|----------|
| `test/parser.test.ts` | Markdown → ProseMirror parsing |
| `test/serializer.test.ts` | ProseMirror → Markdown serialization |
| `test/roundtrip.test.ts` | Parse → serialize → parse equivalence |
| `test/features.test.ts` | Block type features |
| `test/debounce.test.ts` | Debounce utility |
| `test/unit/roundtrip-all-blocks.test.ts` | All block type round-trip |
| `test/unit/parser-edge-cases.test.ts` | Parser edge cases |
| `test/unit/serializer-edge-cases.test.ts` | Serializer edge cases |

**Pre-launch requirement:** 100% pass rate

### Integration Tests (Existing)

| Test File | Coverage |
|-----------|----------|
| `test/integration/activation.test.ts` | Extension activation |
| `test/integration/smoke.test.ts` | Basic functionality |
| `test/integration/custom-editor.test.ts` | Custom editor provider |
| `test/integration/file-roundtrip.test.ts` | File save/load |
| `test/integration/configuration.test.ts` | Settings |

**Pre-launch requirement:** 100% pass rate

### E2E Tests (Existing)

| Test File | Coverage |
|-----------|----------|
| `test/e2e/specs/editor-load.spec.ts` | Document loading |
| `test/e2e/specs/editing.spec.ts` | Basic editing |
| `test/e2e/specs/roundtrip.spec.ts` | Round-trip fidelity |
| `test/e2e/specs/keyboard-shortcuts.spec.ts` | Keyboard shortcuts |
| `test/e2e/specs/inline-formatting.spec.ts` | Inline formatting |
| `test/e2e/specs/block-rendering.spec.ts` | Block rendering |
| `test/e2e/specs/slash-commands.spec.ts` | Slash command menu |
| `test/e2e/specs/drag-drop.spec.ts` | Drag and drop |
| `test/e2e/specs/theme.spec.ts` | Theme switching |
| `test/e2e/specs/page-layout.spec.ts` | Page layout mode |
| `test/e2e/specs/external-change.spec.ts` | External file changes |
| `test/e2e/specs/comprehensive-editing-workflow.spec.ts` | Full workflow |

**Pre-launch requirement:** 100% pass rate

### Manual QA

Execute full `test/qa/release-checklist.md`:
- 96 test cases across 16 feature areas
- Sign-off by tester with date

### Performance Testing

| Metric | Target | Test Method |
|--------|--------|-------------|
| Initial load (100-line file) | <1 second | E2E timer |
| Initial load (500-line file) | <5 seconds | E2E timer |
| Typing latency | <16ms (60fps) | Manual feel test |
| Save operation | <500ms | E2E timer |

### New Tests for Launch

See [markdown-parsing-fixes.md](./markdown-parsing-fixes.md) for test additions related to bug fixes.

---

## 8. Rollout Plan

### Phase 1: Bug Fixes (Week 1)

Complete issues from [markdown-parsing-fixes.md](./markdown-parsing-fixes.md).

- **Exit criteria:** All blocking QA issues resolved, automated tests passing

### Phase 2: Documentation & Assets (Week 1-2)

- Write README.md with screenshots
- Create CHANGELOG.md
- Design and create extension icon
- Capture 4 screenshots for gallery
- **Exit criteria:** README reviewed, icon approved

### Phase 3: Marketplace Setup (Week 2)

- Update package.json metadata
- Create publisher account
- Generate PAT
- Test local packaging (`npm run package`)
- Test manual install of .vsix
- **Exit criteria:** .vsix installs correctly in fresh VS Code

### Phase 4: CI/CD (Week 2-3)

- Create GitHub Actions CI workflow
- Create GitHub Actions release workflow
- Add VSCE_PAT secret to repository
- Test pipeline with a pre-release tag
- **Exit criteria:** Automated release publishes to Marketplace

### Phase 5: Release (Week 3)

- Final QA pass (full checklist)
- Version bump to 1.0.0
- Create GitHub release `v1.0.0`
- Verify Marketplace listing
- **Exit criteria:** Extension live on Marketplace

### Phase 6: Post-Launch (Week 4+)

- Monitor GitHub issues
- Respond to Marketplace reviews
- Track metrics (installs, rating)
- Plan v1.1 based on feedback

---

## 9. Dependencies and Risks

### Dependencies

| Dependency | Type | Owner | Notes |
|------------|------|-------|-------|
| Azure DevOps PAT | External | Maintainer | Required for vsce publish |
| Microsoft account | External | Maintainer | Required for publisher registration |
| GitHub Actions | External | GitHub | CI/CD platform |
| vsce CLI | npm package | Microsoft | Extension packaging tool |
| Node.js 20 | Runtime | — | Required for build |
| TipTap/ProseMirror | npm packages | — | Core editor, stable |

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Blocking bugs not fixed in time** | High | Medium | See [markdown-parsing-fixes.md](./markdown-parsing-fixes.md); prioritize P0 bugs first |
| **Publisher name unavailable** | Low | Low | Have 2-3 fallback publisher IDs ready |
| **PAT expires or leaks** | Medium | Low | Use short-lived tokens; rotate after any exposure |
| **Negative initial reviews** | Medium | Medium | Thorough QA; quick response to issues; v1.0.1 patch ready |
| **CI pipeline fails on release** | High | Low | Test pipeline with pre-release first; manual fallback available |
| **Low discoverability** | Medium | Medium | Optimize keywords; encourage early reviews; share on social media |
| **Performance issues on user machines** | Medium | Medium | Document recommended file sizes; monitor feedback |

---

## 10. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | What is the GitHub repository URL to use in package.json? | Maintainer | Open |
| 2 | What publisher ID will be registered? ("quartz-editor", "quartz", etc.) | Maintainer | Open |
| 3 | Who will design the extension icon? Use an AI tool, hire a designer, or simple text-based icon? | Maintainer | Open |
| 4 | Should we add Open VSX publishing to reach VS Codium users, or defer to v1.1? | Maintainer | Open |
| 5 | What is the target release date for v1.0.0? | Maintainer | Open |

---

## 11. Implementation Issues

| # | Title | Status | Scope |
|---|-------|--------|-------|
| [001](../issues/vscode-marketplace-launch/001-create-extension-icon.md) | Create Extension Icon | DONE | S |
| [002](../issues/vscode-marketplace-launch/002-capture-screenshots.md) | Capture Screenshots for Marketplace Gallery | TODO | S |
| [003](../issues/vscode-marketplace-launch/003-write-readme.md) | Write README.md for Marketplace | DONE | M |
| [004](../issues/vscode-marketplace-launch/004-create-changelog.md) | Create CHANGELOG.md | DONE | XS |
| [005](../issues/vscode-marketplace-launch/005-create-publisher-account.md) | Create VS Code Marketplace Publisher Account | TODO | S |
| [006](../issues/vscode-marketplace-launch/006-update-package-json-metadata.md) | Update package.json Marketplace Metadata | DONE | S |
| [007](../issues/vscode-marketplace-launch/007-test-local-packaging.md) | Test Local Packaging and Installation | DONE | S |
| [008](../issues/vscode-marketplace-launch/008-create-github-actions-ci.md) | Create GitHub Actions CI Workflow | DONE | M |
| [009](../issues/vscode-marketplace-launch/009-create-github-actions-release.md) | Create GitHub Actions Release Workflow | DONE | M |
| [010](../issues/vscode-marketplace-launch/010-final-qa-and-release.md) | Final QA Pass and v1.0.0 Release | TODO | M |

**Progress:** 8/10 issues complete (80%)

---

## 12. Appendix

### A. VS Code Marketplace Categories (Allowed Values)

- Azure
- Data Science
- Debuggers
- Education
- Extension Packs
- Formatters
- Keymaps
- Language Packs
- Linters
- Machine Learning
- Notebooks
- Other
- Programming Languages
- SCM Providers
- Snippets
- Testing
- Themes
- Visualization

**Recommendation:** Use "Other" and "Visualization"

### B. Competitor Analysis

| Extension | Installs | Rating | Differentiator |
|-----------|----------|--------|----------------|
| Markdown All in One | 8.5M | 4.5 | Feature-rich but not WYSIWYG |
| Markdown Preview Enhanced | 4.2M | 4.6 | Powerful preview, not editing |
| Foam | 600K | 4.4 | Knowledge graph focus |
| Dendron | 150K | 4.2 | Hierarchical notes |

**Quartz differentiator:** True block-based WYSIWYG editing (like Notion) inside VS Code. No split-pane preview — what you see is what you get.

### C. Launch Announcement Template

```
🚀 Introducing Quartz — A Notion-style Markdown Editor for VS Code

Tired of split-pane markdown previews? Quartz brings true WYSIWYG editing to VS Code.

✨ Features:
• Block-based editing with drag-and-drop
• Slash commands for quick block insertion
• Full keyboard shortcut support
• Tables, task lists, code blocks with syntax highlighting
• Your markdown formatting is preserved

Install now: [Marketplace link]

#vscode #markdown #opensource
```

### D. File Checklist for v1.0.0

```
quartz/
├── README.md              ← Create
├── CHANGELOG.md           ← Create
├── LICENSE                ✓ Exists (MIT)
├── package.json           ← Update metadata
├── images/
│   ├── icon.png           ← Create (128x128)
│   ├── screenshot-1.png   ← Capture
│   ├── screenshot-2.png   ← Capture
│   ├── screenshot-3.png   ← Capture
│   └── screenshot-4.png   ← Capture
├── .github/
│   └── workflows/
│       ├── ci.yml         ← Create
│       └── release.yml    ← Create
└── ... (existing source files)
```
