# [003] Slash Command, Theme Integration & E2E Tests

## Metadata
- **Status:** DONE
- **Depends On:** 001, 002
- **Blocks:** None
- **Scope:** S
- **Design Doc:** [mermaid-diagram-support](../../design-docs/mermaid-diagram-support.md)

## Description

Add `/mermaid` slash command for creating new diagram blocks, integrate VS Code theme (light/dark) with mermaid rendering, and write E2E tests covering the full feature.

## Acceptance Criteria

- [ ] `/mermaid` appears in slash menu with "Mermaid Diagram" label and aliases (diagram, flowchart, sequence, chart)
- [ ] Selecting `/mermaid` inserts a mermaid code block in edit mode with a starter flowchart template as placeholder
- [ ] Template is not committed to document until user clicks "Done"
- [ ] Light VS Code theme → mermaid `default` theme
- [ ] Dark VS Code theme → mermaid `dark` theme
- [ ] Theme change re-renders all visible mermaid blocks
- [ ] E2E tests cover: rendering, toggle, slash command, error state, round-trip, max-height, fullscreen viewer
- [ ] All test suites pass (unit, E2E)

## Human Review Focus

- **Look at:** Slash command discoverability — does label/icon/description make sense? Is starter template useful?
- **Test:** Type `/mermaid`, select it, write a diagram, verify it renders. Toggle light/dark theme, verify diagram colors update.
- **Decide:** Is E2E test coverage sufficient for shipping?

## Agent Autonomy Notes

- **Agent can decide:** Slash command icon choice, starter template content, E2E test structure, exact theme color mapping
- **Escalate to human:** If theme detection mechanism is unreliable, if E2E test infrastructure needs changes

## Technical Notes

### Suggested Approach
1. Add mermaid entry to `src/webview/commands/slashCommands.ts`
2. Add mermaid case in `src/webview/components/SlashMenu.tsx` command executor (if switch-based)
3. Read VS Code theme from existing theme context passed to webview
4. Call `mermaid.initialize({ theme: ... })` on theme change, then re-render visible blocks
5. Write E2E specs in `test/e2e/specs/mermaid-diagram.spec.ts`

### Files to Create
- `test/e2e/specs/mermaid-diagram.spec.ts` — E2E test suite

### Files to Modify
- `src/webview/commands/slashCommands.ts` — add mermaid command
- `src/webview/components/SlashMenu.tsx` — add mermaid case (if needed)
- `src/webview/components/MermaidBlockView.tsx` — add theme integration
- `playwright.config.ts` — add mermaid spec to appropriate project group

### Key Considerations
- Starter template should be a simple flowchart (most intuitive for new users)
- Template goes in textarea as placeholder — only inserted into document on "Done"
- For theme: re-initialize mermaid module + re-render, don't just swap CSS
- E2E tests should go in the `features` project group (depends on foundational + interactions)
- Need a test fixture markdown file with mermaid blocks

## Tests Required

### E2E Tests (Playwright)
- [ ] Mermaid block renders as SVG when file loaded
- [ ] Click edit button → textarea with mermaid source appears
- [ ] Edit code, click outside → diagram re-renders
- [ ] Invalid syntax → error message displayed
- [ ] `/mermaid` slash command creates new block in edit mode
- [ ] Round-trip: open file → edit diagram → save → reopen → content preserved
- [ ] Theme toggle: diagram theme updates when VS Code theme changes
- [ ] Large diagram shows max-height clipping with fade
- [ ] Expand icon opens fullscreen overlay
- [ ] Zoom in/out and pan work in fullscreen
- [ ] Escape closes fullscreen viewer

### Manual Testing
- [ ] Type `/mermaid` → select → edit mode with template shown
- [ ] Write a sequence diagram from scratch, verify it renders
- [ ] Toggle between light and dark theme, verify diagram colors update
- [ ] Open a real-world README with mermaid blocks, verify all render

## Definition of Done

- [ ] All acceptance criteria met
- [ ] E2E tests written and passing
- [ ] All existing tests pass (unit, integration, E2E)
- [ ] Human review completed (slash command UX, theme integration, test coverage)
- [ ] Feature ready to ship
