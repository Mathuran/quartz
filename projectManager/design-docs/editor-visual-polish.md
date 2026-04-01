# Editor Visual Polish Design Document

**Author:** Mathuran Sadagopan
**Status:** IMPLEMENTED
**Created:** 2026-03-29
**Last Updated:** 2026-03-29 (rev 2)
**Reviewers:** —

---

## 1. Problem Statement

Quartz currently inherits VS Code's code-editor aesthetic wholesale — flat backgrounds, no visual separation between the editor surface and surrounding chrome, and functional-but-generic block styling. While this works, it makes Quartz feel like "TipTap inside VS Code" rather than a purpose-built writing tool. Users who chose Quartz over raw markdown editing expect a Notion/Craft-level writing experience, and the current visual treatment doesn't deliver that. The editor needs to feel like a *document* surface, not a code panel.

## 2. Goals and Non-Goals

### Goals

- **P0: Page shadow/border** — Add a box-shadow and subtle border to `.quartz-page` so the content area floats above the VS Code background as a distinct "page." Measured by: the page element has visible depth separation from the wrapper in both light and dark themes.
- **P0: Document paper texture** — Differentiate the editor background from VS Code chrome with a warm-tinted background color (not a literal texture image). Measured by: the editor content area has a visibly distinct background from the sidebar/activity bar in at least 4 popular themes (Default Dark+, Default Light+, One Dark Pro, Solarized Light).
- **P1: Editor theme presets** — Provide 3-4 curated visual "looks" (e.g., Clean, Warm, Academic, Minimal) selectable via a single VS Code setting (`quartz.editorTheme`). Each preset sets typography, spacing, and color adjustments as a CSS class on the root. Measured by: switching the setting applies a visually distinct look without reload.

### Non-Goals

- Not building a full theme engine or color picker — presets are fixed, not user-composable.
- Not changing the parser, serializer, or TipTap schema — all changes are CSS + configuration.
- Not redesigning individual block types (callouts, code blocks, tables) — those are separate features.
- Not adding font downloads or web fonts — presets use system font stacks only.
- Not re-introducing per-property overrides (fontSize, pageMargin, etc.) — presets are the single knob. Individual settings may return later for ultra-wide screen handling.

## 3. Background and Context

### Current State

The editor's CSS variables (`editor.css:1-22`) define a palette derived from VS Code theme variables:

```css
--quartz-bg: var(--vscode-editor-background, #1e1e1e);
--quartz-page-bg: var(--vscode-editor-background, #1e1e1e);
--quartz-wrapper-bg: var(--vscode-sideBar-background, #181818);
```

The page already has a minimal shadow (`box-shadow: 0 1px 4px`) and `border-radius: 2px`, but the effect is barely visible — especially in dark themes where `--vscode-widget-shadow` is near-black on near-black.

Typography uses system sans-serif at a configurable `fontSize` (default 16px) with `line-height: 1.7`. There's no spacing system beyond per-element margins, and no way to toggle between visual density levels.

### Why Now

Quartz recently shipped to the VS Code Marketplace (v0.1.1). First impressions matter — new users evaluate the editor within seconds of opening it. A polished visual feel is the fastest way to convey quality and differentiate from other markdown editors in the marketplace.

### Brainstorming Context

These three ideas were selected through 5 rounds of iterative brainstorming, each time keeping the top 3 ideas and adding 7 new ones, scored against a rubric weighting Visual Impact (25%), Readability (25%), Verifiability (20%), Risk (15%), and Delight (15%). All three finalists are Zone 5 (CSS-only), low edge-case density, and compose naturally together.

## 4. Proposed Solution

### Overview

The implementation is three layers that build on each other:

1. **Page shadow/border** — Enhanced shadow and border on `.quartz-page` with theme-aware values
2. **Paper texture** — Warm background tint on the content area, distinct from VS Code chrome
3. **Theme presets** — CSS class system that bundles shadow, background, typography, and spacing into selectable presets

All changes are confined to `src/webview/styles/` and `src/webview/Editor.tsx` (to read the config and apply a class). Zero changes to the parser, serializer, extensions, or extension host.

### Layer 1: Page Shadow/Border

Replace the current minimal shadow with a more pronounced, theme-aware shadow system:

