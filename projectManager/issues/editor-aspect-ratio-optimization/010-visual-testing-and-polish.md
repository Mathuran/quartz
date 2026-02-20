# [010] Visual Testing and Polish

## Metadata
- **Status:** TODO
- **Depends On:** 003, 004, 005, 006, 007, 008, 009
- **Blocks:** -
- **Scope:** M
- **Design Doc:** [editor-aspect-ratio-optimization](../../design-docs/editor-aspect-ratio-optimization.md)

## Description

Comprehensive visual testing of the √2 layout system across all markdown elements and edge cases. Fix any visual inconsistencies, adjust spacing where needed, and ensure the system works cohesively.

## Acceptance Criteria

- [ ] All markdown elements render correctly with new spacing
- [ ] No visual regressions from previous layout
- [ ] Edge cases handled (deeply nested content, long code, wide tables)
- [ ] Responsive behavior works (fluid mode <600px)
- [ ] Horizontal scroll indicators visible when needed
- [ ] Visual hierarchy is clear (headings, sections, content)
- [ ] Line length is ~83 mono chars for code, ~100 chars for prose
- [ ] √2 proportions create harmonious visual rhythm

## Technical Notes

### Test Document Template

Create a comprehensive test document containing:
```markdown
# H1 Heading (45px top margin)

Paragraph text for testing prose width (704px).

## H2 Heading (32px top margin)

### H3 Heading (23px top margin)

- List item 1
- List item 2
  - Nested item (23px additional indent)
    - Deeply nested

1. Ordered item
2. Another item

> Blockquote with 23px padding
> > Nested blockquote

\`\`\`javascript
// 80 character line for testing:
const example = "12345678901234567890123456789012345678901234567890123456789012345678";
\`\`\`

| Col1 | Col2 | Col3 | Col4 | Col5 | Col6 |
|------|------|------|------|------|------|
| data | data | data | data | data | data |

---

Inline elements: `code`, **bold**, *italic*, [link](#), H~2~O, x^2^
```

### Viewport Tests
- 1280px (laptop)
- 1920px (desktop)
- 2560px (ultrawide)
- 800px (narrow, should trigger fluid mode check)
- 500px (should be fluid mode)

### Files to Modify
- `src/webview/styles/editor.css` - Any final adjustments

### Key Considerations
- Compare screenshots before/after for each element type
- Check for off-by-one-pixel issues
- Ensure scroll shadows/indicators are visible
- Test with both light and dark themes

## Tests Required

### Manual Testing Checklist

**Prose Elements:**
- [ ] Paragraph text at correct width (704px)
- [ ] All 6 heading levels have correct spacing
- [ ] Line height is 1.414

**Full-Width Elements:**
- [ ] Code blocks at full width (800px)
- [ ] Tables at full width with scroll
- [ ] Mermaid diagrams at full width
- [ ] Horizontal rule at full width
- [ ] Images centered if smaller than 800px

**Lists:**
- [ ] UL/OL at prose width + indent
- [ ] Nested lists indent correctly
- [ ] Task lists work correctly
- [ ] Code inside list inherits indent

**Blockquotes:**
- [ ] Blockquote has border and padding
- [ ] Nested blockquotes work
- [ ] Code inside blockquote works

**Overflow:**
- [ ] 120-char code line scrolls
- [ ] 8-column table scrolls
- [ ] Complex Mermaid diagram scrolls

**Edge Cases:**
- [ ] First element has no top margin
- [ ] Last element has no bottom margin
- [ ] Empty document renders correctly
- [ ] Single paragraph renders correctly

### Visual Regression
- [ ] Full document screenshot comparison
- [ ] Mobile/narrow viewport screenshot

## Definition of Done

- [ ] All acceptance criteria met
- [ ] All manual testing checklist items verified
- [ ] Visual comparison with old layout documented
- [ ] Any edge case fixes applied
- [ ] Code reviewed
- [ ] Ready for release
