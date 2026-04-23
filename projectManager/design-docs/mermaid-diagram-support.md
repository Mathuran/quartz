# Mermaid Diagram Support Design Document

**Author:** Mathuran Sadagopan
**Status:** DRAFT
**Created:** 2026-04-10
**Last Updated:** 2026-04-10
**Reviewers:** TBD

---

## 1. Problem Statement

Quartz aims to be a Notion-style WYSIWYG markdown editor, but currently treats mermaid code blocks as plain code — users see raw mermaid syntax instead of rendered diagrams. This breaks the WYSIWYG promise for one of the most common diagram formats in technical markdown. Users who open files containing ````mermaid` blocks (from GitHub READMEs, Obsidian notes, etc.) get no visual feedback. Users who want to create diagrams must leave the editor entirely. Supporting mermaid rendering inline — with a toggle to edit the source — matches user expectations set by Notion, Obsidian, and GitHub.

## 2. Goals and Non-Goals

### Goals

- **P0:** Render ````mermaid` fenced code blocks as inline SVG diagrams in the editor, defaulting to the rendered view
- **P0:** Support toggling between rendered diagram and code editing mode (click to edit, click away to render)
- **P0:** Round-trip fidelity — `parse(serialize(parse(md))) === parse(md)` for all mermaid blocks
- **P0:** Support flowchart and sequence diagram types
- **P1:** Add "Mermaid Diagram" to the slash command menu (`/mermaid`) with a starter template
- **P1:** Show a clear error state when mermaid syntax is invalid (render error message inline, not silent failure)
- **P1:** Max-height constraint on rendered diagrams with fullscreen viewer (expand icon opens a fullscreen pane with zoom and pan controls)
- **P2:** Respect VS Code theme (light/dark) for diagram colors

### Non-Goals

- Visual/drag-and-drop diagram editor — users edit mermaid syntax directly
- Exporting diagrams from the fullscreen viewer (PNG/SVG download)
- Support for all mermaid diagram types (gantt, pie, ER, state, etc.) — flowchart and sequence only for v1
- Live collaborative editing of diagrams
- Exporting diagrams as PNG/SVG files
- Mermaid syntax highlighting in code edit mode (standard code block highlighting is sufficient)

## 3. Background and Context

### Current State

Quartz's parser already extracts the `language` attribute from fenced code blocks. A ````mermaid` block today parses into a `codeBlock` node with `attrs.language = "mermaid"` and round-trips correctly. The rendering is plain monospace text with syntax highlighting via lowlight.

### How Other Editors Handle This

| Editor | Behavior |
|--------|----------|
| Obsidian | Renders mermaid in reading mode; shows code in editing mode; live preview toggles |
| Notion | Renders inline; click to edit in a modal-like code editor |
| GitHub | Renders in markdown preview; raw in edit mode |
| Typora | Renders inline; click to reveal source below |

Our approach follows the Notion/Typora pattern: **render by default, click to toggle to code**.

### Technical Context

