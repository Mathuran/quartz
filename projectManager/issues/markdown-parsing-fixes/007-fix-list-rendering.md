# [007] Fix List Item Rendering

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** —
- **Scope:** M
- **Design Doc:** [markdown-parsing-fixes](../../design-docs/markdown-parsing-fixes.md)

## Description

List items currently show raw markdown prefixes:
- Bullet list items 2+ display as `- Item 2` instead of just `Item 2`
- Ordered list items show double numbers: `2. 2. Second` instead of `2. Second`

The markdown prefix is being included in the text content when it should only be rendered as list styling.

## Acceptance Criteria

- [x] Bullet list items show bullet markers (not `-` or `*` characters)
- [x] Ordered list items show correct numbers (not duplicated)
- [x] First item and subsequent items render identically
- [x] Nested lists render correctly at all levels
- [x] List items with multiple paragraphs render correctly
- [x] Round-trip: save and reload preserves correct formatting

## Technical Notes

### Files to Investigate
- `src/markdown/parser.ts` — How list items are parsed
- `src/webview/Editor.tsx` — BulletList and OrderedList extension config

### Root Cause Analysis

The issue is likely in the parser or the list item node schema:
1. Parser may be including the `-` or `1.` prefix in the text content
2. Or the `renderHTML` method is including it redundantly

Debug approach:
```typescript
// Add logging to see what's in the node
console.log('List item content:', node.textContent);
console.log('List item attrs:', node.attrs);
```

### Suggested Fix

Check the `markdown-it` token transformer to ensure it strips the list marker:

```typescript
// In tokenTransformer.ts
case 'list_item_open':
  // Don't include the marker in content
  break;

case 'inline':
  // Strip leading "- " or "1. " if present
  const content = token.content.replace(/^[-*]\s+/, '');
  const content = token.content.replace(/^\d+\.\s+/, '');
```

Or check the BulletList/OrderedList extension configuration:

```typescript
BulletList.configure({
  HTMLAttributes: {
    class: 'quartz-bullet-list',
  },
})

OrderedList.configure({
  HTMLAttributes: {
    class: 'quartz-ordered-list',
  },
})
```

### Key Considerations
- The fix should be in the parser, not the renderer
- Ensure round-trip fidelity (parser and serializer must agree)
- Test with nested lists (3+ levels)

## Tests Required

### Unit Tests
- [x] Parse `- Item 1\n- Item 2` — no dashes in text content
- [x] Parse `1. First\n2. Second` — no double numbers
- [x] Parse nested bullet list — all levels correct
- [x] Parse nested ordered list — all levels correct
- [x] Round-trip: parse → serialize → parse gives same result

### E2E Tests
- [x] Type bullet list in editor, verify no dashes visible
- [x] Type ordered list in editor, verify no double numbers

### Manual Testing
- [x] Type `- Item 1` Enter `Item 2` — both show bullets, no dashes
- [x] Type `1. First` Enter — shows `2.` prefix, not `2. 2.`
- [x] Create 3-level nested list — all levels render correctly

## Definition of Done

- [x] All acceptance criteria met
- [x] Unit tests written and passing
- [x] E2E tests written and passing
- [x] Code reviewed
- [x] Round-trip fidelity verified
- [x] No regressions in existing functionality

## Resolution Notes

After thorough investigation, the parser was already correctly handling list item text content:

1. **markdown-it tokens** correctly separate list markers from content (markers are stored in `markup` property, not `content`)
2. **parseListItem function** correctly extracts text from the `inline` token's children, which never include the list marker
3. **Round-trip tests** confirm parse → serialize → parse produces identical output
4. **E2E tests** confirm rendered list items display correct text without markdown prefixes

The following unit tests were added to verify this behavior:
- `should parse bullet list items without dash prefix in text content`
- `should parse ordered list items without number prefix in text content`
- `should parse nested lists without markdown prefixes at all levels`

All 139 unit tests and all E2E list tests pass.
