# [009] Implement Inline Element Spacing

## Metadata
- **Status:** DONE
- **Depends On:** 001, 008
- **Blocks:** 010
- **Scope:** S
- **Design Doc:** [editor-aspect-ratio-optimization](../../design-docs/editor-aspect-ratio-optimization.md)

## Description

Apply appropriate spacing to inline elements: inline code, links, highlights, subscript, superscript, etc. These elements should integrate smoothly with surrounding text while maintaining visual distinction.

## Acceptance Criteria

- [ ] Inline code has 4px horizontal padding, 2px vertical padding
- [ ] Inline code has border-radius of 3px (close to --space-4xs)
- [ ] Links inherit spacing (no extra padding)
- [ ] Highlight/mark has 2px horizontal padding
- [ ] Subscript/superscript use 0.75em font size
- [ ] Inline math has 2px horizontal padding
- [ ] Inline images have vertical-align: middle
- [ ] All inline elements use consistent line-height

## Technical Notes

### CSS Implementation

```css
/* Inline code */
.quartz-editor-content code:not(pre code) {
  padding: 2px 4px;
  border-radius: 3px;
  background-color: var(--code-bg);
  font-size: 0.9em;
}

/* Links */
.quartz-editor-content a {
  /* Inherits spacing, no extra padding */
  text-decoration: none;
}

.quartz-editor-content a:hover {
  text-decoration: underline;
}

/* Highlight/mark */
.quartz-editor-content mark {
  padding: 0 2px;
  background-color: var(--highlight-bg);
}

/* Subscript/superscript */
.quartz-editor-content sub,
.quartz-editor-content sup {
  font-size: 0.75em;
  line-height: 0;  /* Prevent line height disruption */
}

/* Inline images */
.quartz-editor-content p img {
  vertical-align: middle;
  max-height: 1.5em;
}

/* Inline math (KaTeX) */
.quartz-editor-content .katex-inline {
  padding: 0 2px;
}
```

### Files to Modify
- `src/webview/styles/editor.css` - Add inline element styles

### Key Considerations
- Inline code selector must exclude code inside `<pre>` blocks
- Sub/sup should not disrupt line height of surrounding text
- Inline images should not exceed line height
- Test with various inline element combinations

## Tests Required

### Unit Tests
- N/A (CSS-only change)

### Manual Testing
- [ ] Inline code has visible background and padding
- [ ] Inline code inside link renders correctly
- [ ] Links show underline on hover
- [ ] Subscript (H₂O) renders at correct size
- [ ] Superscript (x²) renders at correct size
- [ ] Sub/sup don't increase line height
- [ ] Inline image aligns with text

### Visual Regression
- [ ] Screenshot of paragraph with various inline elements
- [ ] Screenshot of inline code in different contexts

## Definition of Done

- [ ] All acceptance criteria met
- [ ] All inline element types styled
- [ ] No line height disruption
- [ ] Code reviewed
- [ ] No regressions