- **mermaid.js** is the standard rendering library (~2MB minified). It takes a string of mermaid syntax and produces an SVG.
- TipTap supports custom `NodeView` components (React) for block-level content, which is exactly how our `CodeBlockNodeView` and `CalloutNodeView` already work.
- The existing code block handler/serializer already correctly parses and serializes ````mermaid` blocks — we intercept at the node view layer, not the parser layer.

## 4. Proposed Solution

### Overview

Rather than creating a separate node type for mermaid diagrams, we **intercept mermaid code blocks at the node view layer**. The parser and serializer continue treating them as `codeBlock` nodes with `language: "mermaid"`. A custom React `NodeView` detects when a code block has `language === "mermaid"` and renders the diagram instead of the code editor.

This approach gives us round-trip fidelity for free (no parser/serializer changes) and keeps the data model simple.

### Architecture

```
┌─────────────────────────────────────────────────┐
│ CodeBlockNodeView                               │
│                                                 │
│  if language === "mermaid":                     │
│    ┌─────────────────────────────────────────┐  │
│    │ MermaidBlockView                        │  │
│    │                                         │  │
│    │  [rendered mode]  ←→  [code edit mode]  │  │
│    │   SVG diagram          <textarea>       │  │
│    │   + edit button        + done button    │  │
│    └─────────────────────────────────────────┘  │
│  else:                                          │
│    existing code block UI                       │
└─────────────────────────────────────────────────┘
```

### Detailed Design

#### 4.1 New Files

| File | Purpose |
|------|---------|
| `src/webview/components/MermaidBlockView.tsx` | React component for rendering/editing mermaid blocks |
| `src/webview/components/MermaidFullscreenView.tsx` | Fullscreen pane with zoom/pan for viewing large diagrams |
| `src/webview/styles/mermaid.css` | Styles for the mermaid block (container, toggle, error, fullscreen) |

#### 4.2 Modified Files

| File | Change |
|------|--------|
| `src/webview/components/CodeBlockNodeView.tsx` | Detect `language === "mermaid"` and delegate to `MermaidBlockView` |
| `src/webview/commands/slashCommands.ts` | Add `/mermaid` slash command |
| `src/webview/components/SlashMenu.tsx` | Add mermaid case to command executor (if switch-based) |
| `package.json` | Add `mermaid` dependency |

#### 4.3 MermaidBlockView Component

```typescript
// Pseudocode for the component
interface MermaidBlockViewProps {
  content: string;           // Raw mermaid syntax
  onUpdate: (code: string) => void;  // Update node content
  theme: 'light' | 'dark';
}

// States:
// 1. RENDERED (default) — shows SVG, dedicated "Edit" pencil button in top-right corner
// 2. EDITING — shows textarea with mermaid code, "Done" button
// 3. LOADING — shows loading animation while mermaid.js lazy-loads
// 4. ERROR — shows error message + code editor (so user can fix)
```

**Rendering flow:**
1. On mount / content change: call `mermaid.render(id, content)` → get SVG string
2. Insert SVG via `dangerouslySetInnerHTML` (mermaid output is trusted, generated client-side)
3. On render error: catch exception, display error message, auto-switch to edit mode

**Toggle behavior:**
- Click the dedicated pencil edit button (top-right corner) → switch to edit mode
- Clicking the diagram body does NOT enter edit mode (prevents accidental edits)
- Click "Done" button or click outside / blur → switch to rendered mode and re-render
- On first creation (empty content) → start in edit mode with template

**Loading behavior:**
- While mermaid.js is lazy-loading, show a loading animation (subtle spinner or pulsing skeleton) inside the block container
- Once loaded, render the diagram and cache the mermaid module for subsequent blocks

**Container styling:**
- Same background color as code blocks (matches editor theme)
- No border — consistent with the code block visual language
- Diagram colors inherit from VS Code theme (mermaid `default` for light, `dark` for dark)
- **Max-height constraint** on rendered view — large diagrams are clipped with a fade/overflow indicator
- Fullscreen expand icon (top-right, alongside the edit button) opens the fullscreen viewer

**Fullscreen viewer:**
- Opens as a fullscreen overlay pane covering the editor
- Displays the rendered SVG at full resolution
- **Zoom controls:** zoom in, zoom out, reset/fit-to-screen (buttons + scroll wheel / pinch)
- **Pan:** click-and-drag to pan across the diagram when zoomed in
- **Close:** Escape key or close button returns to editor
- CSS `transform: scale()` + `translate()` for zoom/pan (GPU-accelerated, no re-renders)
- Cursor changes to `grab`/`grabbing` during pan

**Content sync:**
- In edit mode, textarea is uncontrolled (local state) for performance
- On blur / "Done": update the TipTap node content via `updateAttributes` or direct transaction
- Debounce is not needed here — we only sync on exit from edit mode

#### 4.4 Mermaid Library Loading

Lazy-load mermaid.js to avoid impacting initial editor load time:

```typescript
// In MermaidBlockView.tsx
const mermaidPromise = import('mermaid').then(m => {
  m.default.initialize({ 
    startOnLoad: false,
    theme: currentTheme === 'dark' ? 'dark' : 'default',
    securityLevel: 'strict',  // Prevents XSS in diagram labels
    flowchart: { useMaxWidth: true },
    sequence: { useMaxWidth: true },
  });
  return m.default;
});
```

- `securityLevel: 'strict'` prevents script injection through diagram labels
- `startOnLoad: false` prevents mermaid from scanning the DOM
- `useMaxWidth: true` makes diagrams responsive within the editor width
- The dynamic `import()` leverages esbuild's existing code splitting (`splitting: true` in webview config)

#### 4.5 Slash Command

```typescript
{
  id: 'mermaid',
  label: 'Mermaid Diagram',
  description: 'Flowchart or sequence diagram',
  icon: '◇',
  aliases: ['diagram', 'flowchart', 'sequence', 'chart'],
  command: (editor) => {
    editor.chain().focus().setCodeBlock({ language: 'mermaid' }).run();
    // Content will be empty — MermaidBlockView starts in edit mode
    // with a placeholder template
  },
}
```

#### 4.6 Starter Templates

When a new mermaid block is created via slash command with empty content, show a placeholder in the textarea:

```
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Result 1]
    B -->|No| D[Result 2]
