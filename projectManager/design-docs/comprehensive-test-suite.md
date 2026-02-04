# Comprehensive Test Suite for Quartz Markdown Editor

**Author:** Mathuran Sadagopan
**Status:** APPROVED
**Created:** 2026-02-03
**Last Updated:** 2026-02-03 (Rev 2 — APPROVED)
**Reviewers:** TBD
**Related Docs:** [notion-markdown-editor](./notion-markdown-editor.md)

---

## 1. Problem Statement

The Quartz markdown editor has 87 unit tests covering the parser, serializer, and utility functions, but zero tests that exercise the extension in a real VS Code environment, zero tests that interact with the webview DOM, and no structured QA protocol for manual validation. This means we have no automated verification that:

- The extension activates and registers its custom editor in VS Code.
- Opening a `.md` file actually renders content in the webview.
- Typing, formatting, slash commands, drag-and-drop, and keyboard shortcuts work as a user would experience them.
- Edits in the webview produce correct file writes back to disk.
- Configuration changes apply in real-time.
- The editor handles edge cases that only surface in the full VS Code environment (CSP restrictions, webview lifecycle, theme integration).

Without these tests, every release requires manual verification of 15+ features across block types, keyboard shortcuts, toolbar actions, and file I/O flows. Regressions in the extension host ↔ webview communication or the ProseMirror plugin layer are invisible until a user reports them.

## 2. Goals and Non-Goals

### Goals

- **P0: Extension host integration tests** — 20+ tests using `@vscode/test-cli` that verify extension activation, custom editor registration, file open/save round-trips, configuration reads, and message passing. Target: all tests pass in CI within 60 seconds.
- **P0: User QA test protocol** — A structured checklist document (markdown) with 50+ manual test cases organized by feature area, each with steps, expected result, and pass/fail column. Covers all webview interactions (typing, formatting, slash commands, drag-and-drop, keyboard shortcuts, table editing) that cannot be verified by automated unit or integration tests. Designed to be executed by a human before each release.
- **P1: Expand unit test coverage** — Add 40+ new unit tests to cover parser/serializer edge cases not yet tested: deeply nested structures (4+ levels), mixed inline marks on same range, malformed markdown, large tables (20+ columns), empty documents with only frontmatter, and idempotent round-trip for all 16 block types individually.
- **P1: CI pipeline configuration** — GitHub Actions workflow that runs unit tests and integration tests on every push.
- **P2: Performance regression tests** — Automated benchmarks with fail thresholds: parse 5K lines in <200ms, serialize 5K lines in <200ms.
- **Deferred: Webview UI tests via Playwright** — Browser automation tests for the TipTap editor. Will be designed and implemented in a future iteration once the manual QA protocol has identified which UI flows are most regression-prone and worth automating.

### Non-Goals

- **Not testing VS Code itself** — We do not verify VS Code's webview sandboxing, CSP enforcement, or extension API correctness. We trust those as platform guarantees.
- **Not visual regression testing** — No screenshot comparison or pixel-level assertions. We test behavior, not visual appearance.
- **Not cross-platform CI** — Initial CI runs on a single OS (macOS or Linux). Cross-platform matrix testing is a future enhancement.
- **Not testing deferred features** — Math (KaTeX), Mermaid, and Embed block types are not yet implemented and will not have tests in this iteration.
- **Not Playwright/browser automation (this iteration)** — Webview UI testing via Playwright is deferred. Manual QA covers the same user-facing interactions for now. Playwright will be revisited once we have data on which UI flows regress most often.

## 3. Background and Context

### Current Test Landscape

The project has 87 Vitest tests across 6 files:

| Layer | Files | Tests | What's covered |
|-------|-------|-------|----------------|
| Parser | `parser.test.ts` | 22 | Markdown → JSONContent for all implemented block types |
| Serializer | `serializer.test.ts` | 18 | JSONContent → Markdown for all node types and marks |
| Round-trip | `roundtrip.test.ts` | 13 | Parse → serialize fidelity for common patterns |
| Features | `features.test.ts` | 20 | Frontmatter, nested blockquotes, tables, images, edge cases |
| Utilities | `debounce.test.ts` | 7 | Debounce delay, flush, cancel |
| Performance | `performance.test.ts` | 7 | Large doc parse/serialize benchmarks |

All tests mock the `vscode` module via a path alias in `vitest.config.ts`. This means the extension host code (`QuartzEditorProvider.ts`, `extension.ts`) is **completely untested** — no test has ever called `activate()`, `resolveCustomTextEditor()`, or `applyEdits()` against the real VS Code API.

The webview code (`Editor.tsx`, `SlashMenu.tsx`, `FormattingToolbar.tsx`, `PageContainer.tsx`, and all ProseMirror extensions) is also **completely untested** as rendered components. The parser/serializer tests verify the data transformation layer but not the editor UI that sits on top of it.

### Testing Tools for VS Code Extensions

| Tool | Purpose | How it works |
|------|---------|-------------|
| `@vscode/test-cli` | Integration tests | Downloads a real VS Code, launches it headless, runs Mocha tests inside the extension host with full `vscode` API access |
| `@vscode/test-electron` | Same, lower-level API | Programmatic control over VS Code download and launch. `@vscode/test-cli` wraps this. |
| Playwright | Browser automation | Launches Chromium and interacts with web pages. We use it to test the webview UI by serving the editor as a standalone HTML page. |
| Vitest + happy-dom | DOM simulation | Can test React components in a simulated DOM without a real browser. Faster but less realistic than Playwright. |

### Architecture Constraints

The VS Code webview is a sandboxed iframe. Extension host integration tests **cannot** inspect webview DOM — they can only verify that messages are sent/received and that file writes produce correct output. To test the actual editor UI (click a toolbar button, type text, open the slash menu), we need to either:

1. Run Playwright against the full VS Code desktop app (complex, flaky), or
2. Extract the webview into a standalone HTML page that Playwright can load directly (simpler, more reliable).

We choose option 2. The webview entry (`src/webview/index.tsx`) already renders a self-contained React app. We create a lightweight test harness HTML file that loads the same bundle with a mock `acquireVsCodeApi()`, allowing Playwright to interact with the full TipTap editor in Chromium without needing VS Code running.

## 4. Proposed Solution

### Overview

We add two new automated test layers alongside the existing unit tests, plus a comprehensive manual QA protocol that covers webview/UI interactions:

```
test/
├── __mocks__/vscode.ts          # Existing VS Code mock
├── parser.test.ts                # Existing unit tests (22)
├── serializer.test.ts            # Existing unit tests (18)
├── roundtrip.test.ts             # Existing unit tests (13)
├── features.test.ts              # Existing unit tests (20)
├── debounce.test.ts              # Existing unit tests (7)
├── performance.test.ts           # Existing unit tests (7)
├── unit/                         # NEW: Additional unit tests
│   ├── parser-edge-cases.test.ts
│   ├── serializer-edge-cases.test.ts
│   └── roundtrip-all-blocks.test.ts
├── integration/                  # NEW: @vscode/test-cli tests
│   ├── activation.test.ts
│   ├── custom-editor.test.ts
│   ├── file-roundtrip.test.ts
│   └── configuration.test.ts
└── qa/
    └── release-checklist.md      # NEW: Manual QA protocol (50+ cases)
```

### Layer 1: Additional Unit Tests (`test/unit/`)

Extend the existing Vitest suite with edge cases not yet covered.

