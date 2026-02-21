# Developer Experience Improvements Design Document

**Author:** Claude
**Status:** COMPLETED
**Created:** 2026-02-20
**Last Updated:** 2026-02-21
**Reviewers:** Mathuran
**Split from:** [DX, Quality & Performance Improvements](./dx-quality-performance-improvements.md)

---

## 1. Problem Statement

Developer velocity on Quartz is slowed by several DX gaps: test files duplicate markdown content and setup logic across unit, integration, and E2E suites; changing webview code requires a full extension reload (~3s); 9 custom TipTap extensions have overlapping concerns; the editor has basic error handling but no recovery UX; and key architectural decisions are not recorded. These issues compound as the project grows — each new contributor must rediscover decisions, each test addition increases duplication, and each webview change has a slow feedback loop.

## 2. Goals and Non-Goals

### Goals

- **P1: Shared test fixtures system** — Reduce test setup duplication by 60% across unit, integration, and E2E tests
- **P2: Hot module replacement for webview development** — Reduce dev feedback loop from full-reload (~3s) to HMR patch (~300ms)
- **P2: Extension consolidation** — Audit and merge overlapping TipTap extensions, reducing from 9 to 5-6
- **P2: Error boundary improvements** — Add user-visible error boundary with "Reload Editor" action and structured error logging
- **P2: Architecture Decision Records** — Document 5-7 key past decisions (why TipTap, why esbuild, why markdown-it, etc.)

### Non-Goals

- Rewriting the extension in a different framework
- Migrating from esbuild to Vite (HMR will be a dev-only overlay)
- Adding telemetry or external error reporting
- Changing the VS Code Custom Editor API architecture

## 3. Background and Context

### Current State

- **Test duplication:** Heading parsing tests repeat similar markdown strings across `parser.test.ts`, `serializer.test.ts`, and `roundtrip.test.ts`
- **Dev loop:** Changing webview code requires full extension reload (~3s). No HMR
- **Extensions:** 9 custom TipTap extensions, some with overlapping concerns (e.g., `listInputRule.ts` partially duplicates TipTap's built-in list handling)
- **Error handling:** Basic error handling but no user-visible recovery UX
- **Documentation:** No record of why TipTap over Slate, esbuild over Vite, markdown-it over unified, etc.

### Technical Constraints

- VS Code webview security model may complicate HMR (may need `vscode.env.asExternalUri`)
- TipTap extension consolidation must not break existing behavior
- Error boundaries must work within the webview sandboxed environment

## 4. Proposed Solution

### 1. Shared Test Fixtures & Helpers (Impact: 6/10, Effort: S)

- Create `test/fixtures/` directory with `.md` files representing common documents
- Create `test/helpers/` with shared utilities: `parseMarkdown()`, `serializeDoc()`, `roundtrip()`
- Create `test/fixtures/expected/` with expected TipTap JSON outputs
- Refactor existing tests to use shared fixtures
- **Target:** Reduce total test line count by 20%+ while maintaining coverage

### 2. HMR for Webview Development (Impact: 5/10, Effort: M)

- Add a development mode that serves the webview from a local dev server instead of bundled files
- Use esbuild's `serve` mode or add `vite` as a dev-only dependency
- Inject HMR client into the webview in development mode
- Fallback to current behavior in production

**Risk:** VS Code webview security model may complicate this. May need `vscode.env.asExternalUri` for local server access.

### 3. Extension Consolidation (Impact: 4/10, Effort: M)

- Audit each extension for overlap with TipTap built-ins
- Merge closely related extensions (e.g., input rules could be one extension)
- Document which extensions are truly custom vs. overrides
- **Target:** Reduce from 9 to 5-6 extensions

### 4. Error Boundary Improvements (Impact: 3/10, Effort: S)

- Add a user-visible error boundary component with "Reload Editor" action
- Add structured error logging to the extension host
- Catch and report parser/serializer errors with the problematic markdown context
- No external telemetry — local logging only

### 5. Architecture Decision Records (Impact: 3/10, Effort: S)

- Create `docs/adr/` directory
- Document 5-7 key past decisions in ADR format
- Link from CLAUDE.md for AI context

## 5. Alternative Solutions Considered

### Alternative A: Full Vite Migration for HMR

**Pros:** HMR built-in, better plugin ecosystem.
**Cons:** Significant migration, esbuild works well for production, dual Node + browser targets add complexity.

**Why not chosen:** HMR as a dev-only overlay achieves the goal without migration risk.

### Alternative B: Monorepo for Test Sharing

**Pros:** Better separation, shared test packages.
**Cons:** Overhead for a ~3,000-line project.

**Why not chosen:** File-level fixture sharing is simpler and sufficient.

## 6. Security, Privacy, and Compliance

- **No telemetry:** Error boundaries log locally only, no data sent externally
- **HMR dev server:** Only active in development mode, never in production builds
- **No new attack surface:** All changes are internal DX improvements

## 7. Testing Strategy

### Test Fixtures
- Shared fixtures validate consistency across parse/serialize/roundtrip
- Existing tests refactored to use shared helpers — 0 regressions allowed

### Extension Consolidation
- Before/after comparison of editor behavior for all supported block types
- E2E suite must pass unchanged after consolidation

### Error Boundaries
- Manual testing of error scenarios (malformed markdown, extension crashes)
- Verify "Reload Editor" action recovers cleanly

## 8. Rollout Plan

### Phase 1: Test Fixtures (~1 session)
- Create shared fixtures and helpers
- Refactor existing tests
- **Gate:** All tests green, measurable reduction in test duplication

### Phase 2: Extension Consolidation (~1-2 sessions)
- Audit and merge extensions
- **Gate:** All tests green, extension count reduced

### Phase 3: Error Boundaries (~1 session)
- Add error boundary component and structured logging
- **Gate:** Manual verification of error recovery

### Phase 4: HMR + ADRs (~1-2 sessions)
- Set up dev server with HMR
- Document architectural decisions
- **Gate:** Dev loop noticeably faster, ADRs linked from CLAUDE.md

## 9. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| HMR adds complexity without sufficient payoff | Low | Low | Implement as opt-in dev mode; easy to remove |
| Extension consolidation breaks subtle behavior | Medium | Medium | Run full E2E suite before/after; merge one at a time |
| Test refactoring introduces false test passes | Medium | Low | Verify test count and coverage metrics don't decrease |

## 10. Open Questions

*All resolved during review.*

## 11. Implementation Issues

*To be populated via `/create-issues developer-experience-improvements`.*

| # | Title | Status | Scope |
|---|-------|--------|-------|
| — | —     | —      | —     |

**Progress:** 0/X issues complete (0%)
