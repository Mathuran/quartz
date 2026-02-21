# [003] Edge Cases, Polish, and E2E Tests

## Metadata
- **Status:** TODO
- **Depends On:** 002
- **Blocks:** -
- **Scope:** S
- **Design Doc:** [frontmatter-properties-editor](../../design-docs/frontmatter-properties-editor.md)

## Description

Handle remaining edge cases, add the feature flag (`quartz.showFrontmatterBanner`), and write comprehensive E2E tests for the frontmatter banner. Covers: very long frontmatter (max height + scroll), frontmatter-only files, removing all frontmatter content, and the feature flag fallback.

## Acceptance Criteria

- [ ] Very long frontmatter (50+ lines) has max textarea height with scrollbar
- [ ] Frontmatter-only file (no body content) shows banner + empty paragraph
- [ ] Removing all frontmatter text removes the `---` fences from the file
- [ ] `quartz.showFrontmatterBanner` setting (default: `true`) — when `false`, falls back to code block behavior
- [ ] Round-trip fidelity: file with frontmatter → open → no edits → save → output matches input
- [ ] All E2E tests pass
- [ ] No regressions

## Human Review Focus

- **Look at:** Edge case handling, feature flag integration
- **Test:** Test with real-world markdown files (Hugo/Jekyll/Obsidian). Verify round-trip with no edits. Toggle feature flag off and verify fallback.
- **Decide:** Is the frontmatter feature ready to ship?

## Agent Autonomy Notes

- **Agent can decide:** Max textarea height value, feature flag implementation details, E2E test structure
- **Escalate to human:** Any edge cases that produce unexpected file output

## Technical Notes

### Files to Modify
- `src/webview/components/FrontmatterBanner.tsx` — max height, edge case handling
- `src/webview/Editor.tsx` — feature flag check
- `src/QuartzEditorProvider.ts` or config — add `showFrontmatterBanner` setting
- `package.json` — add `quartz.showFrontmatterBanner` to `contributes.configuration`

### Files to Create
- `test/e2e/specs/frontmatter-editing.spec.ts` — E2E tests for editing
- `test/e2e/specs/frontmatter-roundtrip.spec.ts` — E2E roundtrip tests

### Key Considerations
- Feature flag should gate at the `Editor.tsx` level: if disabled, insert frontmatter as a codeBlock (current behavior)
- Max textarea height: ~300px (about 15 lines) then scroll

## Tests Required

### E2E Tests
- [ ] Round-trip: open file with frontmatter, no edits, verify output matches input
- [ ] Edit frontmatter, verify only frontmatter changes in output
- [ ] Remove all frontmatter, verify `---` fences removed
- [ ] Add frontmatter to file without it, verify `---` fences added
- [ ] Feature flag off: frontmatter renders as code block (legacy behavior)
- [ ] Very long frontmatter: textarea scrolls

## Definition of Done

- [ ] All acceptance criteria met
- [ ] E2E tests written and passing
- [ ] Human review completed (final acceptance)
- [ ] No regressions in existing tests
