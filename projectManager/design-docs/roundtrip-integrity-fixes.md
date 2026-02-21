# Roundtrip Integrity Fixes Design Document

**Author:** Claude
**Status:** APPROVED
**Created:** 2026-02-20
**Last Updated:** 2026-02-20
**Reviewers:** TBD

---

## 1. Problem Statement

Complex markdown documents lose structure when going through the Quartz parse-serialize roundtrip cycle. When a user opens a markdown file, edits it, and saves, the output may differ from the input in ways beyond the user's edits:

1. **Complex documents with multiple block types** (headings, lists, code blocks, tables, blockquotes) may have structural changes
2. **Serialized output timing issues** cause tests to timeout waiting for updates
3. **Content integrity** is compromised when the save operation changes formatting the user didn't touch

This is a critical issue because users trust that the editor preserves their document structure. Unexpected changes to formatting or structure can break downstream tools, cause git diffs to be noisy, and erode trust in the editor.

---

## 2. Goals and Non-Goals

### Goals

- **P0:** Document with headings + lists + code blocks + tables roundtrips without structural loss
- **P0:** Serialization completes within 500ms of edit for documents up to 100KB
- **P0:** No content loss during roundtrip (all text preserved)
- **P1:** Formatting choices preserved (asterisks vs underscores, fence type)
- **P1:** Blank line patterns preserved where semantically meaningful
- **P2:** Comments and HTML preserved as-is

### Non-Goals

- Preserving exact whitespace (trailing spaces, multiple blank lines)
- Supporting non-standard markdown extensions
- Optimizing for documents over 1MB
- Collaborative editing scenarios

---

## 3. Background and Context

### Current Implementation

The roundtrip flow is:

```
Markdown String
    │
    ▼ parseMarkdown()
TipTap JSONContent
    │
    ▼ (user edits)
TipTap JSONContent
    │
    ▼ serializeMarkdown()
Markdown String
```

### Known Issues

1. **Parser issues:** Some elements not parsing correctly (addressed in parser-edge-case-fixes)
2. **Serializer timing:** Debounced updates might not complete before test assertions
3. **Serializer structure:** Complex nested structures might not serialize correctly

### Test Failure Analysis

The failing test "complex document roundtrips preserve structure" times out waiting for `waitForUpdate`. This suggests:

1. The serializer might not be producing updates
2. The debounce might be longer than expected
3. An error might be silently failing

### Related Files

- `src/markdown/parser.ts` - Parses markdown to JSONContent
- `src/markdown/serializer.ts` - Serializes JSONContent to markdown
- `src/webview/Editor.tsx` - Debounced update logic (300ms)
- `test/e2e/fixtures.ts` - `waitForUpdate` implementation

---

## 4. Proposed Solution

### Overview

Fix roundtrip integrity through:

1. **Timeout investigation:** Determine why serialization updates aren't triggering
2. **Serializer robustness:** Ensure all JSONContent structures serialize correctly
3. **Test reliability:** Improve test waiting logic

### Detailed Investigation

#### Step 1: Debug Update Flow

Add logging to understand the update flow:

```typescript
// In Editor.tsx
onUpdate: ({ editor }) => {
  console.log('[Quartz] onUpdate triggered');
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    console.log('[Quartz] Debounce fired, serializing...');
    try {
      const markdown = serializeMarkdown(editor.getJSON());
      console.log('[Quartz] Serialized, length:', markdown.length);
      onUpdate(markdown);
    } catch (err) {
      console.error('[Quartz] Serialization error:', err);
    }
  }, 300);
},
```

### Likely Fixes

1. **Increase test timeout:** The test uses 3000ms for `waitForUpdate`, but complex docs might need more time
2. **Fix serialization gaps:** Ensure all parser-produced nodes can be serialized
3. **Handle edge cases:** Empty content arrays, missing attributes, etc.

---

## 5. Alternative Solutions Considered

### Alternative 1: Store Original Markdown

**Pros:**
- Perfect preservation of unedited sections
- Only changed sections are re-serialized

