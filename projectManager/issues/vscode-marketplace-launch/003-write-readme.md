# [003] Write README.md for Marketplace

## Metadata
- **Status:** DONE
- **Depends On:** 002
- **Blocks:** 006
- **Scope:** M
- **Design Doc:** [vscode-marketplace-launch](../../design-docs/vscode-marketplace-launch.md)

## Description

Create a comprehensive README.md that serves as the primary marketing and documentation page for the VS Code Marketplace listing. The README should clearly communicate what Quartz is, why someone would use it, and how to get started.

## Acceptance Criteria

- [ ] README.md created at project root
- [ ] Includes hero screenshot at the top
- [ ] Features section with bullet points
- [ ] Installation instructions
- [ ] Usage guide with "Open With" workflow
- [ ] Configuration table with all settings
- [ ] Keyboard shortcuts table (macOS and Windows/Linux)
- [ ] Known limitations section
- [ ] Contributing link (to GitHub repo)
- [ ] MIT license statement
- [ ] All screenshots referenced exist in `images/`
- [ ] Markdown renders correctly in GitHub preview
- [ ] Markdown renders correctly in VS Code Marketplace preview

## Technical Notes

### Structure (from design doc)

```markdown
# Quartz — Clear Markdown Editor for VS Code

![Editor Screenshot](images/screenshot-editor.png)

A Notion-style block-based WYSIWYG markdown editor...

## Features
## Installation
## Usage
## Configuration
## Keyboard Shortcuts
## Known Limitations
## Contributing
## License
```

### Writing Guidelines

- Lead with benefits, not features ("Your markdown formatting is preserved" not "Round-trip serialization")
- Use active voice
- Keep sentences short
- Include visual examples (screenshots, GIFs)
- Test all links work

### Files to Create/Modify
- `README.md` — Create new file at project root

### GIF Consideration (Optional)
- A GIF showing slash command usage would be compelling
- Can be created with tools like Gifski, LICEcap, or Kap
- Keep under 5MB for fast loading

## Tests Required

### Manual Testing
- [ ] Preview README in GitHub web UI
- [ ] Preview README in VS Code markdown preview
- [ ] Verify all image paths resolve correctly
- [ ] Check all external links work
- [ ] Proofread for typos and grammar

## Definition of Done

- [ ] All acceptance criteria met
- [ ] README reviewed by maintainer
- [ ] All referenced images exist
- [ ] README committed to repository
