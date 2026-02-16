# [007] Test Local Packaging and Installation

## Metadata
- **Status:** DONE
- **Depends On:** 006
- **Blocks:** 008, 009
- **Scope:** S
- **Design Doc:** [vscode-marketplace-launch](../../design-docs/vscode-marketplace-launch.md)

## Description

Build the extension package locally using `vsce package` and verify it installs and runs correctly in a fresh VS Code instance. This validates that all files are correctly bundled and the extension works when installed from a .vsix file (as it will be from the Marketplace).

## Acceptance Criteria

- [ ] `npm run package` generates a .vsix file
- [ ] .vsix file size is reasonable (<5MB)
- [ ] .vsix installs successfully in VS Code via "Install from VSIX"
- [ ] Extension activates when opening a .md file
- [ ] Custom editor works (right-click → Open With → Quartz)
- [ ] All features function correctly (slash commands, formatting, etc.)
- [ ] Icon displays in Extensions sidebar
- [ ] README displays in extension details
- [ ] No console errors on extension activation

## Technical Notes

### Packaging Steps

```bash
# Clean build
rm -rf dist/
npm run build

# Package extension
npm run package
# or directly: npx vsce package

# Output: quartz-markdown-editor-1.0.0.vsix
```

### Installation Testing

1. Open a fresh VS Code window (not the Extension Development Host)
2. Go to Extensions sidebar
3. Click "..." menu → "Install from VSIX..."
4. Select the generated .vsix file
5. Reload VS Code when prompted

### Verification Checklist

Test these features after installation:
- [ ] Open any .md file
- [ ] Right-click → "Open With..." → "Quartz Markdown Editor"
- [ ] Type and verify text appears
- [ ] Test slash command menu (type `/`)
- [ ] Test keyboard shortcuts (Cmd+B for bold)
- [ ] Test drag-and-drop blocks
- [ ] Save and verify file updates
- [ ] Check Developer Tools console for errors

### Troubleshooting

If packaging fails:
- Check `.vscodeignore` includes necessary files
- Verify all paths in package.json are correct
- Ensure `images/icon.png` exists

### Files to Check
- `.vscodeignore` — May need updates to include/exclude files
- `package.json` — Verify `main` entry point

## Tests Required

### Manual Testing
- [ ] Clean install in fresh VS Code
- [ ] Full feature verification (see checklist above)
- [ ] Extension uninstall and reinstall works
- [ ] No regression from development mode

## Definition of Done

- [ ] .vsix package generated successfully
- [ ] Extension installs and runs from .vsix
- [ ] All major features verified working
- [ ] No blocking issues identified
