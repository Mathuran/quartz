# [009] Fix Blockquote Nesting

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [markdown-parsing-fixes](../../design-docs/markdown-parsing-fixes.md)

## Description

Multiple separate blockquotes incorrectly nest into each other instead of being independent blocks:

```
> First quote

> Second quote (should be separate)
```

Currently renders with "Second quote" nested inside "First quote" instead of as two separate blockquote blocks.

## Acceptance Criteria

- [ ] A blank line between `>` lines creates separate blockquote blocks
- [ ] Consecutive `>` lines (no blank line) form a single blockquote
- [ ] Content after a blockquote renders as normal content
- [ ] Headings after blockquotes render correctly (not absorbed into quote)
- [ ] Nested blockquotes (> > text) work correctly when intentional

## Technical Notes

### Files to Investigate
- `src/markdown/parser.ts` — How blockquotes are parsed
- TipTap's Blockquote extension behavior

### Root Cause Analysis

The issue is likely in how paragraph breaks are handled:
1. The parser may not be detecting blank lines as block boundaries
2. Or the blockquote extension's input rule is too aggressive

Debug approach:
```typescript
// Log the document structure after parsing
console.log(JSON.stringify(doc.toJSON(), null, 2));
```

### Suggested Fix

Check the parser's handling of blank lines between blockquotes:

```typescript
// In parser.ts
case 'blockquote_open':
  // Start new blockquote
  break;

case 'blockquote_close':
  // Close blockquote - next blockquote_open should be separate
  break;
```

The blank line should create a paragraph break that closes the first blockquote before the second one opens.

### Key Considerations
- Markdown spec: blank line between `>` blocks = separate quotes
- Single `>` on blank line should just be empty quote line, not create nesting
- Test with complex scenarios: quote, blank, heading, blank, quote

## Tests Required

### Unit Tests
- [ ] Parse `> A\n\n> B` — creates two separate blockquote nodes
- [ ] Parse `> A\n> B` — creates one blockquote with two lines
- [ ] Parse `> A\n\n## Heading` — blockquote then heading (separate)
- [ ] Parse `> > nested` — creates properly nested blockquote

### E2E Tests
- [ ] Type two blockquotes with blank line between — renders as separate

### Manual Testing
- [ ] Type `> First quote` Enter Enter `> Second quote`
- [ ] First and second should be visually separate blocks
- [ ] Type heading after blockquote — heading not absorbed

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
