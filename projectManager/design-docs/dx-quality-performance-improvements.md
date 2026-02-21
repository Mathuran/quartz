# DX, Code Quality & Performance Improvements Design Document

**Author:** Claude
**Status:** DRAFT
**Created:** 2026-02-20
**Last Updated:** 2026-02-20
**Reviewers:** Mathuran

---

## 1. Problem Statement

Quartz is a well-architected Notion-style markdown editor VS Code extension with ~3,000 lines of source code, 4,400+ lines of tests, and solid feature coverage. However, as the project matures, several areas limit developer velocity, code maintainability, and end-user performance. The parser is a 571-line monolith handling all markdown-it token types in deeply nested logic. The webview bundle ships as a single chunk with no code splitting. Documents over 500 lines degrade in performance. The build system lacks type checking, linting, and formatting enforcement. These issues compound over time — each new feature added to the parser increases cognitive load, each test added without structure slows CI feedback, and each unsplit bundle addition increases load time for all users.

## 2. Goals and Non-Goals

### Goals

- **P0: Split the parser into modular token handlers** — Reduce `parser.ts` from 571 lines to <150 lines by extracting token-type handlers into separate files, making each block type independently testable and maintainable
- **P0: Add ESLint + Prettier to CI** — Catch bugs and enforce consistent formatting; target 0 lint errors across the codebase within 1 session
- **P0: Eliminate ****`any`**** types** — Remove all `any` usages (currently in `editor.page.ts` and scattered through extensions) and replace with proper types, reducing runtime type errors to 0
- **P1: Add virtual rendering for large documents** — Support documents up to 2,000 lines without noticeable lag (currently limited to ~500 lines)
- **P1: Add code splitting for the webview bundle** — Reduce initial webview load time by 40% by lazy-loading syntax highlighting and slash command definitions
- **P1: Create a shared test fixtures system** — Reduce test setup duplication by 60% across unit, integration, and E2E tests
- **P2: Add performance benchmarking to CI** — Detect regressions in parse/serialize time for a 1,000-line reference document (fail if >10% slower)
- **P2: Add hot module replacement for webview development** — Reduce dev feedback loop from full-reload (~3s) to HMR patch (~300ms)

### Non-Goals

- Rewriting the extension in a different framework (Svelte, Vue, etc.)
- Migrating from esbuild to Vite or webpack
- Adding collaborative editing or multiplayer features
- Changing the VS Code Custom Editor API architecture
- Supporting non-markdown file formats
- Migrating from TipTap to a different editor framework

## 3. Background and Context

### Current Architecture

Quartz uses a two-process architecture: an **extension host** (Node.js) that manages file I/O and VS Code integration, and a **webview** (browser) that runs the React + TipTap editor. Communication happens via `postMessage`. Markdown is parsed by `markdown-it` into tokens, then transformed into TipTap JSON by the custom parser. Edits are serialized back to markdown by the custom serializer.

### Current Build Pipeline

- `esbuild.js` produces two bundles: `dist/extension.js` (Node) and `dist/webview/index.js` (browser)
- No type checking during build (TypeScript errors only surface in the IDE)
- No linting or formatting enforcement
- `vitest` runs unit tests; `playwright` runs E2E tests
- No performance benchmarking in CI

### Previous Attempts

- A `VirtualRenderingExtension` exists in the extensions directory but its activation status and effectiveness are unclear
- Debouncing (300ms) was added to `Editor.tsx` to reduce update churn
- `suppressUpdateRef` was added to prevent message loops between extension and webview

### Technical Constraints

- VS Code webview sandboxing limits available browser APIs
- `postMessage` is the only communication channel between host and webview
- esbuild has limited code-splitting support for browser targets (requires ESM output)
- TipTap/ProseMirror manage their own DOM — React virtual DOM is only for chrome, not editor content

## 4. Proposed Solution

### Improvement Ranking (High to Low Impact)

