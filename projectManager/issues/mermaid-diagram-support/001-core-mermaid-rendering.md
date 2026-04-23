# [001] Core Mermaid Block Rendering

## Metadata
- **Status:** DONE
- **Depends On:** None
- **Blocks:** 002, 003
- **Scope:** M
- **Design Doc:** [mermaid-diagram-support](../../design-docs/mermaid-diagram-support.md)

## Description

Build the `MermaidBlockView` React component and integrate it into `CodeBlockNodeView`. When a code block has `language === "mermaid"`, delegate rendering to `MermaidBlockView` which:
- Lazy-loads mermaid.js with a loading animation
- Renders flowchart/sequence diagrams as inline SVG (default state)
- Shows dedicated pencil edit button in top-right corner
- Toggles to textarea code editor on edit button click
- Re-renders diagram on "Done" / blur
- Shows error state with message for invalid syntax
- Uses same background as code blocks, no border

No parser/serializer changes needed — mermaid blocks already round-trip as `codeBlock` nodes.

## Acceptance Criteria

- [ ] Mermaid code blocks render as SVG diagrams by default
- [ ] Loading animation shows while mermaid.js lazy-loads
- [ ] Pencil edit button visible in top-right corner of rendered diagram
- [ ] Clicking edit button switches to textarea with mermaid source
- [ ] Clicking "Done" or blurring textarea re-renders diagram
- [ ] Invalid mermaid syntax shows error message inline
- [ ] Error state auto-switches to edit mode so user can fix
- [ ] Container has same background as code blocks, no border
- [ ] mermaid.js initialized with `securityLevel: 'strict'`
- [ ] Diagrams use `useMaxWidth: true` for responsive sizing
- [ ] Existing code blocks unaffected (only `language === "mermaid"` intercepted)
- [ ] Unit roundtrip tests pass for mermaid blocks
- [ ] Existing test suite passes with no regressions

## Human Review Focus

- **Look at:** Visual quality of rendered diagrams — sizing, spacing, alignment within editor
- **Test:** Toggle between rendered and edit mode. Try valid flowchart, valid sequence diagram, and invalid syntax.
- **Decide:** Is the loading animation acceptable? Is the edit button placement/style right?

## Agent Autonomy Notes

- **Agent can decide:** Internal component structure, state management approach, loading animation style, exact CSS values, error message wording
- **Escalate to human:** If mermaid.js bundle causes build issues, if SVG rendering has unexpected visual artifacts

## Technical Notes

### Suggested Approach
1. `npm install mermaid`
2. Create `src/webview/components/MermaidBlockView.tsx` with 4 states: LOADING, RENDERED, EDITING, ERROR
3. Create `src/webview/styles/mermaid.css` — container matches code block background, no border
4. Modify `src/webview/components/CodeBlockNodeView.tsx` — detect `language === "mermaid"`, delegate to `MermaidBlockView`
5. Lazy-load mermaid via `import('mermaid')` — esbuild code splitting handles chunking
6. Initialize mermaid with `startOnLoad: false`, `securityLevel: 'strict'`, `useMaxWidth: true`
7. Add unit roundtrip tests for mermaid blocks

### Files to Create
- `src/webview/components/MermaidBlockView.tsx` — main component
- `src/webview/styles/mermaid.css` — styles

### Files to Modify
- `src/webview/components/CodeBlockNodeView.tsx` — add mermaid delegation
- `package.json` — add mermaid dependency

### Key Considerations
- Wrap `mermaid.render()` in try/catch — never let render errors crash the webview
- Cache the mermaid module after first `import()` — don't re-load for each block
- Each mermaid render call needs a unique element ID
- `dangerouslySetInnerHTML` is acceptable here since SVG is generated locally by mermaid.js with strict security
- Content sync only on blur/"Done" — no debounce needed during editing

## Tests Required

### Unit Tests
- [ ] Mermaid fenced code block parses to `codeBlock` with `language: "mermaid"` (regression guard)
- [ ] Mermaid `codeBlock` serializes back to ````mermaid\n...\n```` format (regression guard)
- [ ] Mermaid block round-trips: `parse(serialize(parse(md))) === parse(md)` for flowchart and sequence content
- [ ] Round-trip preserves exact diagram content (whitespace, indentation)

### Manual Testing
- [ ] Open a markdown file with a mermaid flowchart block — diagram renders
- [ ] Open a markdown file with a mermaid sequence diagram — diagram renders
- [ ] Click edit button → see mermaid source in textarea
- [ ] Edit source, click Done → diagram re-renders with changes
- [ ] Enter invalid syntax → error message shown, edit mode available
- [ ] Verify existing code blocks (JS, Python, etc.) render normally

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Manual testing scenarios verified
- [ ] Human review completed (visual quality, interaction feel)
- [ ] No regressions in existing functionality
