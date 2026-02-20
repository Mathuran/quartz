# [001] Define √2 CSS Variables and Spacing Scale

## Metadata
- **Status:** DONE
- **Depends On:** -
- **Blocks:** 002, 003, 004, 005, 006
- **Scope:** S
- **Design Doc:** [editor-aspect-ratio-optimization](../../design-docs/editor-aspect-ratio-optimization.md)

## Description

Create the foundational CSS custom properties that define the √2-based spacing system. This establishes the design tokens that all other layout changes will reference.

The √2 scale creates a geometric progression where each step multiplies by √2 (≈1.414), and every 2 steps doubles the value.

## Acceptance Criteria

- [ ] CSS variables defined for the complete √2 spacing scale (4px to 64px)
- [ ] Content width variable set to 800px
- [ ] Prose margin variable set to 48px
- [ ] Prose width calculated as content - (margin × 2) = 704px
- [ ] Line height variable set to √2 (1.414)
- [ ] Variables are scoped to the editor root element
- [ ] Variables follow naming convention: `--space-{size}`, `--content-width`, etc.

## Technical Notes

### CSS Variables to Define

```css
:root {
  /* √2 ratio constant */
  --ratio: 1.4142135623730951;

  /* Base unit */
  --space-base: 16px;

  /* √2 geometric scale */
  --space-4xs: 4px;    /* base × √2⁻⁴ */
  --space-3xs: 6px;    /* base × √2⁻³ */
  --space-2xs: 8px;    /* base × √2⁻² */
  --space-xs: 11px;    /* base × √2⁻¹ */
  --space-sm: 23px;    /* base × √2¹ */
  --space-md: 32px;    /* base × √2² */
  --space-lg: 45px;    /* base × √2³ */
  --space-xl: 64px;    /* base × √2⁴ */

  /* Layout dimensions */
  --content-width: 800px;
  --prose-margin: 48px;
  --prose-width: 704px;

  /* Line height */
  --line-height-base: 1.414;
  --line-height-tight: 1.25;
}
```

### Files to Modify
- `src/webview/styles/editor.css` - Add CSS variables at root level

### Key Considerations
- Variables should be defined at a scope accessible to all editor components
- Consider using CSS `calc()` for derived values if browser support allows
- Document each variable with comments explaining the √2 derivation

## Tests Required

### Unit Tests
- N/A (CSS-only change)

### Manual Testing
- [ ] Verify variables are accessible in browser DevTools
- [ ] Confirm variable values match specification
- [ ] Test that existing styles still work (no regressions)

## Definition of Done

- [ ] All acceptance criteria met
- [ ] CSS variables defined and documented
- [ ] No regressions in existing editor styling
- [ ] Code reviewed
