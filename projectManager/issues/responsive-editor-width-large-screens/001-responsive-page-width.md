# [001] Implement Fixed 900px Centered Page Width

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [responsive-editor-width-large-screens](../../design-docs/responsive-editor-width-large-screens.md)

## Description

Replace the fixed 816px configurable page width with a hardcoded 900px width, always centered in the viewport. Remove `pageWidth` and `sidebarPosition` from `EditorConfig` entirely — the page is no longer configurable or sidebar-aware.

During implementation, the approach evolved from dynamic √2-based scaling to a fixed 900px centered layout (matching Notion's design language) based on human review feedback.

## Acceptance Criteria

- [x] `PageContainer` uses a fixed 900px `maxWidth`
- [x] Page is always centered (`justify-content: center`)
- [x] `pageWidth` removed from `EditorConfig`, default config, extension host, and `package.json`
- [x] `sidebarPosition` removed from `EditorConfig`, default config, extension host
- [x] `workbench.sideBar.location` config listener removed
- [x] `align-left` / `align-right` CSS classes removed
- [x] Fluid layout kicks in below 900px container width
- [x] All existing unit, integration, and E2E tests pass
- [x] E2E sidebar alignment test updated to verify centering

## Human Review Focus

- **Look at:** Page centering at different panel widths
- **Test:** Toggle sidebar — page width should not change. Resize VS Code window — page stays centered.
- **Decide:** Does the 900px width feel right?

## Changes Made

### Files Modified
- `src/webview/components/PageContainer.tsx` — fixed 900px width, always centered, removed dynamic computation
- `src/webview/types.ts` — removed `pageWidth` and `sidebarPosition` from `EditorConfig`
- `src/webview/App.tsx` — removed `pageWidth` and `sidebarPosition` from default config
- `src/QuartzEditorProvider.ts` — removed `pageWidth` config, `sidebarPosition` config, and `sideBar.location` listener
- `src/webview/styles/editor.css` — removed `align-left`/`align-right`, kept only `align-center`
- `package.json` — removed `quartz.editor.pageWidth` setting

### Tests Updated
- `test/e2e/specs/sidebar-alignment.spec.ts` — rewritten to verify centering
- `test/e2e/specs/theme.spec.ts` — removed `pageWidth`/`sidebarPosition` from configs
- `test/e2e/specs/page-layout.spec.ts` — removed `pageWidth`/`sidebarPosition` from configs
- `test/integration/configuration.test.ts` — removed `pageWidth` assertion
- `vitest.config.ts` — removed responsive-page-width test

### Files Removed
- `test/unit/responsive-page-width.test.ts` — no longer needed (no dynamic computation)

## Definition of Done

- [x] All acceptance criteria met
- [x] All existing tests passing (292 unit, build succeeds)
- [x] Human review completed — visual check approved
