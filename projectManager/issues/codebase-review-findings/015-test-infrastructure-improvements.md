# [015] Test Infrastructure Improvements

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [codebase-review-findings](../../design-docs/codebase-review-findings.md)

## Description

The test infrastructure has gaps: the VS Code mock is minimal and missing many APIs, code coverage excludes the entire webview, and Playwright test parallelism configuration could cause flakiness.

**Findings:** 6.7, 6.8, 6.15

## Acceptance Criteria

- [x] VS Code mock expanded with: `Position` class, `commands` namespace, `EventEmitter`, `Disposable`, `ViewColumn` enum
- [x] `Uri.joinPath` mock uses proper path joining (not simple string concatenation)
- [x] `workspace.getConfiguration` mock supports per-test configuration overrides (factory pattern)
- [x] `WorkspaceEdit.replace()` mock captures calls for assertion
- [x] Coverage configuration documented: webview exclusion rationale in a comment, with pointer to E2E tests
- [x] Playwright `fullyParallel` documented: add comment explaining that cross-project ordering is via `dependencies`

## Human Review Focus

- **Look at:** The expanded VS Code mock — ensure it matches the real API behavior closely enough for meaningful tests
- **Test:** Run `npm test` — all existing tests pass with the expanded mock
- **Decide:** Whether to invest in webview unit test coverage (JSDOM setup) or rely on E2E tests

## Agent Autonomy Notes

- **Agent can decide:** Mock implementation details, factory pattern design
- **Escalate to human:** Whether to set up JSDOM for webview unit testing (significant infrastructure investment)

## Technical Notes

### Suggested Approach
1. Expand `test/__mocks__/vscode.ts`:
   ```typescript
   export class Position {
     constructor(public line: number, public character: number) {}
   }
   export class Disposable {
     constructor(private callOnDispose: () => void) {}
     dispose() { this.callOnDispose(); }
   }
   export class EventEmitter {
     private listeners: Function[] = [];
     event = (listener: Function) => { this.listeners.push(listener); return new Disposable(() => {}); };
     fire(data: any) { this.listeners.forEach(l => l(data)); }
   }
   export enum ViewColumn { One = 1, Two = 2, Three = 3 }
   ```
2. Make `workspace.getConfiguration` configurable:
   ```typescript
   let configOverrides: Record<string, any> = {};
   export function __setConfigOverrides(overrides: Record<string, any>) {
     configOverrides = overrides;
   }
   ```
3. Make `WorkspaceEdit.replace` track calls:
   ```typescript
   export class WorkspaceEdit {
     _edits: Array<{ uri: any; range: any; newText: string }> = [];
     replace(uri: any, range: any, newText: string) {
       this._edits.push({ uri, range, newText });
     }
   }
   ```
4. Add coverage documentation comment in `vitest.config.ts`
5. Add parallelism documentation comment in `playwright.config.ts`

### Files to Modify
- `test/__mocks__/vscode.ts` — Expand mock
- `vitest.config.ts` — Add coverage exclusion comment
- `playwright.config.ts` — Add parallelism comment

## Tests Required

### Unit Tests
- [x] Existing tests pass with expanded mock (regression check)
- [x] `WorkspaceEdit.replace` captures edit details for assertion
- [x] `workspace.getConfiguration` returns overridden values when set

## Definition of Done

- [x] All acceptance criteria met
- [x] All existing tests pass (regression check)
- [ ] Human review completed (see Human Review Focus above)
- [x] No test regressions
