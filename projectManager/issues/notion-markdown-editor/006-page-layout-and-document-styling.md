# [006] Page Layout and Document Styling

## Metadata
- **Status:** TODO
- **Depends On:** 005
- **Blocks:** None
- **Scope:** S
- **Design Doc:** [notion-markdown-editor](../../design-docs/notion-markdown-editor.md)

## Description

Implement the letter-sized document page view as described in design doc §4 (Document Page Layout). The editor content should render inside a page container with 1:sqrt(2) aspect ratio (ISO A-series proportion), centered in the webview with shadow and background contrast. For documents longer than one page, additional pages render below with visible page break gaps.

## Acceptance Criteria

- [ ] Page container rendered with 1:sqrt(2) aspect ratio (width configurable, default 816px, height = width x 1.414)
- [ ] Page centered horizontally with subtle drop shadow and distinct background
- [ ] Content flows continuously across pages with visual page break gaps between pages
- [ ] Content starts from the top margin of the first page (no special title area)
- [ ] Page margin configurable (default 72px inner margin)
- [ ] At narrow panel widths (< 600px), page layout disabled — falls back to fluid single column
- [ ] `quartz.editor.pageLayout` setting toggles page view on/off
- [ ] `quartz.editor.pageWidth` and `quartz.editor.pageMargin` settings apply in real-time
- [ ] Font family and font size settings (`quartz.editor.fontFamily`, `quartz.editor.fontSize`) apply to editor content

## Technical Notes

### Suggested Approach
1. Create `src/webview/components/PageContainer.tsx` — wraps the TipTap editor
2. Use CSS for page styling: `max-width`, `aspect-ratio`, `margin: 0 auto`, `box-shadow`
3. For multi-page rendering, calculate page height and insert visual break markers using CSS
4. Listen for `ResizeObserver` on the webview panel to detect narrow widths and toggle fluid mode
5. Read configuration values from extension host via message and apply as CSS custom properties

### Files to Create/Modify
- `src/webview/components/PageContainer.tsx` — Page layout wrapper
- `src/webview/styles/page.css` — Page-specific styles
- `src/webview/Editor.tsx` — Wrap editor in PageContainer
- `src/QuartzEditorProvider.ts` — Send config values to webview

### Key Considerations
- The page is purely visual — it doesn't affect the ProseMirror document structure
- Page breaks should be CSS-based (visual dividers), not actual content splits
- Scrolling should be smooth — the page container scrolls, not individual pages
- Background color of the page should contrast with VS Code's editor background in both light and dark themes

## Tests Required

### Unit Tests
- [ ] Page height calculated correctly from width (width x 1.414)
- [ ] Fluid mode activates below 600px width
- [ ] Configuration values apply as CSS properties

### Integration Tests
- [ ] Page renders centered with shadow in default config
- [ ] Changing `pageWidth` setting updates page width in real-time
- [ ] Narrow panel triggers fluid layout
- [ ] Font size/family settings apply to editor text

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
