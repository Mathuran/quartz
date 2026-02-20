# [008] Implement √2-Based List and Blockquote Indentation

## Metadata
- **Status:** DONE
- **Depends On:** 001, 007
- **Blocks:** 009
- **Scope:** S
- **Design Doc:** [editor-aspect-ratio-optimization](../../design-docs/editor-aspect-ratio-optimization.md)

## Description

Apply √2-based indentation to lists and blockquotes. Each nesting level adds 23px (--space-sm) indent. This creates consistent visual hierarchy using the √2 scale.

## Acceptance Criteria

- [ ] Unordered lists have 23px left padding
- [ ] Ordered lists have 32px left padding (extra for numbers)
- [ ] Nested lists add 23px per level
- [ ] Blockquotes have 23px left padding + 4px border
- [ ] Nested blockquotes add 23px per level
- [ ] Code blocks inside lists/blockquotes inherit indent
- [ ] Maximum 3 nesting levels render correctly
- [ ] All indentation uses CSS variables

## Technical Notes

### CSS Implementation

```css
/* Lists */
.quartz-editor-content > ul {
  padding-left: var(--space-sm);    /* 23px */
}

.quartz-editor-content > ol {
  padding-left: var(--space-md);    /* 32px - more room for numbers */
}

/* Nested lists: √2 step per level */
.quartz-editor-content li > ul,
.quartz-editor-content li > ol {
  padding-left: var(--space-sm);    /* 23px */
  margin-top: var(--space-4xs);
  margin-bottom: var(--space-4xs);
}

/* Blockquotes */
.quartz-editor-content > blockquote {
  padding-left: var(--space-sm);    /* 23px */
  border-left: var(--space-4xs) solid var(--border-color);  /* 4px */
}

/* Nested blockquotes */
.quartz-editor-content blockquote blockquote {
  margin-left: 0;  /* Padding handles indent */
}

/* Code in lists inherits indent */
.quartz-editor-content li pre {
  max-width: 100%;  /* Respect container */
}
```

### Files to Modify
- `src/webview/styles/editor.css` - Add indentation rules

### Key Considerations
- Ordered lists need more padding for multi-digit numbers
- Blockquote border width is 4px (--space-4xs)
- Deeply nested content may become too narrow - test edge cases
- Task lists should follow same indentation as unordered lists

## Tests Required

### Unit Tests
- N/A (CSS-only change)

### Manual Testing
- [ ] Single-level unordered list properly indented
- [ ] Single-level ordered list properly indented
- [ ] 2-level nested list shows clear hierarchy
- [ ] 3-level nested list renders correctly
- [ ] Blockquote has left border and padding
- [ ] Nested blockquote indents further
- [ ] Code inside list item is properly indented
- [ ] Code inside blockquote is properly indented

### Visual Regression
- [ ] Screenshot of nested list (3 levels)
- [ ] Screenshot of nested blockquotes
- [ ] Screenshot of code inside list

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Nested content renders correctly
- [ ] Visual hierarchy is clear
- [ ] Code reviewed
- [ ] No regressions in list/blockquote styling