**`parser-edge-cases.test.ts`** (~15 tests):
- Deeply nested lists (4 levels: bullet → ordered → task → bullet)
- Blockquote containing code block containing list
- Table with pipes inside inline code in cells (`| \`a|b\` |`)
- Table with 20+ columns
- Empty document (no content, just whitespace)
- Document with only frontmatter and no body
- Frontmatter with special YAML characters (`:`, `#`, `[]`, `{}`)
- Consecutive horizontal rules (`---\n\n---\n\n---`)
- Adjacent code blocks with different languages
- Link with title attribute: `[text](url "title")`
- Image with empty alt: `![](url)`
- Nested inline marks: `***bold italic***`, `` **`bold code`** ``
- HTML block that is not `<details>` (raw passthrough)
- Paragraph with only inline code and no other text
- Extremely long single line (10K+ characters)

**`serializer-edge-cases.test.ts`** (~15 tests):
- Serialize doc with 0 content nodes (empty doc)
- Serialize table with empty cells
- Serialize table where header has fewer cells than body rows
- Serialize ordered list starting at 0
- Serialize ordered list starting at 999
- Serialize task list with mixed checked/unchecked items
- Serialize paragraph with adjacent marks (bold then italic, no gap)
- Serialize link containing bold text
- Serialize image with special characters in URL (spaces, unicode)
- Serialize details/toggle block
- Serialize deeply nested blockquotes (3 levels)
- Serialize list item containing a blockquote
- Serialize list item containing a code block
- Serialize doc with every node type in sequence
- Serialize hardBreak at end of paragraph (trailing spaces edge case)

**`roundtrip-all-blocks.test.ts`** (~12 tests):
- Individual round-trip test for each of the 13 implemented block types
- Round-trip for a document using every block type together
- Double round-trip idempotency: `serialize(parse(serialize(parse(md)))) === serialize(parse(md))`
- Round-trip with frontmatter + body containing all block types

**Total new unit tests: ~42**

These run with the existing `vitest.config.ts` — no new dependencies.

### Layer 2: Extension Host Integration Tests (`test/integration/`)

Uses `@vscode/test-cli` to run tests inside a real VS Code instance.

**Setup:**
- Add `@vscode/test-cli` and `@vscode/test-electron` as dev dependencies.
- Create `.vscode-test.mjs` configuration file at project root.
- Tests are written using Mocha (required by `@vscode/test-cli`) and `assert`.
- A `test/integration/fixtures/` directory contains sample `.md` files for testing.

**`.vscode-test.mjs`:**
```js
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'dist/test/integration/**/*.test.js',
  mocha: { timeout: 30000 },
  workspaceFolder: './test/integration/fixtures',
});
```

**`activation.test.ts`** (~5 tests):
- Extension activates without error when a `.md` file is present in workspace
- `quartz.markdownEditor` view type is registered after activation
- Extension exports are defined (the `activate` function returns)
- Extension does not activate for non-markdown workspaces (`.txt` only)
- `deactivate()` runs without error

**`custom-editor.test.ts`** (~6 tests):
- Opening a `.md` file with `vscode.commands.executeCommand('vscode.openWith', uri, 'quartz.markdownEditor')` succeeds
- The webview panel is created with `enableScripts: true`
- The webview HTML contains the expected CSP meta tag
- The webview HTML contains a `<div id="root">` element
- The webview HTML loads `dist/webview/index.js` via a nonce script tag
- Closing the editor disposes the webview panel

**`file-roundtrip.test.ts`** (~6 tests):
- Open a simple `.md` file → webview loads → send an `update` message with modified content → save → file on disk contains the modified content
- Open a file with frontmatter → send update with body-only change → save → frontmatter is preserved in file
- Open an empty `.md` file → no errors, editor loads
- Open a large file (1000 lines) → editor loads within 5 seconds
- Edit and undo via `vscode.commands.executeCommand('undo')` → file reverts
- Dirty indicator activates when webview sends an update

**`configuration.test.ts`** (~5 tests):
- Default configuration values match `package.json` defaults
- Changing `quartz.editor.fontSize` triggers a `configUpdate` message to the webview
- Changing `quartz.editor.pageLayout` triggers a `configUpdate` message
- Setting `quartz.editor.theme` to `"dark"` is accepted
- Configuration changes do not require extension reload

