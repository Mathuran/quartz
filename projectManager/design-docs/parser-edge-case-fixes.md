# Parser Edge Case Fixes Design Document

**Author:** Claude
**Status:** COMPLETED
**Created:** 2026-02-20
**Last Updated:** 2026-02-20
**Reviewers:** TBD

---

## 1. Problem Statement

The Quartz markdown parser fails to correctly handle several edge cases that users encounter in real-world markdown documents. Specifically:

1. **Images with empty or special-character alt text** do not render in the editor
2. **Links with special characters in URLs** (query params, anchors) fail to display
3. **Nested blockquotes (3+ levels)** do not render correctly
4. **Task lists with capital 'X'** (`[X]` vs `[x]`) are not recognized as checked
5. **Lists inside blockquotes** fail to parse correctly
6. **Blockquotes immediately after paragraphs** (no blank line) are not detected

These issues cause content loss when users open existing markdown files, leading to confusion and distrust in the editor. Users may unknowingly save files with missing content.

---

## 2. Goals and Non-Goals

### Goals

- **P0:** Images with empty alt text (`![]()`) render correctly in the editor
- **P0:** Links with query parameters and anchors render as clickable links
- **P0:** Task lists recognize both `[x]` and `[X]` as checked items
- **P1:** Nested blockquotes up to 4 levels deep render with proper visual hierarchy
- **P1:** Lists inside blockquotes parse and display correctly
- **P2:** Document that blockquotes require preceding blank line per CommonMark spec (not a bug)

### Non-Goals

- Supporting non-CommonMark markdown extensions (e.g., Obsidian-specific syntax)
- Improving parser performance (separate optimization effort)
- Adding new markdown features beyond fixing existing parsing bugs
- Handling malformed markdown gracefully (edge case of edge cases)

---

## 3. Background and Context

### Current Implementation

The Quartz parser uses `markdown-it` configured with CommonMark mode plus GFM extensions for strikethrough and tables. The parsed tokens are transformed into TipTap-compatible JSONContent structures.

### Root Causes Identified

1. **Image parsing:** The parser extracts `src` and `alt` from image tokens but may fail when alt is empty or contains special characters that need escaping
2. **Link URL handling:** URLs with `?`, `&`, `#` characters may be truncated or malformed during token extraction
3. **Nested blockquotes:** The recursive `parseBlockquote` function has depth tracking issues beyond 2 levels
4. **Task list detection:** The regex `/^\[[ xX]\]\s/` exists but `[X]` handling may fail in `convertToTaskItem`
5. **List in blockquote:** markdown-it may produce nested tokens that the walker doesn't handle

### Related Files

- `src/markdown/parser.ts` - Main parser implementation
- `src/markdown/serializer.ts` - Serializes back to markdown
- `test/unit/parser-edge-cases.test.ts` - Existing edge case tests

---

## 4. Proposed Solution

### Overview

Fix each parsing edge case by updating the token-to-node transformation logic in `parser.ts`. Each fix is isolated and can be tested independently. The approach prioritizes correctness over cleverness - explicit handling for each edge case rather than trying to generalize.

### Detailed Fixes

#### Fix 1: Images with Empty/Special Alt Text

```typescript
// Current (problematic)
case 'image': {
  const src = token.attrGet('src') || '';
  const alt = token.attrGet('alt') || token.content || '';
  // ...
}

// Fixed
case 'image': {
  const src = token.attrGet('src') || '';
  const alt = token.attrGet('alt') ?? token.content ?? '';
  // Ensure empty string is preserved, not converted to undefined
  result.push({
    type: 'image',
    attrs: { src, alt: alt || '' }, // Explicitly set empty string
  });
  break;
}
```

#### Fix 2: Links with Special Characters

The issue is likely in how `href` is extracted. URLs should be preserved exactly as parsed by markdown-it:

```typescript
case 'link_open': {
  const href = token.attrGet('href') || '';
  // Don't decode/encode - preserve original URL
  markStack.push({ type: 'link', attrs: { href } });
  break;
}
```

#### Fix 3: Task List Capital X Detection

Update the regex and conversion logic:

```typescript
function isTaskItem(listItem: JSONContent): boolean {
  // ... existing code ...
  return /^\[[ xX]\]\s/.test(firstText.text || '');
}

function convertToTaskItem(listItem: JSONContent): JSONContent {
  // ...
  const match = firstText.text.match(/^\[([xX ])\]\s(.*)/);
  if (match) {
    const checked = match[1].toLowerCase() === 'x'; // Handle both x and X
    // ...
  }
}
```

#### Fix 4: Nested Blockquotes

Refactor `parseBlockquote` to properly track and handle depth > 2:

```typescript
function parseBlockquote(
  tokens: MarkdownIt.Token[],
  startIndex: number
): { nodes: JSONContent[]; endIndex: number } {
  // Use explicit recursion with proper index tracking
  // Handle nested blockquote_open by recursing immediately
}
```

#### Fix 5: Lists Inside Blockquotes

Add list handling inside the blockquote parser:

```typescript
// Inside parseBlockquote, at depth === 1:
if (token.type === 'bullet_list_open') {
  const listItems = parseListItems(tokens, i + 1, 'bullet_list_close');
  nodes.push({
    type: 'bulletList',
    content: listItems.items,
  });
  i = listItems.endIndex + 1;
  continue;
}
```

