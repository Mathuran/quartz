# [002] Fix Link Parsing with Special Characters in URLs

## Metadata
- **Status:** DONE
- **Depends On:** None
- **Blocks:** None
- **Scope:** S
- **Design Doc:** [parser-edge-case-fixes](../../design-docs/parser-edge-case-fixes.md)

## Description

Links with query parameters (`?`), ampersands (`&`), and anchors (`#`) in URLs fail to parse correctly. The URL may be truncated or malformed during token extraction. The parser should preserve URLs exactly as parsed by markdown-it.

## Acceptance Criteria

- [ ] `[link](https://example.com?a=1&b=2)` preserves the full URL
- [ ] `[link](https://example.com#section)` preserves the anchor
- [ ] `[link](https://example.com?a=1&b=2#section)` preserves both query and anchor
- [ ] URLs with encoded characters (`%20`, `%3D`) are preserved

## Human Review Focus

- **Look at:** The link_open case in `parser.ts`
- **Test:** Click a link with query params in editor - verify correct URL opens
- **Decide:** None

## Agent Autonomy Notes

- **Agent can decide:** Implementation approach for URL preservation
- **Escalate to human:** If URL encoding/decoding behavior needs to change

## Technical Notes

### Suggested Approach
1. Find the `case 'link_open':` block in `parser.ts`
2. Ensure `href` is taken directly from `token.attrGet('href')` without modification
3. Don't decode/encode - preserve original URL exactly

### Files to Modify
- `src/markdown/parser.ts` - Update link token handling

### Key Considerations
- markdown-it already parses URLs correctly; we just need to preserve them
- Watch for any places where href might be processed/transformed

## Tests Required

### Unit Tests
- [ ] Link with `?query=value` preserves URL
- [ ] Link with `#anchor` preserves URL
- [ ] Link with `?a=1&b=2#anchor` preserves full URL
- [ ] Link with `%20` encoded spaces preserves encoding

### E2E Tests
- [ ] Link with special characters is clickable and opens correct URL

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Human review completed
- [ ] No regressions in existing link parsing
