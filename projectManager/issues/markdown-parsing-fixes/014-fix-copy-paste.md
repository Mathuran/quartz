# [014] Fix Copy/Paste Functionality

## Metadata
- **Status:** TODO
- **Depends On:** —
- **Blocks:** —
- **Scope:** M
- **Design Doc:** [markdown-parsing-fixes](../../design-docs/markdown-parsing-fixes.md)

## Description

Copy and paste operations don't produce visible results in the editor. Need to debug clipboard event handlers and ensure proper serialization/deserialization of content.

## Acceptance Criteria

- [ ] Selecting text and pressing Cmd+C copies to clipboard
- [ ] Pressing Cmd+V pastes content at cursor position
- [ ] Pasted content preserves formatting (bold, italic, links, etc.)
- [ ] Pasting plain text from external sources works
- [ ] Pasting rich HTML from external sources is sanitized and works
- [ ] Cut (Cmd+X) removes text and puts it on clipboard
- [ ] Paste within same document works (internal copy/paste)

## Technical Notes

### Files to Investigate
- TipTap clipboard handling (built-in, but may need configuration)
- `src/webview/Editor.tsx` — Any custom clipboard handlers?

### Debug Approach

1. Check if clipboard events are being captured:

```typescript
editor.on('copy', () => console.log('Copy event'));
editor.on('paste', () => console.log('Paste event'));
```

2. Check if `clipboardTextSerializer` is configured:

```typescript
// TipTap uses this to convert document to clipboard format
const editor = useEditor({
  // ...
  editorProps: {
    clipboardTextSerializer: (slice) => {
      // Custom serialization if needed
      return slice.content.textBetween(0, slice.content.size, '\n');
    },
  },
});
```

3. Check for `transformPasted` hook:

```typescript
editorProps: {
  transformPastedHTML: (html) => {
    // Sanitize pasted HTML
    return sanitize(html);
  },
  transformPastedText: (text) => {
    // Transform pasted plain text
    return text;
  },
},
```

### Common Issues

1. **VS Code webview clipboard restrictions**: May need to use VS Code's clipboard API
2. **Content Security Policy blocking clipboard**: Check webview CSP settings
3. **Async clipboard API not awaited**: Modern clipboard API is async

### VS Code Clipboard Workaround

If browser clipboard doesn't work in webview:

```typescript
// Post message to extension host
vscode.postMessage({ type: 'copy', content: selectedText });

// In extension host
panel.webview.onDidReceiveMessage((message) => {
  if (message.type === 'copy') {
    vscode.env.clipboard.writeText(message.content);
  }
});
```

### Key Considerations
- Test in VS Code webview specifically (not just browser)
- Sanitize pasted HTML to prevent XSS
- Preserve markdown formatting on paste when possible

## Tests Required

### Unit Tests
- [ ] Copy serializes selected content correctly
- [ ] Paste inserts content at cursor
- [ ] Formatted content (bold, italic) survives copy/paste
- [ ] Links survive copy/paste with href

### E2E Tests
- [ ] Select text, Cmd+C, move cursor, Cmd+V — text appears

### Manual Testing
- [ ] Select "hello **world**", copy, paste — "hello **world**" appears
- [ ] Copy text from browser, paste into editor — works
- [ ] Copy from editor, paste into external app — works

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Code reviewed
- [ ] Works in VS Code webview context
- [ ] No regressions in existing functionality
