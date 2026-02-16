# [004] Create CHANGELOG.md

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** 006
- **Scope:** XS
- **Design Doc:** [vscode-marketplace-launch](../../design-docs/vscode-marketplace-launch.md)

## Description

Create a CHANGELOG.md file following the Keep a Changelog format. This file will be displayed in the "Changelog" tab of the VS Code Marketplace listing and helps users understand what's included in each release.

## Acceptance Criteria

- [ ] CHANGELOG.md created at project root
- [ ] Follows Keep a Changelog format (https://keepachangelog.com)
- [ ] Includes v1.0.0 entry with all initial features
- [ ] Uses semantic versioning
- [ ] Date placeholder ready to be filled on release

## Technical Notes

### Content for v1.0.0

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - YYYY-MM-DD

### Added
- Block-based WYSIWYG editing for markdown files
- Slash command menu for block insertion (headings, lists, code, tables, etc.)
- Drag-and-drop block reordering
- Inline formatting (bold, italic, strikethrough, code, link, highlight)
- Keyboard shortcuts for common formatting actions
- Table editing with Tab navigation
- Task list checkboxes with interactive toggling
- Code block syntax highlighting via highlight.js
- Page layout mode with configurable width and margins
- Theme support (auto, light, dark)
- YAML frontmatter preservation
- Round-trip markdown fidelity
```

### Files to Create
- `CHANGELOG.md` — Create at project root

## Tests Required

### Manual Testing
- [ ] CHANGELOG.md renders correctly in GitHub
- [ ] Format matches Keep a Changelog specification

## Definition of Done

- [ ] CHANGELOG.md created with v1.0.0 content
- [ ] Format validated against Keep a Changelog
- [ ] File committed to repository
