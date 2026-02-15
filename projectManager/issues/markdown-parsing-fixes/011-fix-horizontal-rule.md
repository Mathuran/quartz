# [011] Fix Horizontal Rule Rendering

## Metadata
- **Status:** TODO
- **Depends On:** —
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [markdown-parsing-fixes](../../design-docs/markdown-parsing-fixes.md)

## Description

Neither `---`, `***`, nor `___` syntax creates visible horizontal rules. They either disappear or get absorbed into adjacent elements. Need to verify the HorizontalRule extension is loaded and add proper input rules.

## Acceptance Criteria

- [ ] `---` on its own line creates a horizontal rule
- [ ] `***` on its own line creates a horizontal rule
- [ ] `___` on its own line creates a horizontal rule
- [ ] Rule triggers after pressing Enter (newline after the dashes)
- [ ] Horizontal rule is visually visible as a line
- [ ] Content after horizontal rule renders normally
- [ ] At least 3 characters required (`--` should not trigger)

## Technical Notes

### Files to Investigate
- `src/webview/Editor.tsx` — Is HorizontalRule extension loaded?
- Check if TipTap's default input rules are active

### Suggested Approach

1. First verify HorizontalRule extension is imported and added:

```typescript
import HorizontalRule from '@tiptap/extension-horizontal-rule';

// In extensions array:
HorizontalRule.configure({
  HTMLAttributes: {
    class: 'quartz-hr',
  },
}),
```

2. If extension is loaded but input rules aren't working, add custom rules:

```typescript
const hrInputRule = new InputRule({
  find: /^(?:---|\*\*\*|___)$/,
  handler: ({ state, range }) => {
    const { tr } = state;
    tr.delete(range.from, range.to);
    tr.replaceWith(range.from, range.from, state.schema.nodes.horizontalRule.create());
    return tr;
  },
});
```

3. Add CSS for visibility:

```css
.quartz-hr {
  border: none;
  border-top: 1px solid var(--quartz-border);
  margin: 1em 0;
}
```

### Key Considerations
- The rule should trigger on Enter after typing `---`
- Don't trigger on `---` mid-paragraph (only at start of line)
- Ensure HR has proper spacing (margin above and below)
- `---` could also be an em-dash pattern — check for conflicts

## Tests Required

### Unit Tests
- [ ] `---` followed by Enter creates horizontalRule node
- [ ] `***` followed by Enter creates horizontalRule node
- [ ] `___` followed by Enter creates horizontalRule node
- [ ] `--` (only 2) does NOT create horizontal rule
- [ ] `--- text` does NOT create horizontal rule (not alone on line)

### E2E Tests
- [ ] Type `---` and press Enter — horizontal rule appears

### Manual Testing
- [ ] Type `---` Enter — visible horizontal line appears
- [ ] Type `***` Enter — same
- [ ] Type `___` Enter — same
- [ ] Type paragraph after HR — renders normally

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