#### Fix 6: Blockquotes Without Blank Line

This may require markdown-it configuration or accepting the CommonMark behavior (blank line required). If CommonMark requires blank lines, document this as expected behavior.

### Architecture

No architectural changes. All fixes are localized to `parser.ts` token handling.

---

## 5. Alternative Solutions Considered

### Alternative 1: Replace markdown-it with unified/remark

**Pros:**
- Remark has better AST manipulation capabilities
- More actively maintained ecosystem

**Cons:**
- Significant migration effort
- Different token format requires rewriting entire parser
- Bundle size increase

**Decision:** Rejected - too much effort for the scope of these fixes

### Alternative 2: Pre-process markdown before parsing

**Pros:**
- Could normalize edge cases before parsing
- Wouldn't require understanding markdown-it internals

**Cons:**
- Adds complexity and potential for new bugs
- Makes debugging harder
- Performance overhead

**Decision:** Rejected - better to fix root cause

---

## 6. Security, Privacy, and Compliance

### Security Considerations

- **XSS via URLs:** Ensure link `href` values are not executed as JavaScript. The TipTap Link extension already handles this by setting `rel="noopener noreferrer"` and not allowing `javascript:` URLs.
- **Image src handling:** External images are loaded by the browser; no additional security concerns beyond standard browser behavior.

### Privacy

- No PII is processed by the parser
- All parsing happens client-side in the VS Code extension

### Compliance

- No compliance implications for this change

---

## 7. Testing Strategy

### Unit Tests

Add new test cases to `test/unit/parser-edge-cases.test.ts`:

```typescript
it('should parse image with empty alt text', () => {
  const result = parseMarkdown('![](https://example.com/image.png)');
  const image = result.content![0].content![0];
  expect(image.type).toBe('image');
  expect(image.attrs?.alt).toBe('');
});

it('should parse link with query params and anchor', () => {
  const result = parseMarkdown('[link](https://example.com?a=1&b=2#section)');
  const linkNode = result.content![0].content![0];
  const linkMark = linkNode.marks![0];
  expect(linkMark.attrs!.href).toBe('https://example.com?a=1&b=2#section');
});

it('should parse task item with capital X as checked', () => {
  const result = parseMarkdown('- [X] Done task');
  const taskItem = result.content![0].content![0];
  expect(taskItem.type).toBe('taskItem');
  expect(taskItem.attrs?.checked).toBe(true);
});

// ... additional tests for each fix
```

### Integration Tests

- Roundtrip tests ensuring parse -> serialize -> parse produces identical structure
- Test with real-world markdown files from various sources

### E2E Tests

The following failing tests should pass after fixes:
- `image with empty alt text renders`
- `image with special characters in alt text`
- `link with special characters in URL`
- `task list mixed with regular list items`
- `deeply nested blockquotes (3 levels) render correctly`
- `list inside blockquote renders correctly`

---

## 8. Rollout Plan

### Phase 1: Image and Link Fixes (P0)

- **Agent delivers:** Fixed image/link parsing, 10+ new unit tests passing
- **Human reviews:** Test coverage, visual rendering in editor
- **Approved when:** All P0 e2e tests pass, manual verification of 5 sample documents

### Phase 2: Task List and Blockquote Fixes (P1)

- **Agent delivers:** Task list capital X support, nested blockquotes, list-in-blockquote
- **Human reviews:** Edge case handling, roundtrip integrity
- **Approved when:** All P1 e2e tests pass, no regressions in existing tests

### Phase 3: Documentation and Polish (P2)

- **Agent delivers:** Blockquote-after-paragraph handling or documented limitation
- **Human reviews:** Documentation accuracy
- **Approved when:** All known edge cases either fixed or documented

### Rollback Plan

All changes are to client-side parsing logic. Rollback by reverting commits. No data migration or server-side changes.

---

## 9. Human Validation Plan

| Checkpoint | Agent Produces | Human Validates | Blocks |
|------------|----------------|-----------------|--------|
| Unit tests written | Test file with 15+ new tests | Test cases cover real scenarios | Phase 1 implementation |
| P0 fixes complete | Code changes, passing tests | Visual check of images/links in editor | Phase 2 |
| P1 fixes complete | Blockquote/task list fixes | Complex document rendering | Phase 3 |
| Final review | All tests passing, no regressions | Overall quality, edge cases | Release |

---

## 10. Dependencies and Risks

### Dependencies

- None - all changes are internal to the parser

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Fix breaks existing parsing | High | Medium | Comprehensive test suite, run all 186 unit tests |
| Performance regression | Medium | Low | Benchmark before/after on large documents |
| markdown-it upgrade breaks fixes | Medium | Low | Pin markdown-it version, add integration tests |

---

## 11. Open Questions

*All questions resolved:*

1. ~~**Blockquote without blank line:**~~ **RESOLVED:** Match CommonMark spec - require blank line before blockquotes. Document this as expected behavior, not a bug.
2. ~~**Nested blockquote limit:**~~ **RESOLVED:** Support up to 4 levels of nested blockquotes.

---

