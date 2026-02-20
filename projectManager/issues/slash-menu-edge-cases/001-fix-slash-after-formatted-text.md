# [001] Fix Slash Menu After Formatted Text

## Metadata
- **Status:** DONE
- **Depends On:** None
- **Blocks:** None
- **Scope:** S
- **Design Doc:** [slash-menu-edge-cases](../../design-docs/slash-menu-edge-cases.md)

## Description

The slash command menu fails to open when typing `/` after inline formatted text (bold, italic, code). Following Notion's behavior, the slash menu should require a space before the `/` trigger. This also prevents accidental triggers in URLs like `https://`.

## Acceptance Criteria

- [ ] `**bold** /` opens slash menu (space before slash)
- [ ] `*italic* /` opens slash menu (space before slash)
- [ ] `**bold**/` does NOT open slash menu (no space before slash)
- [ ] `/` at start of empty line opens slash menu
- [ ] `/` in code block does NOT open slash menu
- [ ] `https://example.com` does NOT trigger slash menu

## Human Review Focus

- **Look at:** The `allow` function configuration in slash command extension
- **Test:** Type `**bold** /` - verify menu appears; type `**bold**/` - verify no menu
- **Decide:** Does the behavior match Notion's?

## Agent Autonomy Notes

- **Agent can decide:** Implementation details for text-before detection
- **Escalate to human:** If the behavior differs from Notion in edge cases

## Technical Notes

### Suggested Approach
1. Open `src/webview/extensions/slashCommandExtension.ts`
2. Add/update the `allow` function in the Suggestion configuration
3. Check for space or start-of-block before the slash character
4. Explicitly block code blocks

```typescript
allow: ({ state, range }) => {
  const { $from } = state.selection;

  // Don't allow in code blocks
  if ($from.parent.type.name === 'codeBlock') {
    return false;
  }

  // Require space or start-of-block before slash
  const textBefore = $from.parent.textContent.slice(0, $from.parentOffset - 1);
  const charBefore = textBefore.slice(-1);

  return textBefore.length === 0 || charBefore === ' ' || charBefore === '\t';
},
```

### Files to Modify
- `src/webview/extensions/slashCommandExtension.ts` - Update Suggestion config

### Key Considerations
- This matches Notion's behavior (user expectation)
- Prevents accidental triggers in URLs
- Start of block (`textBefore.length === 0`) should always allow trigger

## Tests Required

### Unit Tests
- N/A - behavior best tested via e2e

### E2E Tests
- [ ] Slash menu opens after `**bold** /`
- [ ] Slash menu opens after `*italic* /`
- [ ] Slash menu does NOT open after `**bold**/` (no space)
- [ ] Slash menu opens at start of empty line
- [ ] Slash menu does NOT open in code block

### Manual Testing
- [ ] Type `**bold** /` - menu should appear
- [ ] Type `text /` - menu should appear
- [ ] Type `word/` - menu should NOT appear
- [ ] Type `/` on empty line - menu should appear

## Definition of Done

- [ ] All acceptance criteria met
- [ ] E2E tests written and passing
- [ ] Human review completed
- [ ] No regressions in existing slash menu functionality