```

The template is not inserted into the document until the user clicks "Done" — it's just placeholder text in the textarea.

#### 4.7 Theme Integration

Read the VS Code theme from the existing theme context (already passed to the webview). Re-initialize mermaid when theme changes:

- Light theme → `mermaid.initialize({ theme: 'default' })`
- Dark theme → `mermaid.initialize({ theme: 'dark' })`

Re-render all visible mermaid blocks on theme change.

### Key Flows

**Opening a file with mermaid blocks:**
1. Parser extracts `codeBlock` with `language: "mermaid"` (existing behavior)
2. `CodeBlockNodeView` detects mermaid language, renders `MermaidBlockView`
3. `MermaidBlockView` lazy-loads mermaid.js, renders SVG
4. User sees diagram immediately (after mermaid.js loads)

**Editing a mermaid block:**
1. User clicks rendered diagram
2. View switches to textarea with current mermaid source
3. User edits code
4. User clicks "Done" or clicks outside
5. Content syncs to TipTap node
6. Diagram re-renders with new content

**Creating a new mermaid block:**
1. User types `/mermaid` → selects from slash menu
2. Empty code block inserted with `language: "mermaid"`
3. `MermaidBlockView` starts in edit mode with template placeholder
4. User writes diagram code, clicks "Done"
5. Diagram renders

## 5. Alternative Solutions Considered

### Alternative A: Separate Node Type (`mermaidBlock`)

Create a dedicated TipTap node type for mermaid diagrams with its own parser handler and serializer.

**Pros:**
- Clean separation — mermaid logic doesn't touch code block code
- Could store parsed diagram metadata in node attrs

**Cons:**
- Requires parser changes to intercept ````mermaid` fence blocks before the code block handler
- Requires a new serializer that outputs ````mermaid` fences
- Duplicates round-trip logic that already works
- More files to maintain, more surface area for bugs

**Why not chosen:** The code block node already handles mermaid parsing and serialization perfectly. Adding a separate node type is unnecessary complexity with no user-facing benefit.

### Alternative B: Render in a Separate Panel

Show mermaid diagrams in a VS Code side panel or hover preview rather than inline.

**Pros:**
- No changes to the editor rendering pipeline
- Could use VS Code's native webview panel API

**Cons:**
- Breaks the WYSIWYG principle — diagram is not inline with content
- Poor UX for documents with multiple diagrams
- Doesn't match user expectations from Notion/Obsidian

**Why not chosen:** Contradicts Quartz's core design goal of being a WYSIWYG editor.

## 6. Security, Privacy, and Compliance

- **XSS prevention:** mermaid.js is initialized with `securityLevel: 'strict'`, which sanitizes all text labels and prevents script injection through diagram syntax
- **No external requests:** mermaid.js renders entirely client-side; no diagram data leaves the editor
- **SVG sanitization:** The rendered SVG is generated by mermaid.js locally — no user-supplied SVG is injected. `strict` security level also prevents `<foreignObject>` and event handlers in output
- **No new permissions required:** The extension already has webview access; mermaid.js runs in the existing webview sandbox
- **Dependency trust:** mermaid.js is a widely-used, actively-maintained library (50k+ GitHub stars, npm verified publisher)

## 7. Testing Strategy

### Unit Tests (Vitest)

| Test | What it validates |
|------|-------------------|
| `mermaid-roundtrip.test.ts` | ````mermaid` blocks round-trip with identical content (already true, but add explicit tests) |
| `parser-mermaid.test.ts` | Parser extracts `language: "mermaid"` and preserves diagram content exactly |
| `serializer-mermaid.test.ts` | Serializer outputs ````mermaid\n...\n```` format |