**Total integration tests: ~22**

**Test fixtures** (`test/integration/fixtures/`):
- `simple.md` — A few paragraphs and a heading
- `complex.md` — All block types: headings, lists, code blocks, table, task list, blockquote, image, hr
- `frontmatter.md` — YAML frontmatter + body
- `empty.md` — Empty file
- `large.md` — Generated 1000-line document

### Layer 3: Manual QA Protocol (`test/qa/release-checklist.md`)

A structured markdown checklist for human testers. This is the **primary validation layer for all webview/UI interactions** — typing, formatting, slash commands, drag-and-drop, keyboard shortcuts, and table editing are all covered here rather than by browser automation. Organized by feature area with specific steps and expected outcomes. Designed to be copied and filled in per release.

**Feature areas covered (70+ test cases):**

1. **Extension Lifecycle** (5 cases) — Install, activate, open `.md`, set as default, deactivate
2. **Document Loading** (5 cases) — Empty file, simple file, complex file, large file, frontmatter file
3. **Basic Editing** (8 cases) — Type paragraph, new lines, backspace, undo/redo, cut/paste, select-all, text appending in existing paragraph, Enter creates new block
4. **Block Types** (13 cases) — One case per implemented block type: paragraph, heading 1-6, bullet list, ordered list, task list, code block, blockquote, table, horizontal rule, image, toggle/details
5. **Block Input Rules** (8 cases) — Type `# ` → H1, `## ` → H2, `- ` → bullet, `1. ` → ordered, `> ` → blockquote, ``` → code block, `---` Enter → hr, `- [ ] ` → task item
6. **Slash Commands** (7 cases) — Menu appears on `/`, shows all 14 commands, filter by typing, select with Enter, escape closes menu, arrow key navigation, transforms current block
7. **Formatting Toolbar** (7 cases) — Appears on text selection, bold, italic, strikethrough, code, link (URL input), highlight, disappears on deselect
8. **Keyboard Shortcuts** (11 cases) — One case per shortcut: Cmd+B (bold), Cmd+I (italic), Cmd+Shift+S (strike), Cmd+E (code), Cmd+K (link), Cmd+Alt+1/2/3 (headings), Cmd+Shift+8/7/9 (lists), Cmd+Alt+C (code block), Cmd+Shift+. (blockquote), Cmd+Shift+H (highlight)
9. **Drag-and-Drop** (4 cases) — Handle appears on hover, drag block to new position, drop indicator line visible, document order changes after drop
10. **Table Editing** (5 cases) — Navigate cells with Tab, edit cell content, header vs body styling, table serializes with pipe syntax, add content in empty cell
11. **File I/O** (5 cases) — Save (Cmd+S), dirty indicator, external file change detection, revert, large file save
12. **Configuration** (5 cases) — Theme, font family, page layout toggle, page width, block handles toggle
13. **Page Layout** (4 cases) — Letter-sized rendering, narrow viewport fallback (<600px), shadow/margin styling, centered horizontally
14. **Round-Trip Fidelity** (4 cases) — Open and save unchanged file (byte-identical), edit and undo (byte-identical), complex document round-trip, frontmatter preservation
15. **Performance** (3 cases) — Open 1K line file (<1s), type at normal speed (no lag), scroll large doc (no jank)
16. **Debounce Behavior** (2 cases) — Rapid typing doesn't trigger save per keystroke, stopping typing for 300ms triggers update

Each test case follows the format:

```markdown
### TC-03.01: Type a paragraph

**Steps:**
1. Open an empty `.md` file in Quartz editor
2. Click in the editor area
3. Type "Hello, world!"

**Expected:** Text appears in the editor. The file dirty indicator shows (dot on tab).