```css
/* Dark themes: subtle glow */
.quartz-page {
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.3),
    0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--quartz-border);
  border-radius: 4px;
}

/* Light themes: classic paper shadow */
body[data-vscode-theme-kind="vscode-light"] .quartz-page,
body[data-vscode-theme-kind="vscode-high-contrast-light"] .quartz-page {
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.08),
    0 6px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.08);
}
```

This gives the "floating page" feel of Google Docs or Notion. The wrapper background (`--quartz-wrapper-bg`) already differs from the page background, so the shadow creates visible depth.

### Layer 2: Document Paper Texture

Introduce a warm tint on the page background that subtly departs from the VS Code editor color:

```css
/* Dark: slightly warmer than the raw editor bg */
.quartz-page {
  --quartz-page-bg: color-mix(in srgb, var(--vscode-editor-background, #1e1e1e) 95%, #2a2520);
}

/* Light: warm paper white */
body[data-vscode-theme-kind="vscode-light"] .quartz-page,
body[data-vscode-theme-kind="vscode-high-contrast-light"] .quartz-page {
  --quartz-page-bg: color-mix(in srgb, var(--vscode-editor-background, #ffffff) 96%, #f5f0e8);
}
```

The `color-mix()` approach ensures the tint works across any theme — it's always a percentage blend toward a warm target, not a hardcoded color. The ratio (95-96%) keeps it subtle enough to feel intentional, not jarring.

### Layer 3: Editor Theme Presets

Add a VS Code setting `quartz.editorTheme` with values: `"default"`, `"clean"`, `"warm"`, `"academic"`, `"minimal"`.

Each preset applies a CSS class to `.quartz-app` that overrides typography, spacing, and color variables:

| Preset | Font Stack | Line Height | Page Width | Padding | Typography Voice |
|--------|-----------|-------------|------------|---------|-----------------|
| **Default** | System sans-serif | 1.7 | 900px | 72px | VS Code native — escape hatch, no overrides |
| **Clean** | System sans-serif | 1.8 | 900px | 56px | Modern editorial — smaller heading scale, #2563eb links |
| **Warm** | Georgia, serif | 1.75 | 900px | 56px | Literary — dramatic H1, light h2/h3, #b45309 amber links, italic blockquotes |
| **Academic** | 'Times New Roman', serif | 1.5 | 900px | 56px | Document — conservative headings, dense spacing, #1d4ed8 deep blue links |
| **Minimal** | System sans-serif | 1.9 | 900px | 64px | Distraction-free — subtle headings (weight 500-600), #6b7280 gray links |

Each preset overrides: heading scale/weight/margins, link color, blockquote style, list indentation, code block sizing, HR spacing, table padding, and callout color palette. Page width is fixed at 900px across all presets — only typography and color vary.

Implementation in `Editor.tsx`:

```tsx
// Read config
const editorTheme = config.editorTheme || 'default';

// Apply as class
<div className={`quartz-app quartz-theme-${editorTheme}`}>
```

Each preset is defined as a CSS block that overrides the relevant variables:

```css
.quartz-theme-warm {
  --quartz-page-bg: color-mix(in srgb, var(--vscode-editor-background) 90%, #f5e6d0);
  font-family: Georgia, 'Times New Roman', serif;
}
.quartz-theme-warm .quartz-editor-content {
  line-height: 1.8;
}
.quartz-theme-warm .quartz-page {
  max-width: 60ch;
}
/* ... etc for each preset */
```

### Settings Consolidation

The preset system replaces 5 existing individual settings that created a complex interaction matrix:

| Setting removed | Current default | Absorbed by |
|----------------|----------------|-------------|
| `quartz.editor.theme` (auto/light/dark) | `"auto"` | VS Code's native `data-vscode-theme-kind` (already used) |
| `quartz.editor.fontFamily` | `"inherit"` | Preset font stacks |
| `quartz.editor.fontSize` | `16` | Preset typography definitions |
| `quartz.editor.pageLayout` | `true` | Presets always use page layout |
| `quartz.editor.pageMargin` | `72` | Preset spacing/width definitions |

**Settings that remain unchanged:**
- `quartz.editor.defaultForMarkdown` — functional, not visual
- `quartz.editor.imageDir` — functional
- `quartz.editor.preserveFormatting` — functional
- `quartz.editor.showBlockHandles` — functional
- `quartz.diffReview.enabled` — functional