These tests validate that the parser/serializer (which are unchanged) continue to handle mermaid blocks correctly. They serve as regression guards.

### E2E Tests (Playwright)

| Test | What it validates |
|------|-------------------|
| Mermaid block renders as SVG | Open file with mermaid block → SVG element visible |
| Toggle to edit mode | Click diagram → textarea appears with mermaid source |
| Toggle back to rendered | Edit code, click outside → diagram re-renders |
| Error state | Enter invalid syntax → error message shown |
| Slash command creates block | Type `/mermaid` → select → edit mode with template |
| Round-trip via editor | Open file → edit diagram → save → reopen → diagram unchanged |
| Theme switching | Toggle dark/light → diagram theme updates |
| Max-height clipping | Large diagram is clipped in rendered view, expand icon visible |
| Fullscreen viewer opens | Click expand icon → fullscreen overlay appears with diagram |
| Fullscreen zoom/pan | Zoom in/out with controls/scroll, drag to pan |
| Fullscreen close | Press Escape or close button → returns to editor |

### Manual QA

- Open a real-world README with mermaid diagrams (e.g., from GitHub)
- Verify diagrams render at reasonable size within editor width
- Test with very large diagrams (50+ nodes) — check performance
- Test with malformed mermaid syntax — verify graceful error
- Verify large diagrams clip at max-height with fade gradient
- Click expand icon → fullscreen viewer opens with full diagram
- Zoom in/out via scroll wheel and buttons, pan via click-drag
- Fit-to-screen resets zoom and position
- Escape and close button both dismiss fullscreen
- Small diagrams that fit within max-height show no fade/expand icon

## 8. Rollout Plan

### Phase 1: Core Rendering (1 review cycle — scope S)

**Agent delivers:**
- `MermaidBlockView.tsx` component with rendered/edit/error states
- Modified `CodeBlockNodeView.tsx` to delegate mermaid blocks
- `mermaid.css` styles
- mermaid.js dependency added
- Unit roundtrip tests for mermaid blocks
- Screenshot of rendered flowchart + sequence diagram in editor

**Human reviews:**
- Visual quality of rendered diagrams (sizing, spacing, theme)
- Toggle interaction feel (click to edit, blur to render)
- Error state UX

**Approved when:** Human confirms diagrams look good and toggle feels natural

### Phase 2: Max-Height & Fullscreen Viewer (1 review cycle — scope M)

**Agent delivers:**
- Max-height constraint on rendered mermaid blocks with overflow fade
- Fullscreen expand icon in top-right toolbar
- `MermaidFullscreenView.tsx` component with zoom/pan/close
- Updated `mermaid.css` with fullscreen overlay and zoom/pan styles
- Screenshot of fullscreen viewer with a large diagram

**Human reviews:**
- Max-height value feels right (not too short, not too tall)
- Fullscreen viewer zoom/pan responsiveness
- Close behavior (Escape, button)

