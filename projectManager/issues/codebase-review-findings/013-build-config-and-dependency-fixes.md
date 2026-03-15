# [013] Build Config and Dependency Fixes

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [codebase-review-findings](../../design-docs/codebase-review-findings.md)

## Description

Build configuration has several issues: all runtime dependencies are incorrectly listed under `dependencies` instead of `devDependencies` (they're bundled by esbuild), the webview source has no type checking in the build pipeline, `.vscodeignore` is missing entries, `tsconfig.json` generates unnecessary `.d.ts` files, and ESLint version compatibility may be broken.

**Findings:** 6.2, 6.3, 6.4, 6.12, 6.13, 6.14, 6.16, 6.17, 6.19

## Acceptance Criteria

- [ ] All runtime dependencies (React, TipTap, markdown-it, etc.) moved from `dependencies` to `devDependencies`
- [ ] New `"type-check"` script added: `tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.webview.json`
- [ ] `.vscodeignore` updated to include `eslint.config.mjs`, `.prettierrc`, and any other dev-only files
- [ ] `tsconfig.json`: `declaration` and `declarationMap` removed (not a library)
- [ ] ESLint and typescript-eslint version compatibility verified (and pinned if needed)
- [ ] `esbuild.js`: `metafile: true` option available via `build:analyze` script
- [ ] Vitest config indentation inconsistency fixed

## Human Review Focus

- **Look at:** The dependency move — ensure nothing breaks when all deps are under `devDependencies`
- **Test:** Run `npm run build`, `npm run package`, `npm test` — all should pass
- **Decide:** Whether to pin ESLint to v9 or upgrade typescript-eslint to support v10

## Agent Autonomy Notes

- **Agent can decide:** Exact dependency categorization, build script names, metafile output location
- **Escalate to human:** ESLint version decision (pin v9 vs. upgrade plugins)

## Technical Notes

### Suggested Approach
1. Move all entries from `dependencies` to `devDependencies` in `package.json`
2. Add `"type-check": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.webview.json"` to scripts
3. Add `"build:analyze": "ANALYZE=true node esbuild.js"` and conditionally enable `metafile: true` in `esbuild.js`
4. Update `.vscodeignore` to add `eslint.config.mjs`, `.prettierrc`, `projectManager/`, `.claude/`
5. Remove `"declaration": true` and `"declarationMap": true` from `tsconfig.json`
6. Check ESLint compatibility: run `npx eslint --debug` and look for plugin errors
7. Fix vitest config indentation

### Files to Modify
- `package.json` — Dependencies, scripts
- `tsconfig.json` — Remove declaration settings
- `.vscodeignore` — Add missing entries
- `esbuild.js` — Metafile support
- `vitest.config.ts` — Indentation fix
- `eslint.config.mjs` — Potentially pin versions

### Key Considerations
- Moving deps to `devDependencies` is safe because esbuild bundles everything into `dist/`
- `vsce package` may warn about missing `dependencies` but this is expected for bundled extensions
- The type-check script should be run in CI but not necessarily in the default build (it's slower)

## Tests Required

### Manual Testing
- [ ] `npm install` completes without errors after dependency move
- [ ] `npm run build` produces working extension
- [ ] `npm run package` produces valid .vsix without warnings about missing deps
- [ ] `npm test` passes
- [ ] `npm run type-check` (new script) passes or reports real type errors
- [ ] `npm run build:analyze` (new script) produces metafile output

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Manual testing completed (see above)
- [ ] Human review completed (see Human Review Focus above)
- [ ] No regressions in build or packaging
