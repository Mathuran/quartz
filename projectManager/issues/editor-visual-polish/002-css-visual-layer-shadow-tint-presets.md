# [002] CSS Visual Layer — Shadow, Tint, and All 5 Theme Presets

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** 003
- **Scope:** S
- **Design Doc:** [editor-visual-polish](../../design-docs/editor-visual-polish.md)

## Description

Create the CSS visual layer: enhanced page shadow/border, warm paper tint, and all 5 theme preset definitions. This is pure CSS work — no TypeScript changes. Runs in parallel with issue 001.

## Acceptance Criteria

- [ ] `src/webview/styles/editor.css`: Enhanced box-shadow on `.quartz-page` with light/dark theme variants
- [ ] `src/webview/styles/editor.css`: Page border with `border-radius: 4px`
- [ ] `src/webview/styles/themes.css`: New file with all 5 preset classes
- [ ] `.quartz-theme-default`: System sans-serif, line-height 1.7, max-width 900px, no tint (current raw VS Code look)
- [ ] `.quartz-theme-clean`: System sans-serif, line-height 1.8, max-width 65ch, comfortable padding, warm paper tint via `color-mix()`
- [ ] `.quartz-theme-warm`: Georgia serif, line-height 1.8, max-width 60ch, spacious padding, warm sepia tint
- [ ] `.quartz-theme-academic`: Times New Roman serif, line-height 1.6, max-width 70ch, tight padding, cool white tint
- [ ] `.quartz-theme-minimal`: System sans-serif, line-height 1.9, max-width 55ch, very spacious padding, no tint, reduced chrome
- [ ] Each preset has light/dark theme-kind variants where needed
- [ ] `src/webview/index.tsx`: imports `themes.css`
- [ ] `.quartz-narrow` class handles narrow viewport override (full-width, reduced padding)

## Human Review Focus

- **Look at:** The preset CSS — confirm each preset defines distinct typography, spacing, and color
- **Test:** Visually inspect all 5 presets in light and dark themes (10 combinations) after merging with issue 001
- **Decide:** Whether tint intensities, font choices, and widths feel right

## Agent Autonomy Notes

- **Agent can decide:** Exact padding values, shadow rgba values, color-mix percentages (starting from design doc suggestions), CSS organization within themes.css
- **Escalate to human:** None — these are all visual CSS values that will be reviewed visually

## Technical Notes

### Suggested Approach

1. Update `src/webview/styles/editor.css`:
   - Replace the existing `.quartz-page` `box-shadow` with enhanced theme-aware shadows:
     - Dark: `0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15)`
     - Light (via `body[data-vscode-theme-kind="vscode-light"]`): `0 1px 3px rgba(0, 0, 0, 0.08), 0 6px 20px rgba(0, 0, 0, 0.06)`
   - Update `border-radius` from `2px` to `4px`
   - Add `border: 1px solid var(--quartz-border)` for dark, `1px solid rgba(0, 0, 0, 0.08)` for light
   - Remove inline-style-dependent properties from `.quartz-page` (maxWidth, padding) since those now come from presets. Set sensible CSS defaults that the preset classes will override.