---

#### TIER 1 — HIGH IMPACT, HIGH CONFIDENCE

**1. Modularize the Parser (Impact: 9/10)**

The parser (`src/markdown/parser.ts`, 571 lines) is the most complex file in the codebase. It handles headings, paragraphs, lists, code blocks, tables, blockquotes, horizontal rules, images, and inline formatting all in one function with deeply nested switch/if logic.

**Proposed approach:**

- Create `src/markdown/handlers/` directory
- Extract each token type into a handler: `heading.ts`, `list.ts`, `codeBlock.ts`, `table.ts`, `blockquote.ts`, `paragraph.ts`, `inline.ts`
- Define a `TokenHandler` interface: `{ canHandle(token): boolean; handle(token, context): Node[] }`
- Main parser becomes a dispatcher that iterates tokens and delegates to handlers
- Each handler is independently unit-testable

**Why this is #1:** Every future feature (callouts, footnotes, math blocks) requires touching this file. Modularizing it makes the codebase scale linearly instead of exponentially in complexity.

---

**2. Add ESLint + Prettier (Impact: 8/10)**

No linting or formatting is enforced. This means:

- Style inconsistencies accumulate silently
- Common bugs (unused variables, missing returns, accidental globals) go uncaught
- AI-generated code (from Claude Code sessions) doesn't get machine-validated

**Proposed approach:**

- Add `eslint` with `@typescript-eslint/parser` and recommended rules
- Add `prettier` with a `.prettierrc` config
- Add `lint-staged` + `husky` for pre-commit hooks
- Add `npm run lint` and `npm run format` scripts
- Run `eslint --fix` and `prettier --write` in initial setup to baseline
- Add lint step to CI (fail on errors)

---

**3. Strict TypeScript — Eliminate ****`any`**** (Impact: 7/10)**

Several `any` types exist in the codebase, particularly in:

- `editor.page.ts` (E2E test page object)
- TipTap extension options
- Message handler payloads between extension host and webview

**Proposed approach:**

- Audit all `any` usages with `grep`
- Define proper interfaces for message payloads (`UpdateContent`, `ConfigChanged`, etc.)
- Type TipTap extension options using TipTap's generic extension types
- Add `"noImplicitAny": true` to `tsconfig.json` (if not already set)
- Add `tsc --noEmit` to the build/CI pipeline for type checking

---

#### TIER 2 — HIGH IMPACT, MODERATE EFFORT

**4. Virtual Rendering for Large Documents (Impact: 7/10)**

Documents over 500 lines cause noticeable lag. A `VirtualRenderingExtension` exists but its status is unclear.

**Proposed approach:**

- Audit the existing virtual rendering extension to determine if it works
- If not, implement ProseMirror decorations that only render nodes within the viewport + a buffer zone (±500px)
- Use `IntersectionObserver` to track which blocks are visible
- Render placeholder divs with correct heights for off-screen blocks
- Benchmark: parse + render a 2,000-line document in <500ms

**Why not higher:** Affects only users with large files. Most markdown files are <200 lines.

---

**5. Shared Test Fixtures & Helpers (Impact: 6/10)**

Test files duplicate markdown content and setup logic. For example, heading parsing tests repeat similar markdown strings across `parser.test.ts`, `serializer.test.ts`, and `roundtrip.test.ts`.

**Proposed approach:**

- Create `test/fixtures/` directory with `.md` files representing common documents
- Create `test/helpers/` with shared utilities: `parseMarkdown()`, `serializeDoc()`, `roundtrip()`
- Create `test/fixtures/expected/` with expected TipTap JSON outputs
- Refactor existing tests to use shared fixtures
- Measure: reduce total test line count by 20%+ while maintaining coverage

---

**6. Code Splitting for Webview (Impact: 6/10)**

The webview ships as a single bundle. Syntax highlighting (`highlight.js` — large library) and slash command definitions load immediately even if never used in a session.