This reduces the visual configuration surface from 5 settings to 1 (`quartz.editor.editorTheme`). Individual per-property settings may return later for ultra-wide screen handling.

**Files affected by removal:**
- `package.json` — remove 5 settings, add 1
- `src/QuartzEditorProvider.ts:189-192` — stop reading removed settings, pass `editorTheme` instead
- `src/webview/types.ts:3-6` — remove `fontFamily`, `fontSize`, `pageLayout`, `pageMargin` from config type; add `editorTheme`
- `src/webview/Editor.tsx:348-351` — remove inline font style computation
- `src/webview/App.tsx:27-30` — update config defaults
- `src/webview/components/PageContainer.tsx:27,36` — remove `pageLayout`/`pageMargin` reads; page container always active, width controlled by preset CSS

### Configuration Schema

Replace the 5 removed settings with a single preset selector in `package.json`:

```json
{
  "quartz.editor.editorTheme": {
    "type": "string",
    "default": "clean",
    "enum": ["default", "clean", "warm", "academic", "minimal"],
    "enumDescriptions": [
      "Standard look — adapts to your VS Code theme",
      "Clean and modern — generous spacing, warm paper tint",
      "Warm and literary — serif font, sepia tones",
      "Academic — traditional serif, tight spacing, wide margins",
      "Minimal — maximum whitespace, reduced visual chrome"
    ],
    "description": "Visual theme preset for the editor. Changes typography, spacing, and background."
  }
}
```

### Live Preset Switching (Optimistic Updates)

Since presets are fully defined by us (not user-composed), switching is a CSS class swap — no data round-trip needed. When `workspace.onDidChangeConfiguration` fires, the provider sends the new `editorTheme` value to the webview, and the webview optimistically swaps the class on `.quartz-app`. No editor reload required.

```
User changes setting → onDidChangeConfiguration → postMessage({ editorTheme }) → webview swaps class → instant visual update
```

This is low-risk because the class swap is idempotent and the CSS is already loaded.

### File Changes Summary

| File | Change | Zone |
|------|--------|------|
| `src/webview/styles/editor.css` | Enhanced shadow, paper tint | 5 (CSS) |
| `src/webview/styles/themes.css` | New file — preset definitions | 5 (CSS) |
| `src/webview/Editor.tsx` | Read `editorTheme` config, apply CSS class; remove inline font style | 4 (Component) |
| `src/webview/App.tsx` | Update config defaults | 4 (Component) |
| `src/webview/types.ts` | Update config type — remove 4 fields, add `editorTheme` | 4 (Types) |
| `src/webview/components/PageContainer.tsx` | Remove `pageLayout`/`pageMargin` reads; always render page layout | 4 (Component) |
| `src/QuartzEditorProvider.ts` | Remove 4 config reads, add `editorTheme`; add `onDidChangeConfiguration` listener for live switching | 2 (Extension host) |
| `package.json` | Remove 5 settings, add `quartz.editor.editorTheme` | Config |
| `src/webview/index.tsx` | Import `themes.css` | Trivial |

## 5. Alternative Solutions Considered

### Alternative A: Fixed color scheme (not theme-adaptive)

