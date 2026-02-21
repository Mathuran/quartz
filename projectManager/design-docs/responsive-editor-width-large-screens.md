# Responsive Editor Width for Large Screens — Design Document

**Author:** Agent
**Status:** DRAFT
**Created:** 2026-02-21
**Last Updated:** 2026-02-21 (reviewed)
**Reviewers:** Mathuran
**Backlog Item:** [responsive-editor-width-large-screens](../backlog/responsive-editor-width-large-screens.md)

## 1. Problem Statement

On large high-resolution displays (e.g., 4K 27" monitors), the Quartz editor's fixed 816px page width (A4 at 96 DPI) leaves most of the viewport empty. The editor content feels cramped and small relative to the screen, significantly degrading the writing experience for users with external monitors or large built-in displays. On a 14" MacBook the same 816px width fills the panel comfortably and looks great — the problem is entirely one of scaling.

Not solving this means every user with a monitor larger than ~15" has a suboptimal experience, which is a significant portion of the target audience (developers using VS Code often have external monitors).

## 2. Goals and Non-Goals

### Goals

- **P0:** Replace the fixed `pageWidth` with a responsive formula (`containerWidth / √2`) so the editor content area scales proportionally with the available viewport width
- **P0:** Maintain identical appearance on ~14" laptop screens (816px page width at typical VS Code panel widths) — zero visual regression
- **P1:** The width must update live when the user resizes the VS Code panel, splits editors, or toggles sidebars
- **P1:** Enforce a minimum width of 600px to prevent the page from becoming too narrow on small panels (no maximum cap — the √2 ratio inherently prevents the page from being too wide)

### Non-Goals

- User-configurable width settings or VS Code settings integration (follow-up feature)
- Changes to the fluid/non-page layout mode (already uses `max-width: 100%`)
- Print or export-specific formatting
- Multi-column or split-pane editor layouts

## 3. Background and Context

### Current Implementation

The page width is controlled in `PageContainer.tsx` (line 35):

```tsx
<div className="quartz-page" style={{ maxWidth: `${config.pageWidth}px` }}>
```

Where `config.pageWidth` defaults to `816` (set in `App.tsx` line 21). This value comes from the A4 paper width at 96 DPI (8.5" × 96 = 816px).

The component already has a `ResizeObserver` that tracks the container width for a narrow-viewport breakpoint (`< 600px` switches to fluid layout). This observer can be leveraged for the responsive width calculation.

### Key insight

The A4 page has a 1:√2 aspect ratio. By using `width = containerWidth / √2`, we preserve this proportional relationship dynamically. On a typical 14" MacBook with VS Code sidebars open, the panel width is ~1100-1200px, giving `1150 / 1.414 ≈ 813px` — almost exactly the current 816px. The formula naturally produces the "right" width at every scale.

## 4. Proposed Solution

### Overview

Modify `PageContainer.tsx` to compute the page `maxWidth` dynamically from the observed container width using the formula `containerWidth / √2`, with a minimum of 600px and no maximum cap. Remove `pageWidth` from `EditorConfig` entirely — use a hardcoded 816px initial value before the first `ResizeObserver` callback fires.

### Detailed Design

**File:** `src/webview/components/PageContainer.tsx`

The existing `ResizeObserver` already tracks `entry.contentRect.width`. We extend this to also compute the responsive page width:

```tsx
const SQRT2 = Math.SQRT2; // 1.4142135623730951
const MIN_PAGE_WIDTH = 600;
const DEFAULT_PAGE_WIDTH = 816; // A4 at 96 DPI — used before ResizeObserver fires

export function computePageWidth(containerWidth: number): number {
  const responsive = containerWidth / SQRT2;
  return Math.max(MIN_PAGE_WIDTH, Math.round(responsive));
}
```

In the component:

```tsx
const [pageWidth, setPageWidth] = useState(DEFAULT_PAGE_WIDTH); // before ResizeObserver fires

useEffect(() => {
  if (!containerRef.current) return;
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const w = entry.contentRect.width;
      setIsNarrow(w < 600);
      setPageWidth(computePageWidth(w));
    }
  });
  observer.observe(containerRef.current);
  return () => observer.disconnect();
}, []);
```

Then use the computed `pageWidth` instead of `config.pageWidth`:

```tsx
<div className="quartz-page" style={{ maxWidth: `${pageWidth}px`, padding: `${config.pageMargin}px` }}>
```

### Width behavior at common viewport sizes

| Viewport/Panel Width | Computed Page Width | Notes |
|---------------------|-------------------|-------|
| 500px | 600px (min) | Narrow — likely switches to fluid |
| 800px | 600px (min) | Small panel |
| 1000px | 707px | Compact but comfortable |
| 1150px | 813px | ~14" MacBook — matches current A4 |
| 1500px | 1061px | External monitor |
| 1920px | 1358px | Full HD monitor |
| 2560px | 1811px | 4K 27" monitor |
| 3440px | 2433px | Ultra-wide 34" |

### Config Cleanup

Remove `pageWidth` from `EditorConfig` in `src/webview/types.ts` and its default value in `App.tsx`. The page width is now computed dynamically, not configured. Files affected:
- `src/webview/types.ts` — remove `pageWidth` field
- `src/webview/App.tsx` — remove `pageWidth: 816` from default config
- `src/QuartzEditorProvider.ts` — remove any `pageWidth` config propagation (if present)

### CSS Changes

None required. The styling is already inline via the `style` prop. The `quartz-page` class provides the visual treatment (background, shadow, border-radius) and is width-agnostic.

## 5. Alternative Solutions Considered

### Alternative A: Pure CSS with `calc(100vw / 1.414)`

**Approach:** Replace the inline `maxWidth` with a CSS `calc()` expression using viewport units.

**Pros:**
- No JavaScript computation needed
- Responds to viewport changes automatically via CSS

**Cons:**
- `100vw` represents the full browser viewport, not the VS Code webview panel width. In VS Code, the webview panel is often much narrower than the full viewport due to sidebars, activity bar, and editor splits. This makes `vw` units unreliable.
- Cannot use container query units (`cqw`) without additional container setup
- Less control over clamping and fallback behavior

**Verdict:** Rejected because `vw` units don't reflect the actual panel width in VS Code's webview context.

### Alternative B: Make `pageWidth` a VS Code setting with "auto" option

**Approach:** Add a VS Code configuration setting `quartz.pageWidth` with options like `"auto"`, `"narrow"`, `"medium"`, `"wide"`, or a custom pixel value. "Auto" would use the √2 formula.

**Pros:**
- Maximum user control
- Could address different preferences (some users want narrow, some want wide)

**Cons:**
- More complex to implement (VS Code settings, config propagation, UI for selection)
- Over-engineers the immediate problem — the √2 formula already produces the right width at every scale
- Can be added later as a follow-up if users want manual control

**Verdict:** Deferred. The automatic √2 scaling solves the core problem. A settings-based approach can be layered on top later.

## 6. Security, Privacy, and Compliance

No security implications. This change is purely a CSS/layout computation within the webview. No data leaves the extension, no new APIs are called, no user data is processed.

## 7. Testing Strategy

### Unit Tests

- Test `computePageWidth()` function with various container widths:
  - Below minimum → returns 600
  - At 1150px → returns ~813 (matches A4)
  - At 1920px → returns ~1358
  - At 2560px → returns ~1811 (4K monitor, no cap)
  - Edge cases: 0, negative, very large numbers

### E2E Tests

- **Regression test:** Verify the editor renders at a reasonable width (not testing exact pixels, but confirming the page element exists and has a computed width within expected bounds)
- No new E2E specs needed — existing visual tests cover editor rendering

### Manual QA

- Open Quartz on a 14" MacBook — confirm the editor looks identical to before
- Open Quartz on a 4K 27" monitor — confirm the editor is noticeably wider and fills the space better
- Resize the VS Code panel — confirm the editor width adjusts smoothly
- Split editors side-by-side — confirm each panel gets an appropriate width
- Toggle the sidebar — confirm the editor width adjusts

## 8. Rollout Plan

### Phase 1: Implementation (1 review cycle — XS)

- **Agent delivers:** Modified `PageContainer.tsx` with responsive width calculation, unit tests for `computePageWidth()`, all existing tests passing
- **Human reviews:** Visual behavior on available screens (resize the panel to simulate different sizes), confirm no regression on laptop-sized viewports
- **Approved when:** Human confirms the editor looks good at multiple panel widths

This is a single-phase change. The implementation is ~15 lines of code in one file plus a small unit test.

## 9. Human Validation Plan

| Checkpoint | Agent Produces | Human Validates | Blocks |
|------------|---------------|-----------------|--------|
| Implementation complete | Modified `PageContainer.tsx`, unit tests, passing CI | Visual check at multiple panel widths — does it feel right? | Ship |

**Decision points (all resolved):**
- ~~Min/max width bounds~~ → min 600px, no max cap
- ~~Config cleanup~~ → remove `pageWidth` from `EditorConfig`

## 10. Dependencies and Risks

**Dependencies:** None. This is a self-contained change to one component.

**Risks and Mitigations:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| ResizeObserver fires frequently during resize, causing jank | Low | Low | ResizeObserver is already used and performant; React batches state updates. `Math.round()` prevents sub-pixel thrashing. |
| Extremely wide panels produce very wide pages | Low | Low | The √2 ratio keeps pages at ~70% of panel width, which remains readable. Can add a max cap later if needed. |
| Editor content reflows on every panel resize | Low | Medium | Expected and acceptable — this is how responsive layouts work. Content reflow is instant for text. |

## 11. Open Questions

| Question | Owner | Status |
|----------|-------|--------|
| ~~Are the min/max bounds appropriate?~~ | Human | **Resolved** — min 600px, no max cap. The √2 ratio inherently limits width to ~70% of panel. |
| Remove `pageWidth` from `EditorConfig`? | Human | **Resolved** — yes, remove it entirely. Use hardcoded 816px initial value. |

## 12. Implementation Issues

*To be populated after design doc approval via `/create-issues`.*

## Appendix

### The √2 Formula

A4 paper dimensions: 210mm × 297mm. The ratio 297/210 = √2 ≈ 1.414.

At 96 DPI, A4 width = 8.27" × 96 = 794px (often rounded to 816px including margins).

The formula `width = container / √2` preserves this ratio dynamically:
- Container 1150px → 813px (≈ A4)
- Container 1920px → 1358px (≈ proportionally scaled A4)

This means the editor always occupies the same *proportion* of the available space, regardless of screen size.
