# [006] Update package.json Marketplace Metadata

## Metadata
- **Status:** DONE
- **Depends On:** 001, 003, 004, 005
- **Blocks:** 007
- **Scope:** S
- **Design Doc:** [vscode-marketplace-launch](../../design-docs/vscode-marketplace-launch.md)

## Description

Update package.json with all required and recommended metadata fields for the VS Code Marketplace. This includes the publisher ID, icon path, gallery banner, categories, keywords, and repository links.

## Acceptance Criteria

- [ ] `publisher` field matches registered publisher ID
- [ ] `icon` field points to `images/icon.png`
- [ ] `galleryBanner` configured with color and theme
- [ ] `categories` includes appropriate values
- [ ] `keywords` includes searchable terms
- [ ] `repository` URL configured
- [ ] `homepage` URL configured
- [ ] `bugs` URL configured
- [ ] `version` set to `1.0.0`
- [ ] Package validates: `npm run package` succeeds

## Technical Notes

### Fields to Add/Update

```jsonc
{
  "name": "quartz-markdown-editor",
  "displayName": "Quartz — Clear Markdown Editor",
  "description": "A Notion-style block-based WYSIWYG markdown editor for VS Code",
  "version": "1.0.0",
  "publisher": "<PUBLISHER_ID>",  // From issue 005
  "icon": "images/icon.png",
  "galleryBanner": {
    "color": "#1a1a2e",
    "theme": "dark"
  },
  "categories": [
    "Other",
    "Visualization"
  ],
  "keywords": [
    "markdown",
    "editor",
    "wysiwyg",
    "notion",
    "block editor",
    "tiptap"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/<USERNAME>/quartz"
  },
  "homepage": "https://github.com/<USERNAME>/quartz#readme",
  "bugs": {
    "url": "https://github.com/<USERNAME>/quartz/issues"
  }
}
```

### Gallery Banner Colors
- `#1a1a2e` — Deep navy (works with dark theme)
- Theme should be "dark" for light text on the banner

### Categories (allowed values)
Choose from: Azure, Data Science, Debuggers, Education, Extension Packs, Formatters, Keymaps, Language Packs, Linters, Machine Learning, Notebooks, Other, Programming Languages, SCM Providers, Snippets, Testing, Themes, Visualization

### Open Questions from Design Doc
- GitHub repository URL needs to be provided by maintainer
- Publisher ID comes from issue 005

### Files to Modify
- `package.json` — Update metadata fields

## Tests Required

### Unit Tests
- N/A (configuration change)

### Manual Testing
- [ ] `npm run package` succeeds without errors
- [ ] Generated .vsix can be installed in VS Code
- [ ] Extension info shows correct metadata in VS Code Extensions view

## Definition of Done

- [ ] All metadata fields updated
- [ ] Package builds successfully
- [ ] Local .vsix installation verified
- [ ] Changes committed to repository