2. Create `src/webview/styles/themes.css` with all 5 presets:

   **Default preset** (escape hatch — raw VS Code look):
   ```css
   .quartz-theme-default .quartz-page {
     max-width: 900px;
     padding: 72px;
   }
   .quartz-theme-default .quartz-editor-content {
     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
     font-size: 16px;
     line-height: 1.7;
   }
   /* No shadow enhancement, no tint — use base values */
   ```

   **Clean preset** (new default):
   ```css
   .quartz-theme-clean .quartz-page {
     max-width: 65ch;
     padding: 80px;
     --quartz-page-bg: color-mix(in srgb, var(--vscode-editor-background, #1e1e1e) 95%, #2a2520);
   }
   body[data-vscode-theme-kind="vscode-light"] .quartz-theme-clean .quartz-page {
     --quartz-page-bg: color-mix(in srgb, var(--vscode-editor-background, #ffffff) 96%, #f5f0e8);
   }
   .quartz-theme-clean .quartz-editor-content {
     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
     font-size: 16px;
     line-height: 1.8;
   }
   ```

   **Warm preset** (literary):
   ```css
   .quartz-theme-warm .quartz-page {
     max-width: 60ch;
     padding: 88px;
     --quartz-page-bg: color-mix(in srgb, var(--vscode-editor-background, #1e1e1e) 90%, #2a2520);
   }
   body[data-vscode-theme-kind="vscode-light"] .quartz-theme-warm .quartz-page {
     --quartz-page-bg: color-mix(in srgb, var(--vscode-editor-background, #ffffff) 90%, #f5e6d0);
   }
   .quartz-theme-warm .quartz-editor-content {
     font-family: Georgia, 'Times New Roman', 'Noto Serif', serif;
     font-size: 17px;
     line-height: 1.8;
   }
   ```

   **Academic preset** (traditional):
   ```css
   .quartz-theme-academic .quartz-page {
     max-width: 70ch;
     padding: 64px;
     --quartz-page-bg: color-mix(in srgb, var(--vscode-editor-background, #1e1e1e) 97%, #1e2024);
   }
   body[data-vscode-theme-kind="vscode-light"] .quartz-theme-academic .quartz-page {
     --quartz-page-bg: color-mix(in srgb, var(--vscode-editor-background, #ffffff) 98%, #f0f2f5);
   }
   .quartz-theme-academic .quartz-editor-content {
     font-family: 'Times New Roman', 'Noto Serif', Georgia, serif;
     font-size: 16px;
     line-height: 1.6;
   }
   ```

   **Minimal preset** (maximum breathing room):
   ```css
   .quartz-theme-minimal .quartz-page {
     max-width: 55ch;
     padding: 96px;
   }
   .quartz-theme-minimal .quartz-editor-content {
     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
     font-size: 16px;
     line-height: 1.9;
   }
   ```

3. Add `.quartz-narrow` override at the bottom of themes.css:
   ```css
   .quartz-narrow .quartz-page {
     max-width: 100%;
     padding: 16px 24px;
     border-radius: 0;
     box-shadow: none;
     border: none;
   }
   ```

4. Update `src/webview/index.tsx` — add `import './styles/themes.css';`

### Files to Modify
- `src/webview/styles/editor.css` — shadow/border enhancement
- `src/webview/styles/themes.css` — new file with all 5 presets
- `src/webview/index.tsx` — import themes.css

### Key Considerations
- `color-mix()` is supported in Chrome 111+; VS Code 1.85 ships Chrome 120+
- The `.quartz-theme-default` preset should produce the exact same visual result as the current editor (before this change), minus the old shadow. This is the escape hatch.
- The `background: var(--quartz-page-bg)` is already on `.quartz-page` in editor.css, so overriding `--quartz-page-bg` in preset classes will "just work"
- Presets set `font-family` and `font-size` on `.quartz-editor-content`, not on `body` — so UI elements (slash menu, toolbar, etc.) keep their existing sizing
- For the `default` preset, DON'T apply enhanced shadow/tint — it should be the raw VS Code look as an escape hatch. The enhanced shadow from editor.css applies to all presets, so the `default` preset should explicitly reset: `box-shadow: 0 1px 4px var(--vscode-widget-shadow, rgba(0, 0, 0, 0.3)); border: none; border-radius: 2px;`

## Tests Required

### Unit Tests
- [ ] N/A — pure CSS, no logic to test

### Manual Testing
- [ ] Each of the 5 presets applies visually distinct styles (after merge with issue 001)
- [ ] Light and dark theme variants render correctly
- [ ] Narrow viewport override works

## Definition of Done

- [ ] All acceptance criteria met
- [ ] CSS is valid and well-organized
- [ ] themes.css is imported
- [ ] No regressions in existing styles
