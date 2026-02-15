# [008] Fix Code Block Closure

## Metadata
- **Status:** TODO
- **Depends On:** —
- **Blocks:** —
- **Scope:** M
- **Design Doc:** [markdown-parsing-fixes](../../design-docs/markdown-parsing-fixes.md)

## Description

When typing multiple code blocks with language specifiers, the closing backticks and subsequent content get absorbed into the code block, breaking the document structure. For example:

```
```javascript
console.log('hello');
```

This paragraph should be outside the code block.
```

The ``` and "This paragraph..." end up inside the code block as literal text.

## Acceptance Criteria

- [ ] Typing ``` on its own line exits the code block
- [ ] Content after the closing ``` renders as normal content
- [ ] Multiple code blocks in a document render independently
- [ ] Language specifier (```javascript) is handled correctly on opening
- [ ] Code blocks with no language specifier work correctly
- [ ] Nested backticks inside code (e.g., showing markdown) don't cause issues

## Technical Notes

### Files to Investigate
- `src/webview/Editor.tsx` — CodeBlock extension configuration
- `src/markdown/parser.ts` — How code blocks are parsed from markdown

### Root Cause Analysis

TipTap's CodeBlock extension has input rules for entering code blocks but the exit behavior may be broken. Check:

1. Is there an input rule to exit on ```?
2. Is the parser correctly detecting fenced code block boundaries?
3. Is there a keyboard handler for exiting code blocks?

### Suggested Fix

Add an input rule or keyboard handler for exiting code blocks:

```typescript
// Option 1: Input rule
const exitCodeBlockRule = new InputRule({
  find: /^```$/,
  handler: ({ state, range }) => {
    // If inside code block, exit it
    const { $from } = state.selection;
    if ($from.parent.type.name === 'codeBlock') {
      // Delete the ``` and exit the block
      return state.tr
        .delete(range.from, range.to)
        .setBlockType($from.before(), $from.after(), state.schema.nodes.paragraph);
    }
    return null;
  },
});

// Option 2: Keyboard shortcut
'Mod-Enter': () => {
  if (editor.isActive('codeBlock')) {
    return editor.commands.exitCode();
  }
  return false;
},
```

### Key Considerations
- The fix should match user expectations (typing ``` should close)
- Need to handle edge cases: ``` with trailing spaces, ``` mid-line
- `exitCode()` command should create a new paragraph after the block
- Ensure parser handles closing fence even without trailing newline

## Tests Required

### Unit Tests
- [ ] Typing ``` on empty line in code block exits the block
- [ ] Content after ``` is outside the code block
- [ ] Multiple code blocks parse as separate blocks
- [ ] Code block with language: ```js ... ``` works
- [ ] Code block without language: ``` ... ``` works

### E2E Tests
- [ ] Type code block with content, close with ```, type more — new content outside block

### Manual Testing
- [ ] Type ```js Enter `console.log('hi')` Enter ``` — code block closes
- [ ] Type a paragraph after — renders normally
- [ ] Create 3 code blocks — all render independently

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
