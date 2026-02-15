# [010] Fix Combined Bold+Italic Formatting

## Metadata
- **Status:** TODO
- **Depends On:** —
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [markdown-parsing-fixes](../../design-docs/markdown-parsing-fixes.md)

## Description

The syntax `***bold and italic***` displays literally with asterisks visible instead of rendering as bold+italic text. Need to add an input rule that detects this pattern and applies both marks.

## Acceptance Criteria

- [ ] `***text***` renders as bold and italic (no visible asterisks)
- [ ] `___text___` also works (underscore variant)
- [ ] Input rule triggers on typing the closing `***`
- [ ] Order of marks doesn't matter (bold+italic or italic+bold)
- [ ] Partial combinations still work: `**bold**`, `*italic*`
- [ ] Nested combinations work: `***bold** italic*` (edge case)

## Technical Notes

### Files to Modify
- `src/webview/extensions/keyboardShortcuts.ts` or create new extension

### Implementation

The key is to detect `***` before detecting `**` or `*`. Input rules are processed in order, so the combined rule must come first:

```typescript
import { markInputRule } from '@tiptap/core';

// Combined bold+italic — must be before individual rules
const boldItalicInputRule = new InputRule({
  find: /(?:^|\s)\*\*\*([^*]+)\*\*\*$/,
  handler: ({ state, range, match }) => {
    const { tr } = state;
    const text = match[1];
    const boldMark = state.schema.marks.bold.create();
    const italicMark = state.schema.marks.italic.create();

    tr.delete(range.from, range.to);
    tr.insert(range.from, state.schema.text(text, [boldMark, italicMark]));

    return tr;
  },
});

// Underscore variant
const boldItalicUnderscoreInputRule = new InputRule({
  find: /(?:^|\s)___([^_]+)___$/,
  handler: ({ state, range, match }) => {
    // Same as above
  },
});
```

### Order of Input Rules

Ensure input rules are registered in this order:
1. `***text***` (bold+italic)
2. `**text**` (bold)
3. `*text*` (italic)

If individual rules come first, they'll consume the first `**` and leave `*text*`.

### Key Considerations
- Check how existing Bold and Italic extensions register their input rules
- May need to modify extension loading order
- Test that individual bold/italic still work after this change

## Tests Required

### Unit Tests
- [ ] `***text***` applies both bold and italic marks
- [ ] `___text___` applies both bold and italic marks
- [ ] `**text**` still works (just bold)
- [ ] `*text*` still works (just italic)
- [ ] `***` at start of line works
- [ ] `***` mid-sentence works

### E2E Tests
- [ ] Type `***bold italic***` — renders with both styles

### Manual Testing
- [ ] Type `***hello***` — text is bold AND italic
- [ ] Type `**bold**` — still just bold
- [ ] Type `*italic*` — still just italic

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Code reviewed
- [ ] No regressions to individual bold/italic
- [ ] No regressions in existing functionality