**Pass/Fail:** ___
**Notes:** ___
```

## 5. Alternative Solutions Considered

### Alternative A: Playwright Against Full VS Code Desktop

**Approach:** Use Playwright to launch VS Code as a desktop application (via `code --extensionDevelopmentPath`) and automate the entire window — clicking menus, opening files, and interacting with the webview through VS Code's own UI.

**Pros:**
- Tests the real, complete user experience end-to-end.
- Catches VS Code-specific issues (CSP, webview lifecycle, theme integration).
- No test harness needed — test against the actual product.

**Cons:**
- VS Code's Electron window is complex to automate — webview content is in a nested iframe that Playwright cannot access directly without `page.frame()` targeting by URL, which changes across sessions.
- Tests are slow (5-10s per test for VS Code launch + extension activation + webview render).
- Flaky — VS Code shows welcome tabs, notifications, and prompts that interfere with automation.
- Requires a display server in CI (Xvfb on Linux), adding infrastructure complexity.
- Not officially supported by Microsoft — no stable selectors or test IDs in VS Code's UI.

**Why rejected:** The effort-to-value ratio is poor. The standalone webview harness approach tests 90% of the same UI interactions at 10% of the complexity and flakiness. Extension host integration tests cover the remaining VS Code-specific behaviors.

### Alternative B: Vitest + happy-dom Instead of Playwright

**Approach:** Use Vitest with `happy-dom` or `jsdom` environment to test React/TipTap components without a real browser. Import `Editor.tsx`, render it with `@testing-library/react`, and assert on the DOM.

**Pros:**
- Fast — no browser launch overhead.
- Runs alongside existing Vitest unit tests.
- Simple setup — just change the `environment` in vitest config.

**Cons:**
- `happy-dom`/`jsdom` do not implement `contenteditable`, `Selection`, `Range`, `getComputedStyle`, or `MutationObserver` accurately. ProseMirror relies heavily on these APIs.
- TipTap's `useEditor` hook fails in simulated DOMs because ProseMirror's view layer needs real browser layout primitives.
- Cannot test drag-and-drop, keyboard events that rely on `KeyboardEvent.key` processing, or CSS-dependent behaviors (page layout responsiveness).
- Would require extensive mocking of browser APIs, producing tests that verify mocks more than real behavior.

**Why rejected:** ProseMirror/TipTap fundamentally requires a real browser engine. Simulated DOMs break in too many ways to be useful for testing editor interactions. Playwright gives us a real Chromium instance with minimal setup.

### Alternative C: Skip Integration Tests, Rely Only on Expanded Unit Tests + Manual QA

**Approach:** Instead of adding `@vscode/test-cli` and Playwright, expand the unit test suite aggressively and maintain a rigorous manual QA checklist.

**Pros:**
- No new test infrastructure or dependencies.
- Unit tests are fast and reliable.
- Manual QA catches real-world issues.

**Cons:**
- The extension host code (`QuartzEditorProvider.ts`) remains permanently untested against the real VS Code API. Bugs in message handling, CSP, or webview lifecycle are invisible.
- Manual QA doesn't scale — every PR requires a human to run 50+ test cases.
- No CI safety net for webview regressions.

**Why rejected:** Unit tests with mocks cannot catch integration issues by definition. The extension host and webview UI are where the most impactful bugs live (data loss, editor not loading, shortcuts not working). Automated coverage of these layers is worth the infrastructure investment.

## 6. Security, Privacy, and Compliance

### Test Data

- All test fixture files contain only synthetic content — no real user data, PII, or sensitive information.
- The Playwright test harness runs on `file://` URLs — no network requests, no external servers.

### CI Security

- The `@vscode/test-cli` runner downloads VS Code from Microsoft's official servers (hash-verified).
- Playwright downloads Chromium from Google's CDN (hash-verified by the Playwright package).
- No secrets, tokens, or credentials are needed for any test layer.
- Tests run in an isolated workspace directory that is cleaned up after each run.

### Webview Test Harness Scope

- The test harness (`test/webview/harness/index.html`) is excluded from the `.vsix` package via `.vscodeignore`.
- The mock `acquireVsCodeApi` has no access to the real VS Code API or file system.
- Test harness files are never shipped to users.

