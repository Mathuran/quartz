# [005] Fix Link Markdown Input Rule

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** 006
- **Scope:** M
- **Design Doc:** [markdown-parsing-fixes](../../design-docs/markdown-parsing-fixes.md)

## Description

Currently, typing `[text](url)` displays as literal text instead of creating a clickable link. Add an input rule that detects markdown link syntax and converts it to a proper link mark.

## Acceptance Criteria

- [ ] Typing `[link text](https://example.com)` creates a clickable link
- [ ] Link text displays as "link text" (not the full markdown syntax)
- [ ] Clicking the link opens the URL (in default browser or VS Code handler)
- [ ] Link has correct `href` attribute matching the URL
- [ ] Works with various URL formats: http, https, relative paths, anchors
- [ ] Escaped brackets `\[` don't trigger the rule
- [ ] Empty link text `[](url)` is handled gracefully
- [ ] Empty URL `[text]()` is handled gracefully

## Technical Notes

### Files to Create
- `src/webview/extensions/linkInputRule.ts` — Input rule for markdown links

### Files to Modify
- `src/webview/Editor.tsx` — Import and register the input rule extension

### Implementation

```typescript
import { markInputRule } from '@tiptap/core';
import Link from '@tiptap/extension-link';

// Regex for markdown link syntax: [text](url)
const linkRegex = /\[([^\]]+)\]\(([^)]+)\)$/;

export const linkInputRule = markInputRule({
  find: linkRegex,
  type: Link.name,
  getAttributes: (match) => ({
    href: match[2],
  }),
});

// Or create as extension
export const MarkdownLinkExtension = Extension.create({
  name: 'markdownLink',

  addInputRules() {
    return [
      new InputRule({
        find: linkRegex,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const linkText = match[1];
          const href = match[2];

          // Delete the markdown syntax
          tr.delete(range.from, range.to);

          // Insert link text with link mark
          const linkMark = state.schema.marks.link.create({ href });
          tr.insert(range.from, state.schema.text(linkText, [linkMark]));

          return tr;
        },
      }),
    ];
  },
});
```

### Key Considerations
- The input rule should trigger when the closing `)` is typed
- Validate URLs to prevent `javascript:` injection
- Handle edge cases: nested brackets, escaped characters
- Link mark must match TipTap's Link extension schema

### URL Validation

```typescript
const isValidUrl = (url: string): boolean => {
  // Block javascript: protocol
  if (url.toLowerCase().startsWith('javascript:')) return false;

  // Allow http, https, mailto, tel, relative paths
  return true;
};
```

## Tests Required

### Unit Tests
- [ ] `[text](https://example.com)` creates link with correct href
- [ ] `[text](http://example.com)` works with http
- [ ] `[text](/relative/path)` works with relative paths
- [ ] `[text](#anchor)` works with anchors
- [ ] `[text](mailto:test@example.com)` works with mailto
- [ ] `\[text\](url)` with escaped brackets doesn't create link
- [ ] `[](url)` handles empty text gracefully
- [ ] `[text]()` handles empty URL gracefully
- [ ] `[text](javascript:alert(1))` is blocked

### E2E Tests
- [ ] Type link syntax in editor, verify it becomes clickable

### Manual Testing
- [ ] Type `[Google](https://google.com)` — becomes clickable link
- [ ] Click link — opens URL
- [ ] Hover link — shows URL tooltip (if configured)

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Code reviewed
- [ ] No security vulnerabilities (XSS via javascript: URLs)
- [ ] No regressions in existing functionality
