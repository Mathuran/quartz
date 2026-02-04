# E2E Playwright Testing Environment Design Document

**Author:** Quartz Team
**Status:** DRAFT
**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Reviewers:** TBD

---

## 1. Problem Statement

Quartz is a VS Code custom editor extension where the core editing experience lives in a webview — a React + TipTap application bundled as an IIFE. Today, the project has unit tests (Vitest, 87+ tests covering parser/serializer/roundtrip) and VS Code integration tests (`@vscode/test-cli` for activation and basic editor operations), but there are no end-to-end tests that exercise the actual browser-rendered editor UI.

This means user-facing regressions — broken formatting toolbars, slash commands not rendering, drag-and-drop failures, keyboard shortcuts not firing, theme rendering issues — can ship undetected. Manual QA via `test/qa/test-all-blocks.md` is the only safeguard, which is slow and unreliable for continuous development. Without browser-level E2E tests, every change to the webview, TipTap extensions, or CSS requires manual verification.

## 2. Goals and Non-Goals

### Goals

- **P0:** Create a standalone HTML harness that serves the Quartz webview bundle (`dist/webview/index.js` + `index.css`) in a real browser, with a mock `acquireVsCodeApi()` that simulates the extension host message protocol
- **P0:** Integrate Playwright as the E2E test runner, with tests that open the editor, load markdown fixtures, and verify rendered output
- **P0:** Build a fixture loader utility that loads premade `.md` files into the editor via the message protocol and supports in-browser editing verification
- **P1:** Cover 10+ core editing scenarios: headings, bold/italic, lists, code blocks, tables, task lists, slash commands, keyboard shortcuts, drag-and-drop, and page layout rendering
- **P1:** Add `npm run test:e2e` script that builds the app, starts a local server, runs Playwright tests, and tears down cleanly
- **P2:** Capture visual regression screenshots for page layout mode across light/dark themes
- **P2:** Generate an HTML test report via Playwright's built-in reporter

### Non-Goals

- Testing the VS Code extension host or `QuartzEditorProvider` (covered by existing integration tests)
- Testing file I/O, workspace edits, or VS Code API interactions
- Cross-browser testing beyond Chromium (VS Code webviews use Chromium)
- Performance benchmarking (covered by existing `performance.test.ts`)
- CI/CD pipeline integration (separate future effort)

## 3. Background and Context

### Current Architecture

Quartz has a three-layer architecture:

1. **Extension Host (Node.js):** Manages file I/O and VS Code integration via `QuartzEditorProvider`
2. **Webview (Browser):** React + TipTap editor, bundled as IIFE (`dist/webview/index.js`, ~927 KB)
3. **Markdown Bridge:** Parser (`markdown-it` → ProseMirror JSON) and serializer (ProseMirror JSON → markdown)

The webview communicates with the extension host via a message protocol:

| Direction | Message Type | Payload |
|-----------|-------------|---------|
| Extension → Webview | `loadDocument` | `{ content: string, fileName: string }` |
| Extension → Webview | `configUpdate` | `{ config: EditorConfig }` |
| Extension → Webview | `externalChange` | `{ content: string }` |
| Webview → Extension | `ready` | `{}` |
| Webview → Extension | `update` | `{ content: string }` |

### Key Dependency

The webview calls `acquireVsCodeApi()` at module scope in `App.tsx` (line 11). This function is injected by VS Code's webview runtime. For standalone browser testing, this must be mocked before the bundle loads.

### Existing Test Fixtures

The project already has markdown fixtures in `test/integration/fixtures/`:
- `simple.md` — 3 paragraphs
- `complex.md` — tables, code blocks, quotes, task lists
- `frontmatter.md` — YAML frontmatter + content
- `empty.md` — empty file
- `large.md` — 1403 lines, 50+ sections

### Build Pipeline

esbuild produces two bundles:
- `dist/extension.js` (CJS, Node.js)
- `dist/webview/index.js` (IIFE, browser) + `dist/webview/index.css`

The webview bundle is self-contained and can be served by any HTTP server.

## 4. Proposed Solution

### Overview

Create a lightweight test harness that serves the Quartz webview in a standalone browser page, mocking the VS Code API layer. Playwright tests interact with this page to verify editor behavior end-to-end.

