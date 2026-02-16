# [001] Create Extension Icon

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** 006
- **Scope:** S
- **Design Doc:** [vscode-marketplace-launch](../../design-docs/vscode-marketplace-launch.md)

## Description

Create a 128x128 PNG icon for the Quartz extension that will be displayed in the VS Code Marketplace listing, the Extensions sidebar, and the extension management UI. The icon should be visually distinctive and convey the "block-based markdown editor" concept.

## Acceptance Criteria

- [ ] Icon is exactly 128x128 pixels
- [ ] Format is PNG with transparent background
- [ ] Icon is saved to `images/icon.png`
- [ ] Icon looks good at small sizes (16x16, 32x32 when scaled down)
- [ ] Icon works on both light and dark VS Code themes
- [ ] Icon does not violate any trademarks or copyrights

## Technical Notes

### Design Direction
- Abstract "Q" letterform, or
- Stylized document/block icon (stacked rectangles representing blocks), or
- Combination of both

### Color Recommendations
- Deep blue/purple gradient complements VS Code's color palette
- Avoid pure white or pure black (won't work on all themes)
- Consider using 2-3 colors maximum for clarity at small sizes

### Tools
- Figma, Sketch, or Adobe Illustrator for vector design
- Export as 128x128 PNG
- AI image generators (DALL-E, Midjourney) can create initial concepts

### Files to Create
- `images/icon.png` — Final 128x128 icon

## Tests Required

### Manual Testing
- [ ] Icon displays correctly in VS Code Extensions sidebar (install .vsix locally)
- [ ] Icon is visible on both light and dark VS Code themes
- [ ] Icon renders clearly when scaled down in the Marketplace listing

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Icon reviewed and approved by maintainer
- [ ] Icon committed to repository at `images/icon.png`
