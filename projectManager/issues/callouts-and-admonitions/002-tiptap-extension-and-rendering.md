# [002] CalloutExtension and Visual Rendering

## Metadata
- **Status:** DONE
- **Depends On:** 001
- **Blocks:** 003
- **Scope:** M
- **Design Doc:** [callouts-and-admonitions](../../design-docs/callouts-and-admonitions.md)

## Description

Create the `CalloutExtension` TipTap node and `CalloutNodeView` React component. The extension defines the `callout` node in the ProseMirror schema with attributes for type, title, collapsed, and foldable. The node view renders callouts with type-specific colors, icons, a title input, and a collapsible content area.

## Acceptance Criteria

- [ ] `CalloutExtension` registered in `Editor.tsx` with `callout` node type in schema
- [ ] Each of the 8 callout types renders with distinct colored left border, background tint, and icon
- [ ] Title displayed as a controlled `<input>` in the callout header (stored as node attribute)
- [ ] Title is editable — changes update the node attribute
- [ ] Foldable callouts show a chevron toggle button
- [ ] Clicking chevron toggles collapsed state
- [ ] Collapsed callouts hide content area, expanded show it
- [ ] Content area is a ProseMirror content hole — users can type inside
- [ ] Callouts work in both light and dark VS Code themes
- [ ] Standard `Blockquote` extension still works alongside `CalloutExtension`

## Human Review Focus

- **Look at:** Visual appearance of all 8 callout types in both light and dark themes
- **Test:** Open a markdown file with callout syntax. Verify they render visually. Edit title. Toggle collapse.
- **Decide:** Do the colors, icons, and overall look feel right?

## Agent Autonomy Notes

- **Agent can decide:** SVG icon choices (keep them simple), exact CSS values, component internal structure
- **Escalate to human:** If icons or colors don't look right, flag for visual review

## Technical Notes

### Files to Create
- `src/webview/extensions/calloutExtension.ts` — TipTap Node extension
- `src/webview/components/CalloutNodeView.tsx` — React node view component
- `src/webview/styles/callout.css` — callout styles

### Files to Modify
- `src/webview/Editor.tsx` — register `CalloutExtension` before `Blockquote`

### Key Considerations
- Use `ReactNodeViewRenderer` from `@tiptap/react` for the node view
- Title is a node **attribute** (plain text), not a ProseMirror content hole — use a controlled `<input>` element
- Use VS Code CSS variables for theme compatibility (`--vscode-editor-background`, `--vscode-panel-border`, etc.)
- Type-specific colors via CSS custom properties on `data-callout-type` attribute
- Register `CalloutExtension` BEFORE `Blockquote` in the extensions array

### Color Reference
| Type | Color |
|------|-------|
| note | #448aff |
| tip | #00bfa5 |
| warning | #ff9100 |
| danger | #ff1744 |
| info | #448aff |
| example | #7c4dff |
| quote | #9e9e9e |
| abstract | #00b8d4 |

## Tests Required

### Manual Testing
- [ ] All 8 callout types render with correct colors
- [ ] Title input is editable
- [ ] Collapse toggle works
- [ ] Works in light and dark themes
- [ ] Content is editable inside the callout
- [ ] Regular blockquotes still render correctly

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Manual visual review passed
- [ ] Human review completed
- [ ] No regressions in existing editor behavior
