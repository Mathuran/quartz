# [014] CSS Theme Compatibility

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** —
- **Scope:** M
- **Design Doc:** [codebase-review-findings](../../design-docs/codebase-review-findings.md)

## Description

Multiple CSS files use hardcoded colors that only work on dark VS Code themes. Callout colors, diff "modified" state, hover effects, and page shadows all use fixed values instead of VS Code CSS custom properties. The z-index stacking has no documented scale, and `!important` overrides indicate specificity issues.

**Findings:** 6.5, 6.6, 6.9, 6.10, 6.11, 6.12, 6.18

## Acceptance Criteria

- [x] Callout type colors use theme-adaptive approach (either `color-mix()` with `var()` or light-theme overrides via `body[data-vscode-theme-kind="vscode-light"]`)
- [x] Diff "modified" color uses VS Code theme variable or custom property with fallback
- [x] All `rgba(255, 255, 255, 0.1)` hover effects replaced with theme-aware values (found in 13+ locations)
- [x] Page shadow (`box-shadow`) uses theme-aware value
- [x] z-index scale documented as CSS custom properties (e.g., `--z-dropdown: 50; --z-menu: 100; --z-overlay: 1000`)
- [x] `!important` overrides in `codeBlock.css` replaced with increased selector specificity

## Human Review Focus

- **Look at:** The callout colors on both light and dark themes — verify contrast and readability
- **Test:** Switch VS Code between light theme (e.g., "Default Light+") and dark theme — verify all elements are visible and readable
- **Decide:** Whether to use `color-mix()` (modern CSS, may not be supported everywhere) or `data-vscode-theme-kind` selectors

## Agent Autonomy Notes

- **Agent can decide:** Exact color values for light theme, z-index scale values, selector specificity approach
- **Escalate to human:** Visual design decisions — callout colors on light themes need human approval

## Technical Notes

### Suggested Approach
1. **z-index scale:** Add to a new `variables.css` or at the top of `editor.css`:
   ```css
   :root {
     --quartz-z-dropdown: 50;
     --quartz-z-menu: 100;
     --quartz-z-search: 200;
     --quartz-z-overlay: 1000;
   }
   ```
2. **Callout colors:** Use `body[data-vscode-theme-kind="vscode-light"]` overrides:
   ```css
   body[data-vscode-theme-kind="vscode-light"] .quartz-callout-note {
     --callout-color: #1a73e8;
   }
   ```
3. **Hover effects:** Replace `rgba(255, 255, 255, 0.1)` with:
   ```css
   background: color-mix(in srgb, var(--vscode-editor-foreground) 10%, transparent);
   /* Fallback for older environments: */
   background: var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.1));
   ```
4. **Diff modified:** Use `var(--vscode-editorWarning-foreground, #e3b341)` or similar
5. **!important removal:** Change `.quartz-editor-content pre` to `.quartz-codeblock .quartz-editor-content pre` for specificity
6. **Page shadow:** Use `var(--vscode-widget-shadow, rgba(0, 0, 0, 0.3))`

### Files to Modify
- `src/webview/styles/callout.css` — Theme-adaptive callout colors
- `src/webview/styles/diffReview.css` — Modified state color
- `src/webview/styles/editor.css` — Hover effects, page shadow, z-index variables
- `src/webview/styles/search.css` — Hover effects
- `src/webview/styles/codeBlock.css` — !important removal, hover effects
- `src/webview/styles/frontmatter.css` — !important review
- `src/webview/styles/tableOfContents.css` — z-index variables

### Key Considerations
- `color-mix()` is supported in Chrome 111+ (VS Code uses Chromium, so this should work)
- `data-vscode-theme-kind` values: `vscode-dark`, `vscode-light`, `vscode-high-contrast`, `vscode-high-contrast-light`
- High-contrast themes should also be considered (at minimum, don't break them)
- VS Code theme variables reference: https://code.visualstudio.com/api/references/theme-color

## Tests Required

### E2E Tests
- [ ] Editor renders correctly on dark theme (no visual regression)
- [ ] Editor renders correctly on light theme (all elements visible)

### Manual Testing
- [ ] Switch to "Default Light+" theme — verify:
  - Callout backgrounds and borders visible
  - Diff modified highlights visible
  - Hover effects visible on toolbar buttons
  - Page shadow appropriate
  - Code block styling correct (no !important artifacts)
- [ ] Switch to "Default Dark+" theme — verify no regression
- [ ] Switch to "Default High Contrast" theme — verify readability

## Definition of Done

- [ ] All acceptance criteria met
- [ ] E2E tests passing (if applicable)
- [ ] Manual testing on light and dark themes completed
- [ ] Human review completed (see Human Review Focus above)
- [ ] No regressions in visual appearance on dark themes