## 7. Testing Strategy

This **is** the testing strategy document. Meta-testing considerations:

- **Testing the test infrastructure:** The CI pipeline itself is validated by running a known-failing test and verifying it produces a red build.
- **Test maintenance:** Tests that break due to TipTap version upgrades are isolated in the Playwright layer. Parser/serializer tests are stable because they test data transformations with no UI dependencies.
- **Coverage targets:** Unit tests aim for >90% line coverage on `src/markdown/`. Integration tests aim for >80% branch coverage on `src/QuartzEditorProvider.ts`. Manual QA covers all 13 implemented block types, all 11 keyboard shortcuts, and all webview UI interactions.

## 8. Rollout Plan

### Phase 1: Unit Test Expansion

- Add `test/unit/` directory with 42 new edge-case tests.
- Run with existing `npm test` command — no new dependencies.
- Target: 129 total unit tests (87 existing + 42 new).

### Phase 2: Extension Host Integration Tests

- Add `@vscode/test-cli` and `@vscode/test-electron` as dev dependencies.
- Create `.vscode-test.mjs` config and `test/integration/` directory.
- Add `npm run test:integration` script.
- Create fixture `.md` files.
- Target: 22 integration tests, all passing.

### Phase 3: Manual QA Protocol

- Create `test/qa/release-checklist.md` with 70+ test cases across 16 feature areas.
- Execute the full checklist against the current build to validate it.
- Document any bugs found during QA.
- This is the primary validation for all webview/UI interactions.

### Phase 4: CI Pipeline

- Create `.github/workflows/test.yml` running unit tests and integration tests.
- Build → Unit tests → Integration tests.
- Target: Green CI on every push to main.

### Future: Playwright Webview Tests (deferred)

- After running manual QA across several releases, identify the UI flows that regress most often.
- Automate those specific flows with Playwright using a standalone test harness.
- See the Alternatives section for the technical approach (standalone HTML harness with mock `acquireVsCodeApi`).

## 9. Dependencies and Risks

### Dependencies

| Dependency | Type | Purpose |
|-----------|------|---------|
| `@vscode/test-cli` ^0.0.10 | Dev dependency | CLI runner for VS Code integration tests |
| `@vscode/test-electron` ^2.4.0 | Dev dependency | Downloads and launches VS Code for testing |
| VS Code Stable (via test-cli) | Binary | VS Code instance for integration tests |

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| `@vscode/test-cli` breaks with VS Code updates | Medium | Low | Pin to a specific VS Code version in config. Update quarterly. |
| Manual QA is skipped or incomplete before releases | High | Medium | Checklist is versioned in `test/qa/`. Make QA sign-off a required step in the release process. Track which sections were tested per release. |
| Manual QA misses regressions that automated UI tests would catch | Medium | Medium | Prioritize QA cases for high-risk flows (file I/O, round-trip, slash commands). If a regression recurs, flag that flow as a candidate for future Playwright automation. |
| CI time exceeds 5 minutes per run | Low | Medium | Run unit tests first (fast fail). Use `@vscode/test-cli` VS Code caching to avoid re-downloading. |
| Integration tests are flaky due to VS Code startup timing | Medium | Medium | Set generous Mocha timeout (30s). Use `vscode.commands.executeCommand` with retries for operations that depend on extension activation. |

## 10. Open Questions

All open questions have been resolved:

| # | Question | Resolution |
|---|----------|------------|
| 1 | Should integration tests use a clean VS Code profile? | **Yes.** Clean profile via `--user-data-dir`. Avoids interference from user extensions. `@vscode/test-cli` handles this by default. |
| 2 | Should the manual QA checklist live in `test/qa/` or a GitHub Wiki? | **`test/qa/`.** Keeps the checklist versioned with the code. |
| 3 | ~~Should we add `data-testid` attributes for Playwright selectors?~~ | **Resolved:** Playwright is deferred. No production code changes needed for now. |
| 4 | ~~Should Playwright tests run against the built bundle or a dev server?~~ | **Resolved:** Playwright is deferred. Will decide when we revisit. |

