# Performance Improvements Design Document

**Author:** Claude
**Status:** COMPLETED
**Created:** 2026-02-20
**Last Updated:** 2026-02-21
**Reviewers:** Mathuran
**Split from:** [DX, Quality & Performance Improvements](./dx-quality-performance-improvements.md)

---

## 1. Problem Statement

Documents over 500 lines cause noticeable lag in the Quartz editor. The webview ships as a single bundle with no code splitting — syntax highlighting (`highlight.js`) and slash command definitions load immediately even when unused. There is no automated performance regression detection, so degradations go unnoticed until users report them.

## 2. Goals and Non-Goals

### Goals

- **P1: Virtual rendering for large documents** — Support documents up to 2,000 lines without noticeable lag (currently limited to ~500 lines); parse + render in <500ms
- **P1: Code splitting for the webview bundle** — Reduce initial webview load time by 40% via lazy-loading syntax highlighting and slash commands
- **P2: Performance benchmarking in CI** — Detect regressions in parse/serialize time; **block CI** if any metric regresses by >10%

### Non-Goals

- Migrating from esbuild to Vite or webpack
- Supporting non-markdown file formats
- Collaborative editing or multiplayer features
- Rewriting the editor framework

## 3. Background and Context

### Current State

- **Bundle:** Single chunk, no code splitting. `highlight.js` (large) loads immediately
- **Large files:** ~500 line limit before noticeable lag
- **Virtual rendering:** A `VirtualRenderingExtension` exists in `src/webview/extensions/` but its activation status and effectiveness are unclear
- **Benchmarking:** No automated performance regression detection
- **Debouncing:** 300ms debounce on updates to VS Code (already implemented)
- **Update suppression:** `suppressUpdateRef` prevents message loops (already implemented)

### Technical Constraints

- VS Code webview sandboxing limits available browser APIs
- `postMessage` is the only communication channel between host and webview
- esbuild has limited code-splitting support for browser targets (requires ESM output)
- TipTap/ProseMirror manage their own DOM — React virtual DOM is only for chrome, not editor content
- VS Code webview CSP may restrict dynamic imports

## 4. Proposed Solution

### 1. Virtual Rendering for Large Documents (Impact: 7/10, Effort: L)

- Audit the existing `VirtualRenderingExtension` to determine if it works
- If not, implement ProseMirror decorations that only render nodes within the viewport + a buffer zone (±500px)
- Use `IntersectionObserver` to track which blocks are visible
- Render placeholder divs with correct heights for off-screen blocks
- **Benchmark target:** parse + render a 2,000-line document in <500ms

### 2. Code Splitting for Webview (Impact: 6/10, Effort: M)

- Use esbuild's `splitting: true` with `format: 'esm'` for the webview bundle
- Dynamically import `highlight.js` languages — only load when a code block with that language is first encountered
- Lazy-load slash command definitions until the user first types `/`
- **Target:** Reduce initial bundle size by 30-40%

**Risk:** VS Code webview CSP may restrict dynamic imports. Need to verify ESM module loading works in webview context. Fallback: single bundle if CSP blocks ESM.

### 3. Performance Benchmarking in CI (Impact: 5/10, Effort: S)

- Create `test/benchmarks/` with a 1,000-line reference markdown document
- Use `vitest bench` to measure parse time, serialize time, and roundtrip time
- Store baseline results in `test/benchmarks/baseline.json`
- **CI step blocks the build** if any metric regresses by >10%
- Track: parse time, serialize time, memory usage

## 5. Alternative Solutions Considered

### Alternative A: Full Migration to Vite

**Approach:** Replace esbuild with Vite, gaining HMR, code splitting, and plugin ecosystem.

**Pros:** Better DX, proven code splitting, HMR built-in.
**Cons:** Significant migration effort, esbuild works well for production, Vite adds complexity for dual Node + browser targets.

**Why not chosen:** Benefits are achievable incrementally without full migration.

### Alternative B: React Virtualization (react-window / react-virtuoso)

**Approach:** Use React virtualization libraries for the editor content.

**Why not chosen:** TipTap/ProseMirror manages its own DOM — React only handles chrome (toolbar, menus). Virtualization must happen at the ProseMirror level.

## 6. Security, Privacy, and Compliance

- **CSP compliance:** Code splitting must respect VS Code's webview Content Security Policy — no inline scripts, no external resource loading
- **No telemetry:** Performance benchmarks run locally and in CI only
- **No new attack surface:** All changes are internal performance improvements

## 7. Testing Strategy

### Unit Tests
- Performance benchmarks run as `vitest bench` tests
- Benchmark baseline stored and tracked

### Integration Tests
- Verify code-split bundles load correctly in VS Code webview
- Verify dynamic imports work within webview CSP

### E2E Tests
- Add large-document performance test (2,000 lines, measure interaction latency)
- Existing Playwright suite continues unchanged

## 8. Rollout Plan

### Phase 1: Benchmarking (~1 session)
- Create benchmark suite and reference document
- Measure current baseline
- Add CI step (blocks on >10% regression)
- **Gate:** Baseline established, CI step running

### Phase 2: Virtual Rendering (~2-3 sessions)
- Audit existing VirtualRenderingExtension
- Implement or fix virtual rendering
- Benchmark against baseline
- **Gate:** 2,000-line document editable without lag

### Phase 3: Code Splitting (~1-2 sessions)
- Verify ESM/dynamic imports work in webview CSP
- Implement code splitting
- Measure bundle size reduction
- **Gate:** Initial bundle reduced by 30%+, all features still work

## 9. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Code splitting breaks in VS Code webview CSP | Medium | Medium | Verify in dev before committing; fallback to single bundle |
| Virtual rendering causes visual glitches (content jumping) | Medium | Medium | Generous buffer zone (±1000px); test on various viewport sizes |
| Benchmark flakiness causes false CI failures | Low | Medium | Use median of 5 runs; set threshold at 10% not 5% |

## 10. Open Questions

*All resolved during review.*

## 11. Implementation Issues

*To be populated via `/create-issues performance-improvements`.*

| # | Title | Status | Scope |
|---|-------|--------|-------|
| — | —     | —      | —     |

**Progress:** 0/X issues complete (0%)