**Proposed approach:**

- Use esbuild's `splitting: true` with `format: 'esm'` for the webview bundle
- Dynamically import `highlight.js` languages — only load a language when a code block with that language is first encountered
- Lazy-load slash command definitions until the user first types `/`
- Target: reduce initial bundle size by 30-40%

**Risk:** VS Code webview CSP may restrict dynamic imports. Need to verify ESM module loading works in webview context.

---

#### TIER 3 — MODERATE IMPACT, TARGETED

**7. Performance Benchmarking in CI (Impact: 5/10)**

No automated performance regression detection exists.

**Proposed approach:**

- Create `test/benchmarks/` with a 1,000-line reference markdown document
- Use `vitest bench` to measure parse time, serialize time, and roundtrip time
- Store baseline results in `test/benchmarks/baseline.json`
- CI step fails if any metric regresses by >10%
- Track: parse time, serialize time, memory usage

---

**8. HMR for Webview Development (Impact: 5/10)**

Currently, changing webview code requires a full extension reload.

**Proposed approach:**

- Add a development mode that serves the webview from a local dev server instead of from bundled files
- Use esbuild's `serve` mode or add `vite` as a dev-only dependency
- Inject HMR client into the webview in development mode
- Fallback to current behavior in production

**Risk:** VS Code webview security model may complicate this. May need to use `vscode.env.asExternalUri` for local server access.

---

**9. Serializer Modularization (Impact: 5/10)**

The serializer (`src/markdown/serializer.ts`, 296 lines) mirrors the parser's monolithic pattern but is smaller.

**Proposed approach:**

- Extract node-type serializers into `src/markdown/serializers/` directory
- Define `NodeSerializer` interface: `{ nodeType: string; serialize(node, context): string }`
- Main serializer dispatches to type-specific serializers
- Maintain parity with parser handler structure

---

**10. Extension Consolidation (Impact: 4/10)**

