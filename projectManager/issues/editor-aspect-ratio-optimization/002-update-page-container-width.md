# [002] Update Page Container Width to 800px

## Metadata
- **Status:** DONE
- **Depends On:** 001
- **Blocks:** 003, 004, 005, 006
- **Scope:** S
- **Design Doc:** [editor-aspect-ratio-optimization](../../design-docs/editor-aspect-ratio-optimization.md)

## Description

Update the PageContainer component and associated CSS to use the new 800px content width instead of the current 816px. This changes the fundamental page dimensions from US Letter-based (816px) to √2-based (800px).

This also removes the old `pageWidth` and `pageMargin` configuration options, replacing them with the fixed √2 system.

## Acceptance Criteria

- [ ] `.quartz-page` max-width changed from 816px to `var(--content-width)` (800px)
- [ ] Page margin changed from 72px to `var(--prose-margin)` (48px)
- [ ] `PageContainer.tsx` updated to use CSS variables instead of config values
- [ ] Old `pageWidth` and `pageMargin` config props removed from component
- [ ] Editor provider no longer sends custom width/margin values
- [ ] Visual: page appears slightly narrower than before (800 vs 816)

## Technical Notes

### Suggested Approach

1. Update `PageContainer.tsx` to remove dynamic width/margin props
2. Update `.quartz-page` CSS class to use CSS variables
3. Remove `pageWidth` and `pageMargin` from `EditorConfig` type
4. Update `QuartzEditorProvider.ts` to stop sending these values
5. Clean up any related configuration in `package.json`

### Files to Modify
- `src/webview/components/PageContainer.tsx` - Remove dynamic style props
- `src/webview/styles/editor.css` - Update `.quartz-page` styles
- `src/webview/types.ts` - Remove pageWidth/pageMargin from EditorConfig
- `src/QuartzEditorProvider.ts` - Remove config values
- `package.json` - Remove settings schema for pageWidth/pageMargin

### Key Considerations
- This is a breaking change for users who customized pageWidth/pageMargin
- The 800px width is now fixed (presets will come in v2)
- Ensure responsive breakpoint behavior still works (<600px → fluid)

## Tests Required

### Unit Tests
- [ ] PageContainer renders with correct width (800px)
- [ ] PageContainer responds to narrow viewport (<600px)

### Integration Tests
- [ ] Editor loads with new dimensions
- [ ] No console errors about missing config values

### Manual Testing
- [ ] Visual comparison: old (816px) vs new (800px)
- [ ] Test at various viewport widths (1280, 1920, 2560px)
- [ ] Verify fluid mode still works on narrow viewports

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Manual visual verification complete
- [ ] Old configuration values cleaned up
- [ ] Code reviewed
- [ ] No regressions in responsive behavior
