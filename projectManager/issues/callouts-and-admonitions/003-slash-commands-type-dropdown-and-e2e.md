# [003] Slash Commands, Type Dropdown, and E2E Tests

## Metadata
- **Status:** TODO
- **Depends On:** 001, 002
- **Blocks:** -
- **Scope:** M
- **Design Doc:** [callouts-and-admonitions](../../design-docs/callouts-and-admonitions.md)

## Description

Add callout slash commands (`/callout`, `/warning`, `/tip`, etc.), a type-change dropdown in the callout header, and comprehensive E2E tests. This is the final issue that makes callouts fully interactive and tested.

## Acceptance Criteria

- [ ] `/callout` slash command inserts a note callout (default type)
- [ ] Type-specific commands: `/warning`, `/tip`, `/danger`, `/info`, `/example`, `/quote`, `/abstract`
- [ ] Aliases work: typing `/admonition` or `/alert` matches callout commands
- [ ] Type-change dropdown in callout header allows switching between the 8 types
- [ ] Changing type updates the visual appearance (color, icon) immediately
- [ ] Changing type updates the node attribute (persists on serialize)
- [ ] E2E tests pass for all key interactions
- [ ] No regressions in existing slash commands or editor behavior

## Human Review Focus

- **Look at:** Slash command entries, type dropdown UX in the callout header
- **Test:** Type `/callout` to insert one. Use the type dropdown to switch to warning. Toggle collapse. Verify the serialized markdown.
- **Decide:** Is the type dropdown discoverable enough? Is the overall callout UX ready to ship?

## Agent Autonomy Notes

- **Agent can decide:** Dropdown implementation (native `<select>` vs custom), slash command icon choices, E2E test structure
- **Escalate to human:** If the type dropdown placement feels awkward or cluttered

## Technical Notes

### Suggested Approach
1. Add 9 slash command entries to `src/webview/commands/slashCommands.ts` (1 generic + 8 type-specific)
2. Add corresponding cases to `SlashMenu.tsx` `executeCommand()`
3. Add a small type-change dropdown/select in `CalloutNodeView.tsx` header (between icon and title)
4. Write E2E tests covering the full callout workflow

### Files to Modify
- `src/webview/commands/slashCommands.ts` — add callout commands
- `src/webview/components/SlashMenu.tsx` — add callout cases to `executeCommand()`
- `src/webview/components/CalloutNodeView.tsx` — add type dropdown

### Files to Create
- `test/e2e/specs/callout.spec.ts` — E2E test spec

### Key Considerations
- The slash menu already handles aliases — callout commands will naturally appear when filtering
- Type dropdown should be small and unobtrusive — consider showing only on hover or when the callout is focused
- `updateAttributes({ calloutType: newType })` handles the type change via ProseMirror history (undo-friendly)

## Tests Required

### E2E Tests (`test/e2e/specs/callout.spec.ts`)
- [ ] Callout renders with correct color for each type
- [ ] `/callout` slash command inserts a note callout
- [ ] `/warning` inserts a warning callout
- [ ] Collapsible callout toggles on click
- [ ] Callout title is editable
- [ ] Type dropdown changes callout type
- [ ] Callout serializes correctly to `> [!type]` markdown
- [ ] Round-trip fidelity after editing callout content

## Definition of Done

- [ ] All acceptance criteria met
- [ ] E2E tests written and passing
- [ ] Human review completed (final UX review)
- [ ] No regressions in existing slash commands or E2E specs