9 custom TipTap extensions exist, some with overlapping concerns (e.g., `listInputRule.ts` partially duplicates TipTap's built-in list handling).

**Proposed approach:**

- Audit each extension for overlap with TipTap built-ins
- Merge closely related extensions (e.g., input rules could be one extension)
- Document which extensions are truly custom vs. overrides
- Target: reduce from 9 to 5-6 extensions

---

**11. Error Boundary Improvements (Impact: 3/10)**

The editor has basic error handling but no recovery UX.

**Proposed approach:**

- Add a user-visible error boundary component with "Reload Editor" action
- Add structured error logging to the extension host
- Catch and report parser/serializer errors with the problematic markdown context
- Add telemetry hooks (optional, respecting privacy)

---

**12. Documentation: Architecture Decision Records (Impact: 3/10)**

Decisions like "why TipTap over Slate" or "why esbuild over Vite" are not recorded.

**Proposed approach:**

- Create `docs/adr/` directory
- Document 5-7 key past decisions in ADR format
- Link from CLAUDE.md for AI context

---

## 5. Alternative Solutions Considered

### Alternative A: Full Migration to Vite

**Approach:** Replace esbuild with Vite for both build and dev server, gaining HMR, code splitting, and plugin ecosystem out of the box.

**Pros:** Better DX, proven code splitting, HMR built-in, large plugin ecosystem.
**Cons:** Significant migration effort, esbuild works well for production builds, Vite adds complexity for VS Code extension builds (dual Node + browser targets), risk of breaking existing build.

**Why not chosen:** The current esbuild setup is fast and reliable. The benefits of Vite are achievable incrementally without a full migration. HMR can be added as a dev-only overlay.

### Alternative B: Rewrite Parser with Unified/Remark

**Approach:** Replace `markdown-it` + custom parser with the `unified`/`remark` ecosystem, which provides AST-based markdown processing with a plugin architecture.

**Pros:** Better extensibility, plugin ecosystem for custom syntax, AST manipulation is cleaner than token parsing.
**Cons:** Major rewrite risk (parser is battle-tested with 4,400+ lines of passing tests), different AST format requires new serializer, `unified` is heavier than `markdown-it`, migration could introduce subtle round-trip regressions.

**Why not chosen:** The current parser works well. Modularizing it (Improvement #1) achieves similar extensibility benefits without rewrite risk. The existing test suite validates the current parser's correctness.

### Alternative C: Adopt Monorepo Structure

**Approach:** Split the project into packages (core, parser, webview, extension) using npm workspaces or turborepo.

**Pros:** Better separation of concerns, independent versioning, reusable parser package.
**Cons:** Overhead for a 3,000-line project, complicates build pipeline, adds dependency management complexity.

**Why not chosen:** The project is not large enough to justify monorepo overhead. File-level modularization (handlers directory, serializers directory) achieves the structural benefits without the tooling cost.

## 6. Security, Privacy, and Compliance

- **No new attack surface:** All improvements are internal code quality and performance changes
- **ESLint security rules:** Add `eslint-plugin-security` to catch common vulnerability patterns (eval, regex DOS, prototype pollution)
- **CSP compliance:** Code splitting must respect VS Code's webview Content Security Policy — no inline scripts, no external resource loading
- **No telemetry:** Error boundary improvements will log locally only, not send data externally

## 7. Testing Strategy

### Unit Tests

- Each new parser handler gets its own test file in `test/unit/handlers/`
- Shared fixtures validate consistency across parse/serialize/roundtrip
- Performance benchmarks run as vitest bench tests

### Integration Tests

- Verify modularized parser produces identical output to current parser (snapshot comparison on 50+ markdown inputs)
- Verify code-split bundles load correctly in VS Code webview

### E2E Tests

- Existing Playwright suite continues to run unchanged
- Add large-document performance test (2,000 lines, measure interaction latency)

### Regression Testing

- Before any refactoring: capture current parser output for all test fixtures as snapshots
- After refactoring: compare output — 0 differences allowed

## 8. Rollout Plan

### Phase 1: Foundation (Linting, Types, Parser Modularization)

- **Agent delivers:** ESLint + Prettier config, all `any` types removed, parser split into handlers, all existing tests passing with 0 regressions
- **Human reviews:** Lint rule selection, parser handler API design, test output parity
- **Approved when:** `npm run lint` passes, `tsc --noEmit` passes, all tests green

### Phase 2: Testing Infrastructure

- **Agent delivers:** Shared test fixtures, benchmark suite, CI pipeline updates
- **Human reviews:** Fixture coverage, benchmark thresholds, CI speed
- **Approved when:** CI runs lint + typecheck + test + benchmark in <2 minutes

### Phase 3: Performance

- **Agent delivers:** Virtual rendering implementation, code splitting, bundle size reduction
- **Human reviews:** Large document editing feel, initial load time, bundle analysis
- **Approved when:** 2,000-line document editable without lag, bundle size reduced by 30%+

### Phase 4: DX Polish

- **Agent delivers:** HMR setup, error boundaries, serializer modularization, extension consolidation
- **Human reviews:** Dev workflow smoothness, error recovery UX
- **Approved when:** Human confirms dev loop is faster, error states are graceful

## 9. Human Validation Plan

| Checkpoint                      | Agent Produces                              | Human Validates                            | Blocks  |
| ------------------------------- | ------------------------------------------- | ------------------------------------------ | ------- |
| Lint rules selection            | Proposed ESLint config                      | Rule strictness, any rules to disable      | Phase 1 |
| Parser handler API              | `TokenHandler` interface + 1 sample handler | API ergonomics, naming conventions         | Phase 1 |
| Refactored parser output parity | Diff of parser output before/after          | 0 regressions                              | Phase 1 |
| Benchmark thresholds            | Proposed pass/fail thresholds               | Acceptable regression tolerance            | Phase 2 |
| Large doc editing feel          | 2,000-line doc in editor                    | Subjective smoothness, no visible jank     | Phase 3 |
| Dev server setup                | HMR working in dev mode                     | Actual DX improvement vs. complexity added | Phase 4 |

## 10. Dependencies and Risks

### Dependencies

- esbuild ESM output support for code splitting (verified: supported since esbuild 0.14+)
- VS Code webview CSP compatibility with dynamic imports (needs verification)
- TipTap virtual rendering API stability

### Risks and Mitigations

| Risk                                                       | Impact | Likelihood | Mitigation                                                                   |
| ---------------------------------------------------------- | ------ | ---------- | ---------------------------------------------------------------------------- |
| Parser modularization introduces subtle regressions        | High   | Low        | Snapshot tests on 50+ inputs before/after; roundtrip tests as safety net     |
| Code splitting breaks in VS Code webview CSP               | Medium | Medium     | Verify in dev before committing; fallback to single bundle if CSP blocks ESM |
| Virtual rendering causes visual glitches (content jumping) | Medium | Medium     | Use generous buffer zone (±1000px); test on various viewport sizes           |
| HMR adds complexity without sufficient payoff              | Low    | Low        | Implement as opt-in dev mode; easy to remove if not useful                   |
| ESLint auto-fix changes code semantics                     | Medium | Low        | Review all auto-fix changes before committing; run tests after               |

## 11. Open Questions

1. **What ESLint rule strictness level?** Options: recommended-only, strict, or strict + stylistic. *(Owner: Mathuran)*
2. **Should we add ****`eslint-plugin-react`**** hooks rules?** Catches missing deps in useEffect. Can be noisy. *(Owner: Mathuran)*
3. **Is the existing VirtualRenderingExtension functional?** Need to audit before building new. *(Owner: Agent — investigate first)*
4. **What's the acceptable initial bundle size target?** Current size unknown, need to measure. *(Owner: Agent — measure first)*
5. **Should performance benchmarks block CI or just warn?** Blocking is safer but can cause friction. *(Owner: Mathuran)*

## 12. Implementation Issues

*To be populated after design doc is approved via **`/create-issues dx-quality-performance-improvements`**.*

| #   | Title | Status | Scope |
| --- | ----- | ------ | ----- |
| —   | —     | —      | —     |

**Progress:** 0/X issues complete (0%)

## 13. Appendix

### Impact/Effort Matrix

| #   | Improvement                   | Impact | Effort | Priority |
| --- | ----------------------------- | ------ | ------ | -------- |
| 1   | Modularize Parser             | 9/10   | M      | P0       |
| 2   | ESLint + Prettier             | 8/10   | S      | P0       |
| 3   | Eliminate `any` types         | 7/10   | S      | P0       |
| 4   | Virtual Rendering             | 7/10   | L      | P1       |
| 5   | Shared Test Fixtures          | 6/10   | S      | P1       |
| 6   | Code Splitting                | 6/10   | M      | P1       |
| 7   | Performance Benchmarks        | 5/10   | S      | P2       |
| 8   | HMR for Dev                   | 5/10   | M      | P2       |
| 9   | Serializer Modularization     | 5/10   | S      | P2       |
| 10  | Extension Consolidation       | 4/10   | M      | P2       |
| 11  | Error Boundaries              | 3/10   | S      | P2       |
| 12  | Architecture Decision Records | 3/10   | S      | P2       |

*Effort: S = <1 session, M = 1-2 sessions, L = 2-4 sessions*

### Current Codebase Metrics

- **Source code:** ~3,047 lines (TypeScript/TSX)
- **CSS:** ~647 lines
- **Tests:** ~4,400+ lines
- **Custom extensions:** 9
- **Parser:** 571 lines (largest file)
- **Serializer:** 296 lines
- **Dependencies:** 20+ TipTap packages, markdown-it, React, highlight.js
