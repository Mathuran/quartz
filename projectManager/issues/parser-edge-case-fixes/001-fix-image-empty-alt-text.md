# [001] Fix Image Parsing with Empty Alt Text

## Metadata
- **Status:** DONE
- **Depends On:** None
- **Blocks:** None
- **Scope:** S
- **Design Doc:** [parser-edge-case-fixes](../../design-docs/parser-edge-case-fixes.md)

## Description

Images with empty alt text (`![]()`) fail to render correctly in the editor. The parser needs to properly handle empty alt strings, ensuring they are preserved as empty strings rather than being converted to undefined.

## Acceptance Criteria

- [ ] `![](https://example.com/image.png)` parses to an image node with `alt: ''`
- [ ] `![](image.png)` renders correctly in the editor
- [ ] Images with special characters in alt text (quotes, brackets) parse correctly
- [ ] Unit test coverage for empty and special-character alt text cases

## Human Review Focus

- **Look at:** The image parsing case in `parser.ts`
- **Test:** Load a markdown file with `![](image.png)` - verify image displays
- **Decide:** None

## Agent Autonomy Notes

- **Agent can decide:** Implementation details for handling empty/null alt values
- **Escalate to human:** If the fix affects how existing images with alt text are parsed

## Technical Notes

### Suggested Approach
1. Find the `case 'image':` block in `src/markdown/parser.ts`
2. Ensure empty string is explicitly set: `alt: alt || ''`
3. Use nullish coalescing where appropriate: `token.attrGet('alt') ?? token.content ?? ''`

### Files to Modify
- `src/markdown/parser.ts` - Update image token handling

### Key Considerations
- Don't break existing images that have alt text
- Preserve empty string vs undefined distinction

## Tests Required

### Unit Tests
- [ ] `![](url)` parses with `alt: ''`
- [ ] `!["quoted"](url)` parses correctly
- [ ] `![alt with [brackets]](url)` parses correctly

### E2E Tests
- [ ] Image with empty alt text renders in editor

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Human review completed
- [ ] No regressions in existing image parsing
