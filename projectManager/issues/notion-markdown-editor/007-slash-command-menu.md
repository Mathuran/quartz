# [007] Slash Command Menu

## Metadata
- **Status:** TODO
- **Depends On:** 005
- **Blocks:** None
- **Scope:** M
- **Design Doc:** [notion-markdown-editor](../../design-docs/notion-markdown-editor.md)

## Description

Implement the slash command system. When the user types `/` at the start of an empty block or after pressing Enter, a floating menu appears listing all available block types. The user can type to filter (fuzzy search), navigate with arrow keys, and press Enter to insert the selected block type.

The menu should support all 16 block types listed in the design doc (§4, Block Types table). This issue handles the menu infrastructure — the block types themselves are added progressively across issues 005 (basic blocks), 008 (task list, callout, toggle), 009 (table), and 010 (image, math, mermaid, embed).

## Acceptance Criteria

- [ ] Typing `/` in an empty block or at block start triggers the slash command menu
- [ ] Menu appears as a floating popup positioned near the cursor
- [ ] All block types listed with name and icon/description
- [ ] Typing after `/` filters the list with fuzzy search (e.g., `/cod` matches "Code Block")
- [ ] Arrow keys navigate the list, Enter selects, Escape dismisses
- [ ] Selecting a block type transforms the current block or inserts a new one
- [ ] Menu supports these commands at minimum: `/h1`-`/h6`, `/bullet`, `/numbered`, `/todo`, `/code`, `/quote`, `/callout`, `/table`, `/divider`, `/image`, `/toggle`, `/math`, `/mermaid`, `/embed`
- [ ] Menu is extensible — new commands can be registered by other modules
- [ ] Menu dismisses when clicking outside or moving cursor away

## Technical Notes

### Suggested Approach
1. Use TipTap's `Suggestion` utility to handle trigger detection (`/` character), positioning, and keyboard navigation
2. Create `src/webview/components/SlashMenu.tsx` — React component for the floating menu
3. Define command registry in `src/webview/commands/slashCommands.ts` — array of `{ id, label, icon, description, command }` objects
4. Each command's `command` function calls the appropriate TipTap chain command (e.g., `editor.chain().focus().toggleHeading({ level: 1 }).run()`)
5. Implement fuzzy matching with a simple substring/token matcher (no need for a library)
6. Style the menu to match VS Code's quick pick / command palette aesthetic

### Files to Create
- `src/webview/components/SlashMenu.tsx` — Menu component
- `src/webview/commands/slashCommands.ts` — Command registry
- `src/webview/extensions/slashCommandExtension.ts` — TipTap Suggestion-based extension
- `src/webview/styles/slashMenu.css` — Menu styles

### Key Considerations
- The menu must position correctly even near the bottom/right edge of the viewport (flip above if no room below)
- Fuzzy search should match on command name and aliases (e.g., `/bullet` and `/ul` both match Bullet List)
- Performance: the menu should appear instantly (< 16ms) — no perceptible delay
- The extensibility hook is important for the Claude Code Integration feature (future `/ask-claude` commands)

## Tests Required

### Unit Tests
- [ ] `/` trigger opens menu
- [ ] Typing filters results correctly (fuzzy match)
- [ ] Arrow key navigation selects correct item
- [ ] Enter key inserts the selected block type
- [ ] Escape dismisses menu
- [ ] Empty filter shows all commands
- [ ] Unknown filter shows "no results"

### Integration Tests
- [ ] Type `/h1` + Enter → block converts to H1
- [ ] Type `/code` + Enter → code block inserted
- [ ] Type `/divider` + Enter → horizontal rule inserted
- [ ] Menu dismisses on outside click
- [ ] Menu positioned correctly near viewport edges

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
