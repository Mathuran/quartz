# [006] Implement Full-Width Mermaid Diagrams with Horizontal Scroll

## Metadata
- **Status:** DONE
- **Depends On:** 001, 002
- **Blocks:** 007
- **Scope:** S
- **Design Doc:** [editor-aspect-ratio-optimization](../../design-docs/editor-aspect-ratio-optimization.md)

## Description

Make Mermaid diagram containers expand to full container width (800px) without prose margins. Implement horizontal scrolling for diagrams that exceed the container width.

## Acceptance Criteria

- [ ] Mermaid containers use full 800px width (no prose margins)
- [ ] Diagrams have horizontal scroll when content exceeds width
- [ ] Simple flowcharts (3-5 nodes) fit without scrolling
- [ ] Complex diagrams (10+ nodes) scroll smoothly
- [ ] Sequence diagrams with 4+ participants scroll if needed
- [ ] Diagram quality/rendering not affected

## Technical Notes

### CSS Implementation

```css
/* Mermaid diagrams: full width with scroll */
.quartz-editor-content > .mermaid,
.quartz-editor-content > pre.mermaid {
  width: 100%;
  max-width: var(--content-width);  /* 800px */
  margin-left: 0;
  margin-right: 0;
  overflow-x: auto;
}

/* Ensure SVG doesn't shrink */
.quartz-editor-content .mermaid svg {
  max-width: none;  /* Allow natural width */
}
```

### Files to Modify
- `src/webview/styles/editor.css` - Add mermaid container styles
- Verify mermaid extension/component class names

### Key Considerations
- Mermaid renders SVG which has intrinsic dimensions
- May need to prevent SVG from being constrained
- Test various diagram types: flowchart, sequence, class, ER, gantt
- Check if there's a mermaid wrapper component that needs updating

## Tests Required

### Unit Tests
- N/A (CSS-only change)

### Manual Testing
- [ ] Simple flowchart (3 nodes) renders centered
- [ ] Complex flowchart (10+ nodes) shows horizontal scroll
- [ ] Sequence diagram (4 participants) fits
- [ ] Sequence diagram (6+ participants) scrolls
- [ ] Class diagram renders correctly
- [ ] Scroll works smoothly

### Visual Regression
- [ ] Screenshot of simple flowchart
- [ ] Screenshot of complex diagram with scroll
- [ ] Screenshot of sequence diagram

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Tested with various diagram types
- [ ] Scroll behavior works correctly
- [ ] Code reviewed
- [ ] No regressions in mermaid rendering
