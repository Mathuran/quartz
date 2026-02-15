# [012] Improve Undo/Redo Granularity

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** —
- **Scope:** XS
- **Design Doc:** [markdown-parsing-fixes](../../design-docs/markdown-parsing-fixes.md)

## Description

Undo (Cmd+Z) currently removes entire large blocks of content at once, making it dangerous to use. Users can lose significant work with a single undo. Configure TipTap's history extension for finer granularity.

## Acceptance Criteria

- [ ] Each undo step removes at most ~1 word of content
- [ ] Rapid typing is grouped together (not character-by-character)
- [ ] Pause of 150ms+ creates a new undo group
- [ ] Redo correctly restores undone content
- [ ] Block-level operations (delete block) are still atomic undos

## Technical Notes

### Files to Modify
- `src/webview/Editor.tsx` — Configure History extension

### Implementation

TipTap uses ProseMirror's history plugin. Configure `newGroupDelay`:

```typescript
import History from '@tiptap/extension-history';

// In extensions array:
History.configure({
  newGroupDelay: 150, // Group changes within 150ms (default is 500ms)
}),
```

Lower `newGroupDelay` = finer undo granularity:
- `500ms` (default): Coarse, groups lots of typing together
- `150ms`: Medium, groups rapid typing but separates words
- `50ms`: Fine, nearly character-by-character

### Alternative: depth option

Can also limit undo stack depth:
```typescript
History.configure({
  depth: 100, // Maximum undo steps
  newGroupDelay: 150,
}),
```

### Key Considerations
- Too fine granularity (10ms) makes undo tedious
- 150ms is a good balance — roughly word-level
- Don't break existing undo behavior for block operations
- Test that Cmd+Shift+Z (redo) still works

## Tests Required

### Unit Tests
- [ ] Typing "hello" then waiting 200ms then "world" = 2 undo groups
- [ ] Rapid typing "helloworld" = 1 undo group
- [ ] Undo after pause removes last typed segment
- [ ] Redo restores the segment

### E2E Tests
- [ ] Type, pause, type more, undo — removes only recent text

### Manual Testing
- [ ] Type a word, wait a moment, type another word
- [ ] Press Cmd+Z — only second word removed
- [ ] Press Cmd+Z again — first word removed
- [ ] Press Cmd+Shift+Z — restores first word

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Manual testing confirms better granularity
- [ ] Code reviewed
- [ ] No regressions in existing functionality
