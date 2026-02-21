# [001] Investigate Roundtrip Test Timeout

## Metadata
- **Status:** TODO
- **Depends On:** parser-edge-case-fixes (all issues must be complete first)
- **Blocks:** 002-fix-serializer-gaps
- **Scope:** S
- **Design Doc:** [roundtrip-integrity-fixes](../../design-docs/roundtrip-integrity-fixes.md)

## Description

The roundtrip e2e test times out waiting for `waitForUpdate`. Before fixing, we need to understand why serialization updates aren't triggering. This requires adding debug logging to the update flow and analyzing where the breakdown occurs.

**IMPORTANT:** This issue should only be started AFTER all parser-edge-case-fixes are complete, as parser bugs may be the root cause.

## Acceptance Criteria

- [ ] Debug logging added to Editor.tsx onUpdate handler
- [ ] Debug logging added to serializeMarkdown function
- [ ] Log output captured showing where update flow breaks
- [ ] Root cause hypothesis documented

## Human Review Focus

- **Look at:** Console output during complex document edit
- **Test:** Load complex doc, make edit, observe logs for serialization
- **Decide:** Confirm root cause before proceeding to fix

## Agent Autonomy Notes

- **Agent can decide:** Log placement and format
- **Escalate to human:** Share log analysis and proposed root cause

## Technical Notes

### Suggested Approach
Add logging to Editor.tsx:

```typescript
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

### Files to Modify
- `src/webview/Editor.tsx` - Add logging to onUpdate
- `src/markdown/serializer.ts` - Add logging to serialize entry point

### Key Considerations
- Look for: silent errors, debounce not firing, serialization exceptions
- Check if complex documents cause parsing errors that break the flow
- Parser fixes may have resolved the underlying issue

## Tests Required

### Unit Tests
- N/A - diagnostic logging

### Manual Testing
- [ ] Load complex document (headings + lists + code + tables)
- [ ] Make an edit
- [ ] Observe console for full log sequence

## Definition of Done

- [ ] Debug logging implemented
- [ ] Log output analyzed
- [ ] Root cause documented
- [ ] Human confirms understanding