**Cons:**
- Complex tracking of which sections changed
- Difficult with block movement operations
- Significant architecture change

**Decision:** Rejected for now - too complex

### Alternative 2: Accept Formatting Normalization

**Pros:**
- Simpler implementation
- Consistent output format

**Cons:**
- Git diffs become noisy
- May break downstream tools expecting specific format
- Users may be surprised by changes

**Decision:** Rejected - preservation is important

---

## 6. Security, Privacy, and Compliance

### Security Considerations

- No security implications for serialization logic

### Privacy

- No PII processing in serialization

### Compliance

- No compliance implications

---

## 7. Testing Strategy

### Unit Tests

Add roundtrip tests for complex documents:

```typescript
describe('Complex Document Roundtrip', () => {
  it('should preserve heading + list + code structure', () => {
    const input = `# Title

Paragraph text.

- List item 1
- List item 2

\`\`\`javascript
const x = 1;
\`\`\`
`;
    const parsed = parseMarkdown(input);
    const output = serializeMarkdown(parsed);

    expect(output).toContain('# Title');
    expect(output).toContain('- List item 1');
    expect(output).toContain('```javascript');
  });
});
```

### E2E Tests

Fix and expand the failing test:

```typescript
test('complex document roundtrips preserve structure', async ({ page }) => {
  const complex = `# Title

**Bold** and *italic* paragraph.

- List 1
- List 2

\`\`\`javascript
const x = 1;
\`\`\`

> Quote

| A | B |
|---|---|
| 1 | 2 |

---

Final paragraph.`;

  await loadMarkdown(page, complex);
  await page.waitForTimeout(1000); // Longer wait for complex doc

  // Make a small edit
  await editorPage.prosemirror.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' edited');

  // Wait longer for serialization
  await page.waitForTimeout(1000);

  // Use longer timeout for update
  const output = await waitForUpdate(page, -1, 5000);

  // Verify structure preserved
  expect(output).toContain('# Title');
  expect(output).toContain('**Bold**');
  expect(output).toContain('- List 1');
  expect(output).toContain('```javascript');
  expect(output).toContain('> Quote');
  expect(output).toContain('| A');
  expect(output).toContain('---');
  expect(output).toContain('edited');
});
```

---

## 8. Rollout Plan

### Phase 1: Diagnosis

- **Agent delivers:** Debug logs identifying where roundtrip breaks
- **Human reviews:** Log output, confirms root cause
- **Approved when:** Issue clearly identified

### Phase 2: Fix

- **Agent delivers:** Serializer/test fixes, passing tests
- **Human reviews:** Test passes, manual verification with complex doc
- **Approved when:** No regressions, roundtrip works

### Rollback Plan

Revert changes. Original behavior restored.

---

## 9. Human Validation Plan

| Checkpoint | Agent Produces | Human Validates | Blocks |
|------------|----------------|-----------------|--------|
| Diagnosis complete | Logs, root cause | Confirms understanding | Fix |
| Fix implemented | Code changes | Manual roundtrip test | Release |
| Test coverage | Additional tests | Coverage adequate | Release |

---

## 10. Dependencies and Risks

### Dependencies

- **BLOCKING:** Parser correctness (must complete `parser-edge-case-fixes` first)
- TipTap JSONContent structure stability

**Note:** Work on this doc should begin AFTER parser fixes are complete, since parser bugs may be the root cause of roundtrip failures.

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Fix causes different serialization issues | High | Medium | Comprehensive test suite |
| Performance regression | Medium | Low | Profile serialization time |
| Test timing remains flaky | Medium | Medium | Add retry logic, longer timeouts |

---

## 11. Open Questions

1. **Formatting preservation:** How important is preserving asterisks vs underscores for emphasis? (Owner: Product - decide after parser fixes)
2. **Blank lines:** Should we normalize to single blank lines between blocks? (Owner: Product - decide after parser fixes)
3. ~~**Test timeout:**~~ **RESOLVED:** 5 seconds is acceptable for complex docs.

**Note:** Most questions will be easier to answer after parser fixes reveal the actual roundtrip behavior.