**Approach:** Hardcode a single beautiful color palette (e.g., Notion's off-white) regardless of VS Code theme.

**Pros:**
- Total visual control — can guarantee a polished look
- Simpler CSS — no need for `color-mix()` or theme-kind selectors

**Cons:**
- Breaks for ~40% of users on light themes (or vice versa)
- Clashes with custom themes users have chosen deliberately
- Feels hostile to VS Code's core extensibility philosophy

**Why rejected:** Users choose VS Code themes for a reason. Overriding them feels like the extension doesn't belong. The `color-mix()` approach achieves visual distinction while respecting the user's environment.

### Alternative B: Full user-configurable color system

**Approach:** Expose individual settings for every color variable (`quartz.backgroundColor`, `quartz.headingColor`, `quartz.accentColor`, etc.).

**Pros:**
- Maximum user control
- Can achieve any desired look

**Cons:**
- Overwhelming for most users (20+ settings)
- Most users won't touch them — they want it to look good out of the box
- Testing matrix explodes (infinite color combinations)
- Support burden: "Why does my editor look broken?" because they set conflicting colors

**Why rejected:** Presets give 80% of the benefit with 1% of the complexity. A single dropdown replaces 20 color pickers. Power users can still override via VS Code's CSS custom properties.

## 6. Security, Privacy, and Compliance

These changes are purely visual CSS and a string-enum configuration setting. No new data is collected, stored, or transmitted. No user content is affected. No new attack surface.

The only consideration: the theme preset name is passed from the extension host to the webview via the existing config message. The value is constrained to an enum and used only as a CSS class name. The class application should use a whitelist check:

```tsx
const VALID_THEMES = ['default', 'clean', 'warm', 'academic', 'minimal'];
const themeClass = VALID_THEMES.includes(editorTheme) ? editorTheme : 'default';
```

## 7. Testing Strategy

### Unit Tests

None required. These changes don't affect parsing, serialization, or roundtrip fidelity. The existing parser/serializer/roundtrip test suites serve as regression guards — if they still pass, the data pipeline is unaffected.

### Integration Tests

- **Configuration test:** Verify that `quartz.editorTheme` is registered and accepts all enum values. Extend `configuration.test.ts`.

### E2E Tests (Playwright)

| Test | What it validates |
|------|-------------------|
| Page shadow visible | `.quartz-page` has a `box-shadow` computed style that is not `none` |
| Paper background differs from wrapper | `getComputedStyle(.quartz-page).backgroundColor !== getComputedStyle(.quartz-page-wrapper).backgroundColor` |
| Theme preset applies class | Setting `editorTheme: "warm"` results in `.quartz-theme-warm` class on `.quartz-app` |
| Theme preset changes font | `.quartz-theme-academic` results in a serif `font-family` computed style |
| Default preset matches current look | No visual regression when `editorTheme` is `"default"` |

### Manual Validation (Human Required)

Automated tests can verify CSS properties are set, but cannot judge whether the result *looks good*. The human validation plan (Section 9) covers this.

## 8. Rollout Plan

### Phase 1: Shadow + Tint + Preset Infrastructure + Settings Removal (Scope: M — 2 review cycles)

Since presets replace individual settings, the infrastructure and the visual changes ship together.

**Cycle 1: Plumbing + `default` and `clean` presets**
- **Agent delivers:**
  - Remove 5 settings from `package.json`, add `quartz.editor.editorTheme`
  - Update `QuartzEditorProvider.ts` — remove old config reads, add `editorTheme` + `onDidChangeConfiguration` listener
  - Update `types.ts`, `App.tsx`, `Editor.tsx`, `PageContainer.tsx` — remove old config consumption
  - `themes.css` with `default` and `clean` preset CSS
  - Enhanced shadow and paper tint in `editor.css`
  - All existing tests passing
- **Human reviews:**
  - Open the editor — confirm `clean` (new default) looks polished in Default Dark+ and Default Light+
  - Switch to `default` preset — confirm it's a reasonable stripped-back look
  - Confirm live switching works (no reload needed)
  - Confirm no regressions in editing, parsing, or saving
- **Approved when:** Editor opens cleanly, both presets look good, live switching works

**Cycle 2: Remaining presets**
- **Agent delivers:**
  - `warm`, `academic`, `minimal` preset CSS in `themes.css`
  - Updated enum descriptions in `package.json`
  - E2E tests for class application and font/width changes
- **Human reviews:**
  - Cycle through all 5 presets in both light and dark themes (10 combinations)
  - Confirm each preset is visually distinct and cohesive
  - Confirm no layout breakage (overflow, clipping, z-index issues)
- **Approved when:** Human approves all 10 combinations

### Rollback Plan

All changes are CSS and a single config key. Rollback = revert the CSS file changes. The `editorTheme` setting degrades gracefully — if the CSS class doesn't exist, the default styles apply.

## 9. Human Validation Plan

| Checkpoint | Agent Produces | Human Validates | Blocks |
|------------|---------------|-----------------|--------|
| Plumbing + `clean` preset review | Settings removal, config plumbing, `default`/`clean` CSS, enhanced shadow/tint | Editor opens cleanly, `clean` preset looks polished in 4 themes, live switching works, no editing regressions | Cycle 2 |
| Per-preset visual review | `warm`, `academic`, `minimal` CSS, E2E tests | Cohesion, readability, and "feel" of each preset across light/dark (10 combinations) | Release |
| Typography judgment calls | Proposed font stacks, line-heights, widths per preset | Whether serif fonts feel right, whether `60ch` is too narrow, whether spacing is too much | Preset finalization |

**Key human decisions required before agent proceeds:**
1. **Paper tint intensity:** Is 4-5% warm blend enough, or should it be more/less? (Reviewable in Cycle 1)
2. **Serif font choice:** Is Georgia the right serif, or should `"Warm"` use a different stack? (Reviewable in Cycle 2)
3. **Width units:** Should presets use `ch` (content-adaptive) or `px` (predictable)? (Reviewable in Cycle 2)

## 10. Dependencies and Risks

### Dependencies

- None external. All changes use existing CSS features (`color-mix()`, `data-vscode-theme-kind`).
- `color-mix()` requires the webview's Chromium version to support it — VS Code 1.85+ ships Electron 28+ which includes Chrome 120+, where `color-mix()` is supported.

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Paper tint clashes with some third-party themes | Visual — editor looks off on specific themes | Medium | Use low-intensity `color-mix()` blends (4-5%); test against top 10 marketplace themes |
| `color-mix()` not supported in older VS Code | Visual — fallback colors used instead | Low | VS Code engine requirement is ^1.85 which includes Chrome 120+; `color-mix()` shipped in Chrome 111 |
| Serif fonts in presets render poorly on some OSes | Visual — "Academic" or "Warm" looks bad on Linux | Medium | Use font stacks with multiple fallbacks; test on macOS and note Linux limitations in docs |
| Users expect presets to persist per-file | Confusion — preset is global, not per-document | Low | Document clearly that it's a workspace/user setting; a per-file override is a future enhancement |
| Preset CSS increases webview bundle size | Performance — slower initial load | Very Low | Preset CSS is ~2-3KB total; negligible vs. current bundle |
| Removing 5 settings is a breaking change | Existing users who customized `fontSize`, `pageMargin`, etc. lose their settings silently | Low (v0.1.1 has few users) | Mention in changelog; the new `clean` default should be an upgrade for most users. Settings may return later for edge cases like ultra-wide screens. |
| `onDidChangeConfiguration` listener leak | Memory — listener not disposed on editor close | Low | Register listener in `QuartzEditorProvider` and dispose in the `dispose()` method, following existing disposal pattern |

## 11. Open Questions

### Resolved

| Question | Resolution |
|----------|-----------|
| Setting precedence (user settings vs. presets) | Presets are the single knob. Remove individual settings (`fontSize`, `fontFamily`, `pageLayout`, `pageMargin`, `theme`). No precedence problem. |
| Live switching vs. reload | Optimistic updates — CSS class swap on config change message. No reload needed. |
| Extension host non-goal | Dropped. Extension host changes are required and scoped to config plumbing + `onDidChangeConfiguration`. |

### Open

| Question | Owner | Blocking? |
|----------|-------|-----------|
| Should presets affect code block styling too (font size, padding)? | Mathuran | No — can add later |

### Resolved (cont.)

| Question | Resolution |
|----------|-----------|
| What does the "Default" preset mean? | `"default"` = current look (no shadow, no tint, system sans, 900px). An escape hatch to the raw VS Code feel. The setting defaults to `"clean"`, so new users get the polished look. |

## 12. Implementation Issues

| # | Title | Status | Scope | Depends On |
|---|-------|--------|-------|------------|
| [001](../issues/editor-visual-polish/001-typescript-plumbing-settings-consolidation.md) | TypeScript Plumbing — Settings Consolidation + Preset Infrastructure | DONE | S | — |
| [002](../issues/editor-visual-polish/002-css-visual-layer-shadow-tint-presets.md) | CSS Visual Layer — Shadow, Tint, and All 5 Theme Presets | DONE | S | — |
| [003](../issues/editor-visual-polish/003-e2e-tests-integration-verification.md) | E2E Tests + Integration Verification | DONE | S | 001, 002 |

**Progress:** 3/3 issues complete (100%)

**Dependency Graph:**
```
001 (TS plumbing) ──┐
                    ├──► 003 (E2E tests)
002 (CSS presets) ──┘
```

Issues 001 and 002 run in parallel (no file overlap). Issue 003 runs after both are merged.
