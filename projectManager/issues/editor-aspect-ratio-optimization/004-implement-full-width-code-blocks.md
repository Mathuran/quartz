# [004] Implement Full-Width Code Blocks with Horizontal Scroll

## Metadata
- **Status:** DONE
- **Depends On:** 001, 002
- **Blocks:** 007
- **Scope:** M
- **Design Doc:** [editor-aspect-ratio-optimization](../../design-docs/editor-aspect-ratio-optimization.md)

## Description

Make code blocks (fenced and indented) expand to full container width (800px) without prose margins. Implement horizontal scrolling for code that exceeds the container width. Code blocks should never wrap.

## Acceptance Criteria

- [ ] Code blocks (`<pre>`) use full 800px width (no prose margins)
- [ ] Code blocks have horizontal scroll when content exceeds width
- [ ] Code never wraps to next line (preserves formatting)
- [ ] 80-character code lines fit without scrolling (~768px)
- [ ] Line height in code blocks is √2 (1.414)
- [ ] Nested code blocks (in lists, blockquotes) inherit parent indent
- [ ] Scroll indicator appears when content overflows

## Technical Notes

### CSS Implementation

```css
/* Code blocks: full width */
.quartz-editor-content > pre {
  width: 100%;
  max-width: var(--content-width);  /* 800px */
  margin-left: 0;
  margin-right: 0;
  overflow-x: auto;                  /* Horizontal scroll */
  white-space: pre;                  /* Never wrap */
  line-height: var(--line-height-base);  /* 1.414 */
}

/* Nested code in lists/blockquotes: inherit indent */
.quartz-editor-content li pre,
.quartz-editor-content blockquote pre {
  /* Inherits parent indent, doesn't break out */
  max-width: 100%;
}
```

### Scroll Styling (optional enhancement)
```css
.quartz-editor-content pre::-webkit-scrollbar {
  height: 8px;
}

.quartz-editor-content pre::-webkit-scrollbar-thumb {
  background: var(--scrollbar-color);
  border-radius: 4px;
}
```

### Files to Modify
- `src/webview/styles/editor.css` - Add code block width and scroll styles

### Key Considerations
- Test with various code lengths (40, 80, 100, 120+ chars)
- Ensure syntax highlighting still works with new layout
- Test nested code blocks thoroughly
- Consider scroll shadow/gradient to indicate overflow

## Tests Required

### Unit Tests
- N/A (CSS-only change)

### Manual Testing
- [ ] 80-char line fits without scrolling
- [ ] 120-char line shows horizontal scroll
- [ ] Scroll works smoothly
- [ ] Code in list item respects list indent
- [ ] Code in blockquote respects blockquote indent
- [ ] Code in blockquote > list respects combined indent
- [ ] Syntax highlighting renders correctly

### Visual Regression
- [ ] Screenshot of code block at various widths
- [ ] Screenshot of scrolled code block

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Tested with various code lengths
- [ ] Nested code scenarios verified
- [ ] Scroll behavior works correctly
- [ ] Code reviewed
- [ ] No regressions in code block styling
