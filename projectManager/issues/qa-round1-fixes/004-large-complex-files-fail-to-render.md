# [004] Large and Complex Files Fail to Render — Silent Error

## Metadata
- **Status:** TODO
- **Depends On:** —
- **Blocks:** —
- **Scope:** M
- **Found in:** QA Round 1 (TC-02.04, TC-02.05)

## Description

Opening a large file (500+ lines) or a file with all supported block types results in a blank screen with only a single empty code block visible. The user reports:
- TC-02.04: "Only saw an empty screen with 1 empty code block. Seemed like there are some markdown features not supported yet and an error occured"
- TC-02.05: "Used the file test/qa/test-all-blocks.md to verify markdown features. Seemed like an error happened and nothing rendered except a single empty block"

The editor fails silently — no error message is shown to the user, and the entire document is lost.

## Root Cause

1. **No error handling in the webview.** There are zero try-catch blocks in `App.tsx`, `Editor.tsx`, or `parser.ts`. If `parseMarkdown()` throws (e.g., on an unrecognized token pattern or null access), React crashes silently.

2. **Parser has no defensive coding.** Token array indices are accessed without bounds checking. The `parseTable()`, `parseBlockquote()`, and `parseListItems()` functions trust that tokens follow exact expected patterns. An unexpected token sequence causes a crash.

3. **Recursive `parseMarkdown()` call.** In `parser.ts` line 153, `<details>` handling recursively calls `parseMarkdown(detailsBody)`. Deeply nested or malformed HTML can cause stack overflow.

4. **Unsupported markdown features cause crashes, not graceful degradation.** The parser uses `commonmark` preset with only `strikethrough` and `table` enabled. Content with footnotes, definition lists, or other GFM features may produce unexpected token types that the `tokensToNodes()` switch/case silently skips — but the surrounding code may still crash on the unexpected structure.

5. **"1 empty code block" clue.** This symptom suggests the parser partially runs, creates a frontmatter/code block, then crashes before processing the body. Or the Tiptap editor receives malformed JSONContent and renders only a default empty node.

## Acceptance Criteria

- [ ] Opening `test/qa/test-all-blocks.md` renders all block types correctly
- [ ] Opening a 500+ line `.md` file renders the full document
- [ ] If a parse error occurs, the editor shows an error message (not a blank screen)
- [ ] Unsupported markdown features are rendered as plain text paragraphs (graceful degradation)
- [ ] No silent failures — errors are logged to the browser console

## Technical Notes

### Fix Approach

**A. Add error boundary in React (App.tsx or Editor.tsx):**
```tsx
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return <div className="error-state">
        <p>Failed to render document: {this.state.error.message}</p>
        <p>Try opening with the default text editor.</p>
      </div>;
    }
    return this.props.children;
  }
}
```

**B. Add try-catch around parseMarkdown in Editor.tsx:**
```typescript
let doc: JSONContent;
try {
  doc = parseMarkdown(content);
} catch (err) {
  console.error('Parse error:', err);
  doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: content }] }] };
}
```

**C. Add defensive checks in parser.ts:**
- Bounds-check token array access
- Validate `tokens[i + 1]` exists before accessing `.children`
- Add a recursion depth limit for `parseMarkdown()` re-entry
- Log warnings for unrecognized token types instead of silently skipping

### Investigation Steps
1. Open `test/qa/test-all-blocks.md` in browser DevTools console to see the actual error
2. Run `parseMarkdown()` on the file content in a unit test to reproduce
3. Identify the specific token/content that triggers the crash

### Files to Modify
- `src/webview/App.tsx` — add React error boundary
- `src/webview/Editor.tsx` — add try-catch around parse call
- `src/markdown/parser.ts` — add defensive checks and error logging

### Key Considerations
- The error boundary should provide a "Copy raw markdown" button so the user doesn't lose their content
- Parser errors should fall back to rendering raw text, not a blank screen
- Unit tests should be added for the specific content that caused the crash

## Tests Required

### Unit Tests
- [ ] `parseMarkdown()` does not throw on the content of `test/qa/test-all-blocks.md`
- [ ] `parseMarkdown()` does not throw on a 500+ line document with varied content
- [ ] `parseMarkdown()` handles unknown token types gracefully

### Manual Testing
- [ ] Open `test/qa/test-all-blocks.md` — all blocks render
- [ ] Open a 500+ line file — full content renders
- [ ] Introduce a deliberately broken token — error message appears (not blank screen)

## Definition of Done

- [ ] All acceptance criteria met
- [ ] TC-02.04 and TC-02.05 pass
- [ ] No silent failures in the editor
