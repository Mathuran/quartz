# Code Quality Improvements Design Document

**Author:** Claude
**Status:** COMPLETED
**Created:** 2026-02-20
**Last Updated:** 2026-02-21
**Reviewers:** Mathuran
**Split from:** [DX, Quality & Performance Improvements](./dx-quality-performance-improvements.md)

---

## 1. Problem Statement

Quartz's parser (`src/markdown/parser.ts`, 571 lines) is the most complex file in the codebase, handling all markdown-it token types in deeply nested switch/if logic. Every new feature (callouts, footnotes, math blocks) requires touching this file, causing complexity to scale exponentially. The serializer (296 lines) mirrors this pattern. Additionally, no linting or formatting is enforced, and several `any` types exist across the codebase, allowing style inconsistencies and type errors to accumulate silently.

## 2. Goals and Non-Goals

### Goals

- **P0: Split the parser into modular token handlers** — Reduce `parser.ts` from 571 lines to <150 lines by extracting token-type handlers into separate files, making each block type independently testable and maintainable
- **P0: Add ESLint + Prettier to CI** — Using **recommended rules only** (minimal friction, catches real bugs without style nagging); enforce consistent formatting; target 0 lint errors
- **P0: Eliminate `any` types** — Remove all `any` usages and replace with proper types; add `"noImplicitAny": true` to `tsconfig.json`; add `tsc --noEmit` to CI
- **P2: Modularize the serializer** — Extract node-type serializers into `src/markdown/serializers/` directory, maintaining parity with parser handler structure

### Non-Goals

- Rewriting the extension in a different framework
- Migrating from esbuild to Vite or webpack
- Migrating from markdown-it to unified/remark
- Adding strict or stylistic ESLint rules beyond recommended
- Adding `eslint-plugin-react` hooks rules (can be noisy, revisit later)

## 3. Background and Context

### Current State

- **Parser:** 571-line monolith with deeply nested switch/if logic handling headings, paragraphs, lists, code blocks, tables, blockquotes, horizontal rules, images, and inline formatting
- **Serializer:** 296-line monolith mirroring the parser's structure
- **Linting:** None enforced — no ESLint, no Prettier, no pre-commit hooks
- **Type safety:** Several `any` usages in `editor.page.ts`, TipTap extension options, and message handler payloads
- **Build pipeline:** No type checking during build (TypeScript errors only surface in IDE)

### Why This Matters Now

Every future feature (callouts, wiki-links, frontmatter editor) requires touching the parser. Modularizing it now means each new block type is a self-contained handler file rather than more lines added to a growing monolith. Linting and type safety catch bugs before they reach tests or users.

## 4. Proposed Solution

### 1. Modularize the Parser (Impact: 9/10, Effort: M)

- Create `src/markdown/handlers/` directory
- Extract each token type into a handler: `heading.ts`, `list.ts`, `codeBlock.ts`, `table.ts`, `blockquote.ts`, `paragraph.ts`, `inline.ts`
- Define a `TokenHandler` interface: `{ canHandle(token): boolean; handle(token, context): Node[] }`
- Main parser becomes a dispatcher that iterates tokens and delegates to handlers
- Each handler is independently unit-testable

**Validation:** Snapshot parser output for all existing test inputs before refactoring. After refactoring, 0 differences allowed.

### 2. Add ESLint + Prettier (Impact: 8/10, Effort: S)

- Add `eslint` with `@typescript-eslint/parser` and **recommended rules only**
- Add `prettier` with a `.prettierrc` config
- Add `lint-staged` + `husky` for pre-commit hooks
- Add `npm run lint` and `npm run format` scripts
- Run `eslint --fix` and `prettier --write` to baseline
- Add `eslint-plugin-security` for common vulnerability patterns
- Add lint step to CI (fail on errors)

### 3. Strict TypeScript (Impact: 7/10, Effort: S)

- Audit all `any` usages
- Define proper interfaces for message payloads (`UpdateContent`, `ConfigChanged`, etc.)
- Type TipTap extension options using TipTap's generic extension types
- Add `"noImplicitAny": true` to `tsconfig.json`
- Add `tsc --noEmit` to CI

### 4. Serializer Modularization (Impact: 5/10, Effort: S)

- Extract node-type serializers into `src/markdown/serializers/`
- Define `NodeSerializer` interface: `{ nodeType: string; serialize(node, context): string }`
- Main serializer dispatches to type-specific serializers
- Maintain parity with parser handler structure

## 5. Alternative Solutions Considered

### Alternative A: Rewrite Parser with Unified/Remark

Replace `markdown-it` + custom parser with the `unified`/`remark` ecosystem.

**Pros:** Better extensibility, plugin ecosystem, AST manipulation is cleaner.
**Cons:** Major rewrite risk (4,400+ lines of passing tests validate current parser), different AST format requires new serializer, heavier than markdown-it.

**Why not chosen:** Modularizing the existing parser achieves similar extensibility without rewrite risk. The test suite validates current correctness.

### Alternative B: Strict + Stylistic ESLint Rules

**Why not chosen:** Recommended-only is sufficient to catch real bugs. Strict/stylistic rules add friction and require many overrides. Can always tighten later.

## 6. Security, Privacy, and Compliance

- **ESLint security rules:** `eslint-plugin-security` catches eval, regex DOS, prototype pollution
- **No new attack surface:** All changes are internal code quality improvements
- **Type safety:** Eliminating `any` reduces risk of runtime type confusion bugs

## 7. Testing Strategy

### Unit Tests
- Each new parser handler gets its own test file in `test/unit/handlers/`
- Existing tests continue to pass unchanged

### Regression Testing
- Before refactoring: snapshot current parser output for all test fixtures
- After refactoring: compare output — 0 differences allowed
- Round-trip fidelity tests as safety net

### Integration Tests
- Verify modularized parser produces identical output to current parser

## 8. Rollout Plan

### Phase 1: Linting & Types (~1 session)
- Add ESLint (recommended) + Prettier
- Run auto-fix to baseline
- Remove all `any` types
- Add `tsc --noEmit` to CI
- **Gate:** `npm run lint` passes, `tsc --noEmit` passes, all tests green

### Phase 2: Parser Modularization (~1-2 sessions)
- Snapshot current parser output
- Extract handlers one at a time
- Validate 0 regressions after each extraction
- **Gate:** Parser <150 lines, all tests green, snapshot parity

### Phase 3: Serializer Modularization (~1 session)
- Extract serializers mirroring handler structure
- **Gate:** All tests green, round-trip fidelity maintained

## 9. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Parser modularization introduces subtle regressions | High | Low | Snapshot tests on 50+ inputs before/after; roundtrip tests as safety net |
| ESLint auto-fix changes code semantics | Medium | Low | Review all auto-fix changes; run tests after |
| `noImplicitAny` surfaces many hidden issues | Low | Medium | Fix incrementally; use `// @ts-expect-error` sparingly for truly intractable cases |

## 10. Open Questions

*All resolved during review.*

## 11. Implementation Issues

*To be populated via `/create-issues code-quality-improvements`.*

| # | Title | Status | Scope |
|---|-------|--------|-------|
| — | —     | —      | —     |

**Progress:** 0/X issues complete (0%)
