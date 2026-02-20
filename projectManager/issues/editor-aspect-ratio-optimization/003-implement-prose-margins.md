# [003] Implement Prose Element Margins

## Metadata
- **Status:** DONE
- **Depends On:** 001, 002
- **Blocks:** 007
- **Scope:** M
- **Design Doc:** [editor-aspect-ratio-optimization](../../design-docs/editor-aspect-ratio-optimization.md)

## Description

Apply 48px side margins to prose elements (paragraphs, headings, lists, blockquotes, callouts) to create 704px prose width within the 800px container. This creates the "hybrid" layout where prose has margins but full-width elements (code, tables) do not.

## Acceptance Criteria

- [ ] Paragraphs have 48px left and right margins
- [ ] All heading levels (H1-H6) have 48px left and right margins
- [ ] Unordered and ordered lists have 48px margins (plus list indent)
- [ ] Blockquotes have 48px margins (plus blockquote padding)
- [ ] Callouts/admonitions have 48px margins
- [ ] Definition lists have 48px margins
- [ ] Effective prose content width is 704px
- [ ] Prose elements use CSS variables (`var(--prose-margin)`)

## Technical Notes

### CSS Implementation

```css
/* Prose elements: respect margins */
.quartz-editor-content > p,
.quartz-editor-content > h1,
.quartz-editor-content > h2,
.quartz-editor-content > h3,
.quartz-editor-content > h4,
.quartz-editor-content > h5,
.quartz-editor-content > h6,
.quartz-editor-content > ul,
.quartz-editor-content > ol,
.quartz-editor-content > blockquote,
.quartz-editor-content > .callout,
.quartz-editor-content > dl {
  max-width: var(--prose-width);      /* 704px */
  margin-left: var(--prose-margin);   /* 48px */
  margin-right: var(--prose-margin);  /* 48px */
}
```

### Files to Modify
- `src/webview/styles/editor.css` - Add prose margin rules

### Key Considerations
- Use direct child selectors (`>`) to avoid affecting nested content
- List padding/indent should be in addition to prose margin
- Blockquote left border/padding should be in addition to prose margin
- Nested elements inside prose containers should inherit width, not margin

## Tests Required

### Unit Tests
- N/A (CSS-only change)

### Manual Testing
- [ ] Paragraph text stays within 704px width
- [ ] Headings align with paragraph text
- [ ] Lists are properly indented within prose width
- [ ] Blockquotes show left border and proper indentation
- [ ] Nested content (code in list, list in blockquote) behaves correctly

### Visual Regression
- [ ] Screenshot comparison of prose-heavy document
- [ ] Verify consistent alignment across element types

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Visual verification of all prose element types
- [ ] Nested content handled correctly
- [ ] Code reviewed
- [ ] No regressions in existing prose styling
