# [002] Max-Height Constraint & Fullscreen Diagram Viewer

## Metadata
- **Status:** DONE
- **Depends On:** 001
- **Blocks:** 003
- **Scope:** M
- **Design Doc:** [mermaid-diagram-support](../../design-docs/mermaid-diagram-support.md)

## Description

Add a max-height constraint on rendered mermaid diagrams so large diagrams don't dominate the page. Add a fullscreen expand icon that opens a fullscreen overlay pane where users can view the full diagram with zoom and pan controls.

## Acceptance Criteria

- [ ] Rendered mermaid blocks have a max-height (overflow clipped with a fade indicator)
- [ ] Fullscreen expand icon visible in top-right corner (alongside edit button)
- [ ] Clicking expand icon opens a fullscreen overlay pane covering the editor
- [ ] Fullscreen pane shows the complete rendered SVG at full resolution
- [ ] Zoom in/out via buttons and scroll wheel (or pinch)
- [ ] Reset/fit-to-screen button
- [ ] Click-and-drag to pan when zoomed in
- [ ] Cursor shows `grab` / `grabbing` during pan
- [ ] Escape key or close button dismisses fullscreen
- [ ] Small diagrams that fit within max-height show no fade/expand indicator
- [ ] Existing edit button still works alongside expand button

## Human Review Focus

- **Look at:** Max-height threshold — is the cutoff reasonable for typical diagrams?
- **Test:** Open large diagram fixture, click expand, zoom in/out, pan around, close. Try small diagram — confirm no unnecessary expand icon.
- **Decide:** Is the max-height value right? Should it be configurable?

## Agent Autonomy Notes

- **Agent can decide:** Max-height pixel value, fade gradient style, zoom step increments, button icons, animation easing
- **Escalate to human:** If max-height feels wrong during testing (too short clips simple diagrams, too tall defeats the purpose)

## Technical Notes

### Suggested Approach
1. Add `max-height` + `overflow: hidden` to `.quartz-mermaid-rendered` in `mermaid.css`
2. Add a fade gradient at the bottom when content overflows (CSS `::after` pseudo-element or overlay div)
3. Detect overflow via `scrollHeight > clientHeight` to conditionally show the expand icon
4. Create `src/webview/components/MermaidFullscreenView.tsx`:
   - Renders as a fixed-position overlay (`position: fixed; inset: 0; z-index: 9999`)
   - Receives the SVG string as prop
   - Uses CSS `transform: scale() translate()` for zoom/pan (GPU-accelerated)
   - Zoom: track scale factor in state, scroll wheel adjusts it, min 0.25x / max 4x
   - Pan: `onMouseDown` starts pan, `onMouseMove` updates translate, `onMouseUp` stops
   - Toolbar: zoom in (+), zoom out (-), fit to screen, close (X)
   - Escape keydown listener to close
5. Add expand icon button to `MermaidBlockView` rendered state (next to pencil button)
6. Use React portal (`createPortal`) for the fullscreen overlay so it escapes the TipTap node view

### Files to Create
- `src/webview/components/MermaidFullscreenView.tsx` — fullscreen overlay with zoom/pan

### Files to Modify
- `src/webview/components/MermaidBlockView.tsx` — add max-height overflow detection, expand button, fullscreen state
- `src/webview/styles/mermaid.css` — max-height, fade gradient, fullscreen overlay styles

### Key Considerations
- Use `useRef` + `ResizeObserver` or check on render to detect overflow (don't assume all diagrams overflow)
- `createPortal` to `document.body` so overlay isn't clipped by TipTap node view overflow
- `transform` for zoom/pan avoids layout thrashing — pure GPU compositing
- Trap focus inside fullscreen overlay for accessibility
- Prevent body scroll while fullscreen is open

## Tests Required

### Unit Tests
- [ ] N/A — this is purely UI, covered by E2E

### E2E Tests (in issue 003)
- [ ] Large diagram shows max-height clipping with fade
- [ ] Small diagram renders without clipping/fade
- [ ] Expand icon opens fullscreen overlay
- [ ] Zoom controls work (in, out, reset)
- [ ] Escape closes fullscreen

### Manual Testing
- [ ] Open `mermaid-large.md` — diagrams clipped at max-height with fade
- [ ] Click expand → fullscreen pane opens with full diagram
- [ ] Scroll wheel zooms in/out smoothly
- [ ] Click-drag pans the diagram when zoomed
- [ ] Fit-to-screen button resets zoom and position
- [ ] Escape and close button both dismiss overlay
- [ ] Open `mermaid-test.md` small flowchart — no clipping, no fade

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Manual testing scenarios verified
- [ ] Human review completed (max-height threshold, zoom/pan feel)
- [ ] No regressions in existing mermaid rendering or editing