**Approved when:** Human confirms large diagrams are usable in both inline and fullscreen views

### Phase 3: Slash Command & Polish (1 review cycle — scope XS)

**Agent delivers:**
- Slash command `/mermaid` with starter template
- Theme integration (light/dark)
- E2E tests (rendering, toggle, slash command, error state)
- All tests passing

**Human reviews:**
- Slash command discoverability and template usefulness
- E2E test coverage adequacy

**Approved when:** Human confirms feature is complete and tests are sufficient

### Rollback Plan

The feature is entirely additive. If issues arise:
- Remove the mermaid.js dependency and `MermaidBlockView` component
- Revert the `CodeBlockNodeView` delegation — mermaid blocks render as plain code again
- No data model changes means no migration needed

## 9. Human Validation Plan

| Checkpoint | Agent Produces | Human Validates | Blocks |
|------------|---------------|-----------------|--------|
| Phase 1 delivery | Working component + screenshot | Visual design, interaction quality | Phase 2 |
| Phase 2 delivery | Max-height + fullscreen viewer + screenshot | Clipping threshold, zoom/pan feel, close behavior | Phase 3 |
| Phase 3 delivery | Slash command + E2E tests | Feature completeness, test coverage | Ship |
| Pre-ship | All tests green, package builds | Manual QA with real-world files | Release |

**Decisions resolved:**
1. ~~Diagram container styling~~ — **Decided:** No border, same background as code blocks, colors match editor theme
2. ~~Edit mode trigger~~ — **Decided:** Dedicated pencil edit button in top-right corner (not click-anywhere)
3. ~~Loading state~~ — **Decided:** Show loading animation while mermaid.js lazy-loads

## 10. Dependencies and Risks

### Dependencies

| Dependency | Type | Risk |
|------------|------|------|
| `mermaid` npm package (~2MB) | Runtime | Low — stable, widely used |
| Existing `CodeBlockNodeView` architecture | Internal | Low — well-understood pattern |
| esbuild code splitting | Build | Low — already used for lowlight |

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| mermaid.js bundle size slows initial load | Medium | Medium | Lazy-load via dynamic `import()`; mermaid only loads when a mermaid block is present |
| Rendering large diagrams causes jank | Medium | Low | Debounce re-renders; consider `requestIdleCallback` for non-visible blocks |
| mermaid.js rendering errors crash the webview | High | Low | Wrap `mermaid.render()` in try/catch; display error inline |
| Theme mismatch (mermaid theme vs. VS Code theme) | Low | Medium | Map VS Code theme to mermaid theme on init; re-render on theme change |
| Content desync between textarea and TipTap node | Medium | Low | Sync only on blur/done; use TipTap transactions for atomic updates |

## 11. Open Questions

| # | Question | Owner | Status | Blocks |
|---|----------|-------|--------|--------|
| 1 | ~~Edit button vs. click-anywhere~~ | Mathuran | RESOLVED — dedicated pencil button | — |
| 2 | ~~Loading state while mermaid.js loads~~ | Mathuran | RESOLVED — loading animation | — |
| 3 | ~~Container styling~~ | Mathuran | RESOLVED — no border, code block background, theme colors | — |
| 4 | Do we want to support additional diagram types in a fast-follow (gantt, ER, etc.)? | Mathuran | OPEN | Nothing (future scope) |

## 12. Implementation Issues

| # | Title | Status | Scope |
|---|-------|--------|-------|
| [001](../issues/mermaid-diagram-support/001-core-mermaid-rendering.md) | Core Mermaid Block Rendering | TODO | M |
| [002](../issues/mermaid-diagram-support/002-fullscreen-viewer.md) | Max-Height Constraint & Fullscreen Diagram Viewer | TODO | M |
| [003](../issues/mermaid-diagram-support/003-slash-command-theme-e2e.md) | Slash Command, Theme Integration & E2E Tests | TODO | S |

**Progress:** 0/3 issues complete (0%)
