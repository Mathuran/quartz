# [001] Remove Drag Handle Extension

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** 002, 015
- **Scope:** S
- **Design Doc:** [markdown-parsing-fixes](../../design-docs/markdown-parsing-fixes.md)

## Description

Remove the 6-dot drag handle entirely from the editor. The drag handle has persistent positioning bugs and adds visual clutter. We're replacing it with VS Code-style `Option+Arrow` keyboard shortcuts for block movement (implemented in issue 002).

This issue focuses solely on removal — no new functionality added here.

## Acceptance Criteria

- [ ] `dragHandle.ts` extension file is deleted
- [ ] All `.quartz-drag-handle` CSS rules removed from `editor.css`
- [ ] `dragHandleExtension` import removed from `Editor.tsx`
- [ ] No drag handle visible when hovering over blocks
- [ ] Editor still loads and functions without errors
- [ ] No console errors related to drag handle

## Technical Notes

### Files to Delete
- `src/webview/extensions/dragHandle.ts`

### Files to Modify
- `src/webview/Editor.tsx` — Remove import and usage of `dragHandleExtension`
- `src/webview/styles/editor.css` — Remove `.quartz-drag-handle` and related rules

### Suggested Approach
1. Delete `dragHandle.ts`
2. Remove import from `Editor.tsx`
3. Remove from extensions array in `Editor.tsx`
4. Search for and remove all `.quartz-drag-handle` CSS rules
5. Test editor loads without errors

### Key Considerations
- Make sure to remove ALL references to avoid dead code
- The drag handle e2e tests will need to be deleted (handled separately)

## Tests Required

### Unit Tests
- N/A (removal only)

### Integration Tests
- [ ] Editor initializes without drag handle extension
- [ ] No runtime errors on editor load

### Manual Testing
- [ ] Open editor, hover over paragraphs — no handle appears
- [ ] Editor functions normally for typing/formatting

## Definition of Done

- [ ] All acceptance criteria met
- [ ] No console errors
- [ ] Editor loads and functions normally
- [ ] Code reviewed
- [ ] No regressions in existing functionality
