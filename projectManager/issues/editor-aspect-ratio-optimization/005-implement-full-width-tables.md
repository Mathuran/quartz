# [005] Implement Full-Width Tables with Horizontal Scroll

## Metadata
- **Status:** DONE
- **Depends On:** 001, 002
- **Blocks:** 007
- **Scope:** S
- **Design Doc:** [editor-aspect-ratio-optimization](../../design-docs/editor-aspect-ratio-optimization.md)

## Description

Make tables expand to full container width (800px) without prose margins. Implement horizontal scrolling for tables that exceed the container width.

## Acceptance Criteria

- [ ] Tables use full 800px width (no prose margins)
- [ ] Tables have horizontal scroll when content exceeds width
- [ ] Table cells maintain proper padding
- [ ] Wide tables (6+ columns) scroll smoothly
- [ ] Table header remains visible (sticky header optional)
- [ ] Nested tables (if any) behave correctly

## Technical Notes

### CSS Implementation

```css
/* Tables: full width with scroll */
.quartz-editor-content > table {
  width: 100%;
  max-width: var(--content-width);  /* 800px */
  margin-left: 0;
  margin-right: 0;
  overflow-x: auto;
  display: block;  /* Required for overflow to work */
}

/* Alternative: wrapper approach */
.quartz-editor-content > .table-wrapper {
  width: 100%;
  max-width: var(--content-width);
  overflow-x: auto;
}

.quartz-editor-content > .table-wrapper > table {
  width: 100%;
  min-width: max-content;  /* Prevent column squishing */
}
```

### Files to Modify
- `src/webview/styles/editor.css` - Add table width and scroll styles
- Possibly: table rendering component if wrapper needed

### Key Considerations
- `display: block` on table can affect some table layouts
- Consider using a wrapper div for better control
- Test with narrow tables (2 cols) and wide tables (6+ cols)
- Ensure table borders/styling still work

## Tests Required

### Unit Tests
- N/A (CSS-only change)

### Manual Testing
- [ ] 3-column table fits without scrolling
- [ ] 6-column table with long content shows scroll
- [ ] Table cell padding is consistent
- [ ] Table borders render correctly
- [ ] Scroll works smoothly on wide tables

### Visual Regression
- [ ] Screenshot of narrow table
- [ ] Screenshot of wide table with scroll
- [ ] Screenshot of API parameters table (5 columns)

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Tested with various table sizes
- [ ] Scroll behavior works correctly
- [ ] Code reviewed
- [ ] No regressions in table styling