## 11. Implementation Issues

| # | Title | Status | Scope |
|---|-------|--------|-------|
| [001](../issues/comprehensive-test-suite/001-parser-edge-case-unit-tests.md) | Parser Edge Case Unit Tests | TODO | M |
| [002](../issues/comprehensive-test-suite/002-serializer-edge-case-unit-tests.md) | Serializer Edge Case Unit Tests | TODO | M |
| [003](../issues/comprehensive-test-suite/003-roundtrip-all-blocks-unit-tests.md) | Round-Trip All Blocks Unit Tests | TODO | S |
| [004](../issues/comprehensive-test-suite/004-integration-test-infrastructure.md) | Integration Test Infrastructure | TODO | M |
| [005](../issues/comprehensive-test-suite/005-integration-tests-activation-and-editor.md) | Integration Tests: Activation and Custom Editor | TODO | M |
| [006](../issues/comprehensive-test-suite/006-integration-tests-file-roundtrip-and-config.md) | Integration Tests: File Round-Trip and Configuration | TODO | M |
| [007](../issues/comprehensive-test-suite/007-manual-qa-release-checklist.md) | Manual QA Release Checklist | TODO | M |
| [008](../issues/comprehensive-test-suite/008-ci-pipeline.md) | CI Pipeline Configuration | TODO | S |

**Progress:** 0/8 issues complete (0%)

## 12. Appendix

### A. Test Count Summary

| Layer | New tests | Existing | Total |
|-------|-----------|----------|-------|
| Unit (Vitest) | 42 | 87 | 129 |
| Integration (@vscode/test-cli) | 22 | 0 | 22 |
| Manual QA | 70+ | 0 | 70+ |
| **Total automated** | **64** | **87** | **151** |
| **Total (automated + manual)** | **134+** | **87** | **221+** |

### B. npm Scripts (proposed)

```jsonc
{
  "scripts": {
    "test": "vitest run",                          // Unit tests only (fast)
    "test:watch": "vitest",                        // Unit tests in watch mode
    "test:integration": "vscode-test",             // Extension host integration tests
    "test:all": "npm test && npm run test:integration"
  }
}
```

### C. Feature-to-Test Coverage Matrix

| Feature (from editor design doc) | Unit | Integration | Manual QA |
|----------------------------------|------|-------------|-----------|
| Extension activation | — | 5 tests | 2 cases |
| Custom editor registration | — | 6 tests | 2 cases |
| Markdown parser (all block types) | 37+ tests | — | — |
| Markdown serializer (all node types) | 33+ tests | — | — |
| Round-trip fidelity | 25+ tests | 6 tests | 4 cases |
| Paragraph editing | 3 tests | — | 8 cases |
| Headings (H1-H6) | 4 tests | — | 1 case |
| Bullet lists | 3 tests | — | 1 case |
| Ordered lists | 3 tests | — | 1 case |
| Task lists | 3 tests | — | 1 case |
| Code blocks | 4 tests | — | 1 case |
| Blockquotes | 4 tests | — | 1 case |
| Tables | 4 tests | — | 5 cases |
| Horizontal rules | 2 tests | — | 1 case |
| Images | 2 tests | — | 1 case |
| Frontmatter | 5 tests | 1 test | 1 case |
| Block input rules (`# `, `- `, etc.) | — | — | 8 cases |
| Slash command menu | — | — | 7 cases |
| Formatting toolbar | — | — | 7 cases |
| Keyboard shortcuts | — | — | 11 cases |
| Drag-and-drop | — | — | 4 cases |
| Page layout | — | — | 4 cases |
| Configuration | — | 5 tests | 5 cases |
| Performance (large docs) | 7 tests | 1 test | 3 cases |
| Debounce | 7 tests | — | 2 cases |
