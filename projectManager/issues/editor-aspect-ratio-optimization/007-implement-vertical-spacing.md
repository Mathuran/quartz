# [007] Implement √2-Based Vertical Spacing

## Metadata
- **Status:** DONE
- **Depends On:** 001, 003, 004, 005, 006
- **Blocks:** 008
- **Scope:** M
- **Design Doc:** [editor-aspect-ratio-optimization](../../design-docs/editor-aspect-ratio-optimization.md)

## Description

Apply the √2-based vertical spacing scale to all block elements. This creates consistent vertical rhythm using the geometric progression defined in issue 001.

Headings use decreasing top margins (H1=45px, H2=32px, H3=23px, etc.) while other elements use the base spacing unit.

## Acceptance Criteria

- [ ] H1: 45px top margin, 16px bottom margin
- [ ] H2: 32px top margin, 11px bottom margin
- [ ] H3: 23px top margin, 8px bottom margin
- [ ] H4: 16px top margin, 6px bottom margin
- [ ] H5/H6: 11px top margin, 4px bottom margin
- [ ] Paragraphs: 0 top margin, 16px bottom margin
- [ ] Code blocks: 16px top and bottom margin
- [ ] Tables: 16px top and bottom margin
- [ ] Lists: 8px top and bottom margin
- [ ] List items: 4px bottom margin
- [ ] Blockquotes: 16px top and bottom margin
- [ ] HR: 23px top and bottom margin
- [ ] First child has no top margin
- [ ] Last child has no bottom margin
- [ ] All spacing uses CSS variables

## Technical Notes

### CSS Implementation

```css
/* Paragraphs */
.quartz-editor-content > p {
  margin-top: 0;
  margin-bottom: var(--space-base);  /* 16px */
  line-height: var(--line-height-base);  /* 1.414 */
}

/* Headings - decreasing √2 scale */
.quartz-editor-content > h1 {
  margin-top: var(--space-lg);      /* 45px */
  margin-bottom: var(--space-base); /* 16px */
  line-height: var(--line-height-tight);
}

.quartz-editor-content > h2 {
  margin-top: var(--space-md);      /* 32px */
  margin-bottom: var(--space-xs);   /* 11px */
  line-height: var(--line-height-tight);
}

.quartz-editor-content > h3 {
  margin-top: var(--space-sm);      /* 23px */
  margin-bottom: var(--space-2xs);  /* 8px */
  line-height: var(--line-height-tight);
}

.quartz-editor-content > h4 {
  margin-top: var(--space-base);    /* 16px */
  margin-bottom: var(--space-3xs);  /* 6px */
}

.quartz-editor-content > h5,
.quartz-editor-content > h6 {
  margin-top: var(--space-xs);      /* 11px */
  margin-bottom: var(--space-4xs);  /* 4px */
}

/* Code, tables, diagrams */
.quartz-editor-content > pre,
.quartz-editor-content > table,
.quartz-editor-content > .mermaid {
  margin-top: var(--space-base);    /* 16px */
  margin-bottom: var(--space-base); /* 16px */
}

/* Lists */
.quartz-editor-content > ul,
.quartz-editor-content > ol {
  margin-top: var(--space-2xs);     /* 8px */
  margin-bottom: var(--space-2xs);  /* 8px */
}

.quartz-editor-content li {
  margin-bottom: var(--space-4xs);  /* 4px */
}

/* Blockquotes */
.quartz-editor-content > blockquote {
  margin-top: var(--space-base);
  margin-bottom: var(--space-base);
}

/* Horizontal rule */
.quartz-editor-content > hr {
  margin-top: var(--space-sm);      /* 23px */
  margin-bottom: var(--space-sm);   /* 23px */
}

/* First/last normalization */
.quartz-editor-content > *:first-child {
  margin-top: 0;
}

.quartz-editor-content > *:last-child {
  margin-bottom: 0;
}
```

### Files to Modify
- `src/webview/styles/editor.css` - Add vertical spacing rules

### Key Considerations
- Heading spacing creates visual hierarchy (bigger = more space above)
- Bottom margins decrease with heading level to keep heading close to content
- First/last child rules prevent double spacing at document edges
- Line height of 1.414 (√2) applies to all content

## Tests Required

### Unit Tests
- N/A (CSS-only change)

### Manual Testing
- [ ] Visual check of heading hierarchy (H1 has most space, H6 least)
- [ ] Paragraph spacing is consistent
- [ ] List items have tight spacing
- [ ] Code blocks have breathing room
- [ ] HR creates clear section break
- [ ] No double spacing at document start/end

### Visual Regression
- [ ] Screenshot of document with all heading levels
- [ ] Screenshot of mixed content (prose, code, lists)
- [ ] Compare vertical rhythm before/after

## Definition of Done

- [ ] All acceptance criteria met
- [ ] All element types have correct vertical spacing
- [ ] First/last child rules working
- [ ] Line height applied correctly
- [ ] Visual verification complete
- [ ] Code reviewed
