# [001] TypeScript Plumbing — Settings Consolidation + Preset Infrastructure

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** 003
- **Scope:** S
- **Design Doc:** [editor-visual-polish](../../design-docs/editor-visual-polish.md)

## Description

Remove 5 individual visual settings (`theme`, `fontFamily`, `fontSize`, `pageLayout`, `pageMargin`) and replace with a single `quartz.editor.editorTheme` enum setting. Update all TypeScript files that consume these settings. Add `onDidChangeConfiguration` listener for live preset switching.

This issue handles all TypeScript/config plumbing. The CSS presets are created in issue 002 (runs in parallel).

## Acceptance Criteria

- [ ] `package.json`: 5 settings removed, `quartz.editor.editorTheme` added with enum `["default", "clean", "warm", "academic", "minimal"]` and default `"clean"`
- [ ] `src/webview/types.ts`: `EditorConfig` has `editorTheme` field, no `theme`/`fontFamily`/`fontSize`/`pageLayout`/`pageMargin`
- [ ] `src/QuartzEditorProvider.ts`: reads `editorTheme` from config, no longer reads removed settings. Has `onDidChangeConfiguration` listener that re-sends config to webview.
- [ ] `src/webview/App.tsx`: default config uses `editorTheme: 'clean'`, no removed fields
- [ ] `src/webview/Editor.tsx`: applies `quartz-theme-${editorTheme}` class to `.quartz-app` (via prop or context). Removes inline `fontFamily`/`fontSize` style from `EditorContent`.
- [ ] `src/webview/components/PageContainer.tsx`: always renders page layout (no `usePageLayout` conditional). Removes inline `padding`/`maxWidth` styles (preset CSS handles this). Still uses `ResizeObserver` for narrow detection but applies a CSS class instead of switching between `.quartz-page` and `.quartz-fluid`.
- [ ] `src/webview/App.tsx`: applies `quartz-theme-${config.editorTheme}` class on the `.quartz-app` div (both normal view and diff view instances)
- [ ] Theme class is whitelist-validated before applying
- [ ] `npm test` passes (all existing unit tests)
- [ ] `npm run build` succeeds

## Human Review Focus

- **Look at:** Diff of all changed files — confirm no settings were missed, no dead code left
- **Test:** Build the extension, open a markdown file, confirm it loads without errors
- **Decide:** Nothing — all decisions are made in the design doc

## Agent Autonomy Notes

- **Agent can decide:** Internal variable names, how to structure the config listener, whether to use context or props for theme class
- **Escalate to human:** None — the design doc fully specifies the behavior

## Technical Notes

### Suggested Approach

1. Update `src/webview/types.ts` — replace removed fields with `editorTheme: string`
2. Update `package.json` — remove 5 settings, add `quartz.editor.editorTheme` with enum/default
3. Update `src/QuartzEditorProvider.ts`:
   - In `sendConfigToWebview()`: read only `editorTheme` (plus remaining functional settings)
   - Add `workspace.onDidChangeConfiguration` listener that calls `sendConfigToWebview()` when `quartz.editor` changes
   - Ensure listener is disposed in `dispose()`
4. Update `src/webview/App.tsx`:
   - Change default config to `{ editorTheme: 'clean', imageDir: './assets', preserveFormatting: true, showBlockHandles: true }`
   - Apply `quartz-theme-${config.editorTheme}` class on both `.quartz-app` divs (normal + diff view)
   - Whitelist check: `const VALID_THEMES = ['default', 'clean', 'warm', 'academic', 'minimal']; const themeClass = VALID_THEMES.includes(config.editorTheme) ? config.editorTheme : 'clean';`
5. Update `src/webview/Editor.tsx`:
   - Remove `editorContentStyle` useMemo that computed fontFamily/fontSize
   - Remove `style={editorContentStyle}` from `<EditorContent>`
6. Update `src/webview/components/PageContainer.tsx`:
   - Always render `.quartz-page` (remove the conditional between page and fluid)
   - Remove inline `style={{ maxWidth, padding }}` — let CSS presets control width/padding
   - Keep `ResizeObserver` but apply `.quartz-narrow` class instead of toggling layout

### Files to Modify
- `package.json` — settings section
- `src/webview/types.ts` — EditorConfig interface
- `src/QuartzEditorProvider.ts` — config reading + change listener
- `src/webview/App.tsx` — defaults + theme class
- `src/webview/Editor.tsx` — remove inline styles
- `src/webview/components/PageContainer.tsx` — simplify to always-page layout

### Key Considerations
- The `onDidChangeConfiguration` listener must be scoped to `quartz.editor` to avoid unnecessary updates
- The theme class whitelist prevents CSS injection if someone manually edits settings.json with a bad value
- Don't remove `imageDir`, `preserveFormatting`, `showBlockHandles` — those are functional settings that stay
- The `quartz-fluid` CSS class can remain in editor.css (no need to delete it) — it's just no longer used in the page container

## Tests Required

### Unit Tests
- [ ] Existing parser/serializer/roundtrip tests still pass (regression guard)

### Integration Tests
- [ ] Build succeeds (`npm run build`)

### Manual Testing
- [ ] Extension loads a markdown file without errors after settings removal

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests passing
- [ ] Build succeeds
- [ ] No regressions in existing functionality