The approach decouples the webview from VS Code entirely — no need for `@vscode/test-electron` or headless VS Code instances. This makes tests fast, reliable, and easy to debug.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Playwright Test                     │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Fixture      │  │ Page Object  │  │ Assertions  │ │
│  │ Loader       │  │ Model        │  │             │ │
│  └──────┬──────┘  └──────┬───────┘  └─────────────┘ │
│         │                │                            │
└─────────┼────────────────┼────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────┐
│              Test Harness (HTML page)                 │
│  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │ acquireVsCodeApi │  │ dist/webview/index.js    │ │
│  │ mock (global)    │  │ + index.css              │ │
│  └──────────────────┘  └──────────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐│
│  │ Message Bridge: window.postMessage ↔ mock API   ││
│  └──────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│  Static File Server (localhost:3100)                  │
│  Serves: test/e2e/harness.html + dist/webview/*      │
└─────────────────────────────────────────────────────┘
```

### Detailed Design

#### 4.1 Test Harness (`test/e2e/harness.html`)

A minimal HTML page that:

1. Defines `window.acquireVsCodeApi()` before any scripts load, returning a mock object that captures `postMessage` calls and exposes them via `window.__quartzMessages`
2. Loads `dist/webview/index.css` and `dist/webview/index.js`
3. Provides a `<div id="root">` mount point
4. Exposes `window.__loadMarkdown(content, fileName)` helper that posts a `loadDocument` message to the webview
5. Exposes `window.__getLastUpdate()` to read the most recent `update` message sent by the webview

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Quartz E2E Test Harness</title>
  <link rel="stylesheet" href="/dist/webview/index.css">
  <script>
    // Mock VS Code API before bundle loads
    window.__quartzMessages = [];
    window.__quartzLastUpdate = null;
    window.acquireVsCodeApi = function() {
      return {
        postMessage: function(msg) {
          window.__quartzMessages.push(msg);
          if (msg.type === 'update') {
            window.__quartzLastUpdate = msg.content;
          }
          // When webview sends "ready", auto-load if pending
          if (msg.type === 'ready' && window.__pendingLoad) {
            window.postMessage(window.__pendingLoad, '*');
            window.__pendingLoad = null;
          }
        },
        getState: function() { return null; },
        setState: function() {}
      };
    };

    window.__loadMarkdown = function(content, fileName) {
      var msg = { type: 'loadDocument', content: content, fileName: fileName || 'test.md' };
      // If editor not ready yet, queue it
      var readyMsg = window.__quartzMessages.find(function(m) { return m.type === 'ready'; });
      if (readyMsg) {
        window.postMessage(msg, '*');
      } else {
        window.__pendingLoad = msg;
      }
    };

    window.__getLastUpdate = function() {
      return window.__quartzLastUpdate;
    };

    window.__updateConfig = function(config) {
      window.postMessage({ type: 'configUpdate', config: config }, '*');
    };
  </script>
</head>
<body>
  <div id="root"></div>
  <script src="/dist/webview/index.js"></script>
</body>
</html>
```

#### 4.2 Fixture Loader (`test/e2e/fixtures.ts`)

A Playwright utility module that:

- Reads `.md` files from `test/e2e/fixtures/` and `test/integration/fixtures/` (reuse existing)
- Provides helper functions to load content into the editor page
- Waits for the editor to be ready (TipTap `.ProseMirror` element present and contenteditable)

```typescript
import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const SHARED_FIXTURES_DIR = path.resolve(__dirname, '../integration/fixtures');

export async function loadFixture(page: Page, fixtureName: string): Promise<string> {
  let filePath = path.join(FIXTURES_DIR, fixtureName);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(SHARED_FIXTURES_DIR, fixtureName);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  await loadMarkdown(page, content, fixtureName);
  return content;
}

export async function loadMarkdown(page: Page, content: string, fileName = 'test.md'): Promise<void> {
  await page.evaluate(
    ({ content, fileName }) => (window as any).__loadMarkdown(content, fileName),
    { content, fileName }
  );
  // Wait for editor to render
  await page.waitForSelector('.ProseMirror[contenteditable="true"]', { timeout: 5000 });
}

export async function getEditorMarkdown(page: Page): Promise<string | null> {
  return page.evaluate(() => (window as any).__getLastUpdate());
}

export async function waitForUpdate(page: Page, timeout = 2000): Promise<string> {
  // Wait for debounced update (300ms debounce + buffer)
  await page.waitForFunction(
    () => (window as any).__quartzLastUpdate !== null,
    { timeout }
  );
  return page.evaluate(() => (window as any).__quartzLastUpdate);
}
```

#### 4.3 Page Object Model (`test/e2e/pages/editor.page.ts`)

A page object encapsulating common editor interactions:

```typescript
import { Page, Locator } from '@playwright/test';

export class EditorPage {
  readonly page: Page;
  readonly editor: Locator;
  readonly prosemirror: Locator;

  constructor(page: Page) {
    this.page = page;
    this.editor = page.locator('.quartz-app');
    this.prosemirror = page.locator('.ProseMirror');
  }

  async goto() {
    await this.page.goto('http://localhost:3100/test/e2e/harness.html');
    await this.page.waitForSelector('#root');
  }

  // Block-level queries
  heading(level: number) { return this.prosemirror.locator(`h${level}`); }
  paragraph() { return this.prosemirror.locator('p'); }
  codeBlock() { return this.prosemirror.locator('pre code'); }
  bulletList() { return this.prosemirror.locator('ul'); }
  orderedList() { return this.prosemirror.locator('ol'); }
  taskList() { return this.prosemirror.locator('ul[data-type="taskList"]'); }
  blockquote() { return this.prosemirror.locator('blockquote'); }
  table() { return this.prosemirror.locator('table'); }
  horizontalRule() { return this.prosemirror.locator('hr'); }

  // Inline queries
  bold() { return this.prosemirror.locator('strong'); }
  italic() { return this.prosemirror.locator('em'); }
  inlineCode() { return this.prosemirror.locator('code'); }
  link() { return this.prosemirror.locator('a'); }

  // Interactions
  async typeInEditor(text: string) {
    await this.prosemirror.click();
    await this.page.keyboard.type(text);
  }

  async pressKeys(keys: string) {
    await this.page.keyboard.press(keys);
  }

  async triggerSlashCommand(command: string) {
    await this.prosemirror.click();
    await this.page.keyboard.type('/');
    await this.page.waitForSelector('.slash-menu');
    await this.page.keyboard.type(command);
    await this.page.keyboard.press('Enter');
  }

  async selectAllText() {
    await this.prosemirror.click();
    await this.page.keyboard.press('Meta+a');
  }
}
```

#### 4.4 Static File Server (`test/e2e/server.ts`)

A minimal HTTP server for test setup:

```typescript
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const PORT = 3100;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.md': 'text/plain',
};

export function startServer(): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(ROOT, req.url || '/');
      const ext = path.extname(filePath);
      const mime = MIME_TYPES[ext] || 'application/octet-stream';

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.writeHead(200, { 'Content-Type': mime });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

export function stopServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}
```

#### 4.5 Playwright Configuration (`playwright.config.ts`)

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3100',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  reporter: [
    ['html', { outputFolder: 'test-results/e2e-report' }],
    ['list'],
  ],
  webServer: {
    command: 'npm run build && npx tsx test/e2e/server.ts',
    port: 3100,
    reuseExistingServer: !process.env.CI,
  },
});
```

#### 4.6 File Structure

```
test/e2e/
├── harness.html              # Standalone HTML harness
├── server.ts                 # Static file server
├── fixtures.ts               # Fixture loader utility
├── fixtures/                 # E2E-specific markdown fixtures
│   ├── all-blocks.md         # Every block type
│   ├── inline-formatting.md  # Bold, italic, code, links
│   ├── nested-lists.md       # Deeply nested lists
│   └── slash-commands.md     # Content created via slash commands
├── pages/
│   └── editor.page.ts        # Page object model
└── specs/
    ├── editor-load.spec.ts   # Loading markdown fixtures
    ├── block-rendering.spec.ts # All block types render correctly
    ├── inline-formatting.spec.ts # Text formatting
    ├── keyboard-shortcuts.spec.ts # Ctrl+B, Ctrl+I, etc.
    ├── slash-commands.spec.ts # Slash command menu & insertion
    ├── editing.spec.ts       # Typing, deleting, undo/redo
    ├── roundtrip.spec.ts     # Load → edit → serialize fidelity
    ├── theme.spec.ts         # Light/dark theme rendering
    ├── page-layout.spec.ts   # Page layout mode dimensions
    └── drag-drop.spec.ts     # Block drag-and-drop reordering
```

### 4.7 Example Test (`test/e2e/specs/editor-load.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadFixture, loadMarkdown, waitForUpdate } from '../fixtures';

test.describe('Editor Loading', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('loads simple markdown and renders paragraphs', async ({ page }) => {
    await loadFixture(page, 'simple.md');
    const paragraphs = editorPage.paragraph();
    await expect(paragraphs).toHaveCount(3);
  });

  test('loads complex markdown with all block types', async ({ page }) => {
    await loadFixture(page, 'complex.md');
    await expect(editorPage.heading(1)).toBeVisible();
    await expect(editorPage.codeBlock()).toBeVisible();
    await expect(editorPage.table()).toBeVisible();
    await expect(editorPage.blockquote()).toBeVisible();
  });

  test('handles empty document', async ({ page }) => {
    await loadFixture(page, 'empty.md');
    await expect(editorPage.prosemirror).toBeVisible();
  });

  test('edits text and produces updated markdown', async ({ page }) => {
    await loadMarkdown(page, '# Hello\n\nWorld');
    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' there');
    const updated = await waitForUpdate(page);
    expect(updated).toContain('there');
  });
});
```

## 5. Alternative Solutions Considered

### Alternative A: Playwright + VS Code Extension Test Host

**Approach:** Use `@vscode/test-electron` to launch a full VS Code instance and use Playwright to attach to the webview inside VS Code's Electron shell.

**Pros:**
- Tests the full stack including extension host ↔ webview communication
- No mock layer needed
- Matches real user environment exactly

**Cons:**
- Slow startup (~5-10s per VS Code instance)
- Flaky due to VS Code UI interactions (menus, tabs, focus)
- Requires Electron-specific Playwright configuration
- Difficult to debug — webview is nested inside VS Code's iframe structure
- Cannot run headless on all CI environments

**Why not chosen:** The webview is where 90% of user interaction happens. Testing it in isolation gives faster feedback, better reliability, and easier debugging. The existing `@vscode/test-cli` integration tests already cover extension host behavior.

### Alternative B: Cypress Instead of Playwright

**Approach:** Use Cypress for browser-based E2E testing with the same standalone harness approach.

**Pros:**
- Good debugging experience with time-travel snapshots
- Large community and plugin ecosystem

**Cons:**
- Slower test execution than Playwright
- No native multi-tab or multi-page support
- Heavier dependency footprint
- VS Code's own webview uses Chromium, making Playwright a more natural fit
- Playwright's `webServer` config handles build+serve automatically

**Why not chosen:** Playwright is faster, lighter, and a better architectural match for testing a Chromium-targeted webview. Its built-in test server management and trace viewer provide equivalent or better DX.

### Alternative C: Vitest Browser Mode

**Approach:** Use Vitest's experimental browser mode to run existing-style tests in a real browser context.

**Pros:**
- Reuses existing test infrastructure
- Familiar API for the team

**Cons:**
- Browser mode is still experimental and unstable
- Limited support for complex DOM interactions (drag-and-drop, keyboard events)
- No built-in screenshot/visual regression tooling
- Not designed for full page-level E2E testing

**Why not chosen:** Vitest browser mode is better suited for component testing, not full E2E scenarios involving page navigation, network requests, and complex user interactions.

## 6. Security, Privacy, and Compliance

### Test Harness Security

- The test harness runs on `localhost:3100` and is not exposed to the network
- No authentication or sensitive data involved — tests use synthetic markdown fixtures
- The mock `acquireVsCodeApi()` does not have access to the real VS Code API or filesystem
- No user data or PII is used in test fixtures

### CSP Considerations

- The standalone harness intentionally relaxes the CSP that `QuartzEditorProvider` enforces (no nonce requirement) since it runs only in test environments
- Production CSP is unaffected — it is generated by `QuartzEditorProvider.ts`, not by the test harness

### Dependency Security

- Playwright is an official Microsoft project with regular security updates
- No additional runtime dependencies added to the production bundle

## 7. Testing Strategy

### Test Categories

| Category | Count | Priority | Description |
|----------|-------|----------|-------------|
| Editor Loading | 4-5 | P0 | Fixture loading, empty docs, large docs |
| Block Rendering | 10-12 | P0 | All block types render from markdown |
| Inline Formatting | 5-6 | P0 | Bold, italic, code, strikethrough, links |
| Keyboard Shortcuts | 8-10 | P1 | Ctrl+B, Ctrl+I, Ctrl+Z, Ctrl+Shift+Z, etc. |
| Slash Commands | 5-6 | P1 | Menu opens, commands insert correct blocks |
| Editing & Roundtrip | 4-5 | P0 | Type text, verify serialized output matches |
| Theme Rendering | 2-3 | P2 | Light/dark theme CSS applied correctly |
| Page Layout | 2-3 | P2 | Letter-size dimensions, margin calculations |
| Drag & Drop | 2-3 | P2 | Block reordering via drag handle |
| Visual Regression | 3-4 | P2 | Screenshot comparisons for layout |

**Total: 45-57 test cases across 10 spec files**

### Test Data

- Reuse existing fixtures from `test/integration/fixtures/` (simple, complex, frontmatter, empty, large)
- Add new E2E-specific fixtures in `test/e2e/fixtures/` for targeted scenarios (inline formatting combos, nested lists, slash command output)

### Test Execution

- Tests run against the built webview bundle (`dist/webview/`)
- Playwright's `webServer` config builds the project before running tests
- Tests use a shared server instance per worker (not per test)
- Debounced updates require `waitForUpdate()` with appropriate timeouts

## 8. Rollout Plan

### Phase 1: Foundation

- Install Playwright and add configuration
- Create test harness HTML with VS Code API mock
- Create static file server
- Create fixture loader and page object model
- Write 5 P0 smoke tests (load, render headings, render code blocks, type text, verify roundtrip)
- Add `npm run test:e2e` script

### Phase 2: Core Coverage

- Add all block rendering tests
- Add inline formatting tests
- Add keyboard shortcut tests
- Add slash command tests
- Add editing and roundtrip tests

### Phase 3: Polish

- Add theme rendering tests
- Add page layout tests
- Add drag-and-drop tests
- Add visual regression screenshots
- Configure HTML reporter
- Update `npm run test:all` to include E2E

### Monitoring

- Test failures produce screenshots and traces automatically (Playwright config: `screenshot: 'only-on-failure'`, `trace: 'retain-on-failure'`)
- HTML report generated in `test-results/e2e-report/`

### Rollback

- E2E tests are additive — removing them has no impact on production code
- The test harness is isolated in `test/e2e/` and does not modify any source files

## 9. Dependencies and Risks

### Dependencies

| Dependency | Type | Version | Purpose |
|-----------|------|---------|---------|
| `@playwright/test` | devDependency | ^1.49 | Test runner and assertions |
| `playwright` | devDependency | ^1.49 | Browser automation (bundled with above) |

No new production dependencies.

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| `acquireVsCodeApi` mock diverges from real API behavior | Tests pass but real behavior breaks | Medium | Keep mock minimal (only `postMessage`, `getState`, `setState`); validate against real extension tests |
| TipTap DOM structure changes between versions | Selectors in page objects break | Medium | Use semantic selectors (tag names, `data-type` attributes) over class names; pin TipTap versions |
| Debounce timing makes tests flaky | Intermittent failures | Medium | Use `waitForUpdate()` with generous timeouts; avoid timing-dependent assertions |
| Playwright browser download fails in dev environments | Tests can't run | Low | Document setup steps; use `npx playwright install chromium` |
| Test harness HTML diverges from real VS Code webview HTML | Tests don't catch real rendering issues | Low | Keep harness minimal; test CSS separately from functionality |

## 10. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Should we add Firefox/WebKit projects to Playwright config or stick with Chromium only? | Team | Open |
| 2 | Should the test server port (3100) be configurable via env var? | Team | Open |
| 3 | Should visual regression screenshots be committed to the repo or generated fresh each run? | Team | Open |
| 4 | Do we need to test the `externalChange` message path (simulating external file edits)? | Team | Open |

## 11. Implementation Issues

*This section will be populated when `/create-issues e2e-playwright-testing` is run.*

| # | Title | Status | Scope |
|---|-------|--------|-------|
| — | — | — | — |

**Progress:** 0/0 issues complete (0%)

## 12. Appendix

### A. Message Protocol Reference

```typescript
// Extension → Webview
interface LoadDocumentMessage {
  type: 'loadDocument';
  content: string;
  fileName: string;
}

interface ConfigUpdateMessage {
  type: 'configUpdate';
  config: EditorConfig;
}

interface ExternalChangeMessage {
  type: 'externalChange';
  content: string;
}

// Webview → Extension
interface ReadyMessage {
  type: 'ready';
}

interface UpdateMessage {
  type: 'update';
  content: string;
}
```

### B. EditorConfig Interface

```typescript
interface EditorConfig {
  theme: 'auto' | 'light' | 'dark';
  fontFamily: string;
  fontSize: number;
  pageLayout: boolean;
  pageWidth: number;
  pageMargin: number;
  imageDir: string;
  preserveFormatting: boolean;
  showBlockHandles: boolean;
}
```

### C. Existing Test Fixture Inventory

| File | Lines | Contents |
|------|-------|----------|
| `simple.md` | ~10 | 3 paragraphs |
| `complex.md` | ~60 | Tables, code blocks, quotes, task lists, images |
| `frontmatter.md` | ~15 | YAML frontmatter + body content |
| `empty.md` | 0 | Empty document |
| `large.md` | 1403 | 50+ sections, stress test |
