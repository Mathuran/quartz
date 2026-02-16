# [002] Capture Screenshots for Marketplace Gallery

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** 003
- **Scope:** S
- **Design Doc:** [vscode-marketplace-launch](../../design-docs/vscode-marketplace-launch.md)

## Description

Capture 4 high-quality screenshots demonstrating Quartz's key features for the VS Code Marketplace gallery. These screenshots are the primary visual marketing for the extension and should showcase its unique value proposition as a block-based WYSIWYG editor.

## Acceptance Criteria

- [ ] 4 screenshots captured and saved to `images/` directory
- [ ] Screenshots show realistic, useful content (not Lorem ipsum)
- [ ] Screenshots are high resolution (at least 1280x800)
- [ ] Screenshots demonstrate key features clearly
- [ ] Screenshots work on the Marketplace (PNG or JPEG format)

## Technical Notes

### Required Screenshots

1. **`screenshot-editor.png`** — Editor with mixed content
   - Show a document with: H1 heading, paragraph, code block with syntax highlighting, bullet list
   - Demonstrates the core editing experience

2. **`screenshot-slash-menu.png`** — Slash command menu open
   - Show the `/` menu with available block types
   - Cursor positioned in the menu
   - Demonstrates discoverability of features

3. **`screenshot-table.png`** — Table editing
   - Show a table with content being edited
   - Demonstrates table support

4. **`screenshot-themes.png`** — Light and dark theme comparison
   - Side-by-side or split view showing both themes
   - Same content in both views
   - Demonstrates theme support

### Capture Process

1. Open VS Code with Extension Development Host (F5)
2. Create a sample markdown file with varied content
3. Use a clean VS Code theme (default light/dark)
4. Hide unnecessary sidebars for cleaner shots
5. Capture using macOS Screenshot (Cmd+Shift+4) or VS Code's screenshot feature
6. Crop to focus on the editor area

### Files to Create
- `images/screenshot-editor.png`
- `images/screenshot-slash-menu.png`
- `images/screenshot-table.png`
- `images/screenshot-themes.png`

## Tests Required

### Manual Testing
- [ ] Screenshots display correctly in README.md preview
- [ ] Screenshots are readable at Marketplace thumbnail size
- [ ] File sizes are reasonable (<500KB each for fast loading)

## Definition of Done

- [ ] All 4 screenshots captured
- [ ] Screenshots reviewed for quality and clarity
- [ ] Screenshots committed to `images/` directory
