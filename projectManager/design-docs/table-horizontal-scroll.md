# Table Horizontal Scroll & UX Redesign

**Author:** Claude (AI Agent)
**Status:** DRAFT
**Created:** 2026-04-12
**Last Updated:** 2026-04-13
**Reviewers:** Mathuran Sadagopan

---

## 1. Problem Statement

When users create or open markdown files containing tables with many columns, the table overflows or cells become unusably narrow. The editor uses `table-layout: fixed` with `width: 100%` inside a 900px container, which forces all columns to share the available width equally. A 10-column table gives each column ~80px (including padding), making content unreadable and editing frustrating. There is no horizontal scroll mechanism — the table just degrades silently.

Code blocks already handle this correctly with `overflow-x: auto`. Tables should follow the same pattern, with additional UX polish since tables are interactive (editable cells, row/column operations).

## 2. Goals and Non-Goals

### Goals

- **P0:** Tables with 6+ columns get a horizontal scroll wrapper so all columns remain usable (content-aware via 120px min-width per cell)
- **P0:** Fix the existing overflow bug where wide tables break past the editor boundary
- **P0:** Maintain round-trip fidelity — scrollable tables serialize to identical markdown
- **P1:** Column minimum width enforcement so cells never shrink below readable size (120px min content area)
- **P1:** Visual scroll indicators (edge shadows/fades) so users know content extends beyond view
- **P1:** Thin, themed scrollbar styling

### Non-Goals

- Column resizing UI (TipTap `resizable` remains `false`)
- Table alignment controls UI (alignment via markdown syntax only)
- Cell merging or split
- Table sorting or filtering
- Excel-like formula support
- Sticky first column (complex CSS `position: sticky` + `border-collapse` interactions, cross-browser quirks — separate follow-up feature)
- Scroll-snap / column-aligned scrolling (carousel-like UX is wrong for data tables — users scan fluidly)

## 3. Background and Context

### Current Implementation

| Component | File | Behavior |
|-----------|------|----------|
| CSS | `src/webview/styles/editor.css:260-280` | `table-layout: fixed; width: 100%` |
| TipTap config | `src/webview/Editor.tsx:201-204` | `Table.configure({ resizable: false })` |
| Parser | `src/markdown/handlers/table.ts` | Converts GFM table tokens to TipTap JSON |
| Serializer | `src/markdown/serializers/table.ts` | Reconstructs markdown with alignment + padding |
| Container | `src/webview/styles/editor.css:67` | `.quartz-page` max-width: 900px |
| Narrow mode | `PageContainer.tsx` + `themes.css:309` | Width < 900px → full-width, 24px padding |

### Column Width Analysis

Container usable width (standard mode):
- `.quartz-page` max-width: **900px**
- `.quartz-fluid` padding: **24px * 2 = 48px**
- Available: **~852px**

Per-column overhead:
- Cell padding: `12px * 2 = 24px`
- Border: `1px * 2 = 2px`
- Minimum readable content: ~80px (roughly 10-12 characters in default font)
- **Minimum usable column width: ~106px**

| Columns | Width per column | Usable? | Notes |
|---------|-----------------|---------|-------|
| 2 | 426px | Yes | Comfortable |
| 3 | 284px | Yes | Comfortable |
| 4 | 213px | Yes | Good |
| 5 | 170px | Yes | Acceptable |
| 6 | 142px | Marginal | Content starts wrapping frequently |
| 7 | 122px | Marginal | Near minimum threshold |
| 8 | 106px | Barely | At minimum — very tight |
| 9 | 95px | No | Below minimum, content unreadable |
| 10+ | <85px | No | Broken layout |

**Narrow mode** (viewport < 900px) — available width shrinks further, making even 5-6 columns problematic.

### Visual Validation (Screenshots)

Tables rendered in E2E harness at 900px container width with realistic content. Screenshots saved as `table-{N}-columns.png`.

| Columns | Verdict | Key Observations |
|---------|---------|------------------|
| **5** | Comfortable | All content fits on single lines, generous column widths, no wrapping |
| **6** | Degraded | Multi-word cells ("Charts integration", "Full-text search") wrap to 2 lines. Noticeably tight |
| **7** | Poor | Words break mid-word ("Authenticati-on", "Notification-s"). Headers wrap. Row heights double |
| **10** | Broken | Every cell wraps aggressively. Headers break mid-word ("Priorit-y", "Estima-te"). Unusable |

### Recommended Threshold

**5 columns** in standard mode — visually validated. Rationale:
- 5 cols: last comfortable count — all content fits on single lines, no wrapping
- 6 cols: already degraded — text wrapping begins, cells feel cramped
- 7+ cols: clearly broken — mid-word breaks, unusable column widths
- Most markdown tables in practice have 2-5 columns
- Tables with 6+ columns should scroll horizontally instead of cramming

For narrow mode (viewport < 700px), threshold drops to **3-4 columns**.

Implementation uses a **content-aware approach**: set `min-width: 120px` per cell and let `overflow-x: auto` on the wrapper handle scroll naturally. This means:
- A 4-column table with very long content might scroll
- A 6-column table with very short content (single chars) might not
- The ~5-column threshold is the typical case, but content width is the real trigger

## 4. Proposed Solution

### Overview

Wrap every table in a scroll container div. Use CSS `min-width` per cell instead of `table-layout: fixed` so columns size to content. When the table's natural width exceeds the container, the wrapper enables horizontal scroll with visual indicators.

This is purely a CSS/component change — no parser or serializer modifications needed since the table DOM structure stays the same (TipTap manages the `<table>` element).

### Architecture

```
Before:
  .quartz-editor-content
    └── table (table-layout: fixed, width: 100%)

After:
  .quartz-editor-content
    └── .quartz-table-scroll-wrapper (overflow-x: auto, position: relative)
        └── table (table-layout: auto, min-width: 100%)
            └── cells (min-width: 120px)
```

### Detailed Design

#### 4.1 ProseMirror Plugin (Table Scroll Wrapper)

New TipTap extension: `src/webview/extensions/tableScrollWrapper.ts`

A **ProseMirror plugin** that wraps each `<table>` DOM element in a scroll container div after render. This approach preserves TipTap's built-in table NodeView (cell selection, cursor handling, tab navigation) while adding scroll behavior on top.

The plugin uses the `decorations` API or a `view` plugin with DOM manipulation:

```typescript
// Plugin approach: wrap table DOM nodes post-render
class TableScrollView {
  update(view: EditorView) {
    view.dom.querySelectorAll('table').forEach((table) => {
      if (table.parentElement?.classList.contains('quartz-table-scroll-wrapper')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'quartz-table-scroll-wrapper';
      table.parentNode!.insertBefore(wrapper, table);
      wrapper.appendChild(table);
      this.observeScroll(wrapper);
    });
  }

  observeScroll(wrapper: HTMLElement) {
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = wrapper;
      const scrollable = scrollWidth > clientWidth;
      wrapper.dataset.scrollable = String(scrollable);
      wrapper.dataset.scrollStart = String(scrollLeft <= 1);
      wrapper.dataset.scrollEnd = String(scrollLeft + clientWidth >= scrollWidth - 1);
    };
    wrapper.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(wrapper);
    update();
  }
}
```

Why plugin over NodeView: TipTap's `Table` extension registers its own NodeView for cell selection, cursor management, and column width handling. Overriding it via `.extend({ addNodeView() })` would break these core table behaviors. The plugin approach wraps the existing DOM without interfering.

#### 4.2 CSS Changes

**Remove from `editor.css`:**
```css
/* Old */
.quartz-editor-content table {
  table-layout: fixed;
  width: 100%;
}
```

**Replace with:**
```css
/* Scroll wrapper */
.quartz-table-scroll-wrapper {
  overflow-x: auto;
  margin: 0.75em 0;
  position: relative;
  border-radius: 4px;
  overscroll-behavior-x: contain;
}

/* Shadow indicators — DOM elements managed by plugin, not pseudo-elements */
/* (pseudo-elements with position: sticky don't work reliably in scroll containers) */
.quartz-table-scroll-shadow {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 24px;
  pointer-events: none;
  z-index: 1;
  transition: opacity 0.2s;
  opacity: 0;
}

.quartz-table-scroll-shadow--left {
  left: 0;
  background: linear-gradient(to right, var(--quartz-bg), transparent);
}

.quartz-table-scroll-shadow--right {
  right: 0;
  background: linear-gradient(to left, var(--quartz-bg), transparent);
}

.quartz-table-scroll-wrapper[data-scroll-start="false"] .quartz-table-scroll-shadow--left {
  opacity: 1;
}

.quartz-table-scroll-wrapper[data-scroll-end="false"] .quartz-table-scroll-shadow--right {
  opacity: 1;
}

/* Table itself */
.quartz-editor-content table {
  border-collapse: collapse;
  min-width: 100%;
  margin: 0;  /* margin moves to wrapper */
}

.quartz-editor-content th,
.quartz-editor-content td {
  border: 1px solid var(--quartz-border);
  padding: 6px 12px;
  text-align: left;
  min-width: 120px;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-word;
}
```

Key changes:
- `table-layout: fixed` → removed (use auto layout)
- `width: 100%` → `min-width: 100%` (table can grow beyond container)
- Added `min-width: 120px` on cells
- Wrapper handles overflow with `overflow-x: auto`
- `overscroll-behavior-x: contain` prevents vertical scroll capture
- Shadow indicators are real DOM elements (not pseudo-elements — those don't work with sticky positioning in scroll containers)

#### 4.3 Extension Registration

In `Editor.tsx`, add the plugin as a separate extension after the Table extension:

```typescript
import { TableScrollPlugin } from './extensions/tableScrollWrapper';

// In extensions array (after Table):
Table.configure({ resizable: false }),
TableRow,
TableCell,
TableHeader,
TableScrollPlugin,  // wraps table DOM post-render
```

This keeps TipTap's table internals untouched.

#### 4.4 Scroll Indicator Logic

The plugin creates two shadow `<div>` elements inside the wrapper and updates data attributes on scroll:

```typescript
const isScrollable = scrollWidth > clientWidth;
const atStart = scrollLeft <= 1;
const atEnd = scrollLeft + clientWidth >= scrollWidth - 1;
```

Data attributes on wrapper control shadow opacity via CSS. `ResizeObserver` handles container resize (e.g., VS Code panel resize). `scroll` listener (passive) handles scroll position changes.

#### 4.5 Narrow Mode Adjustments

In narrow mode (`quartz-narrow`), reduce cell `min-width` to `100px` and reduce padding to `4px 8px` to maximize usable space before scroll kicks in.

#### 4.6 Scrollbar Styling

```css
.quartz-table-scroll-wrapper::-webkit-scrollbar {
  height: 6px;
}

.quartz-table-scroll-wrapper::-webkit-scrollbar-thumb {
  background: var(--quartz-border);
  border-radius: 3px;
}

.quartz-table-scroll-wrapper::-webkit-scrollbar-track {
  background: transparent;
}
```

Thin, themed scrollbar that doesn't disrupt the editor aesthetic.

### Component Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/webview/extensions/tableScrollWrapper.ts` | NEW | ProseMirror plugin that wraps table DOM in scroll container |
| `src/webview/styles/editor.css` | MODIFY | Replace fixed table layout, add scroll wrapper + shadow styles |
| `src/webview/styles/themes.css` | MODIFY | Theme-specific table padding adjustments for scroll |
| `src/webview/Editor.tsx` | MODIFY | Register TableScrollPlugin extension |

## 5. Alternative Solutions Considered

### Alternative A: Pure CSS with `overflow-x: auto` on table parent

**Approach:** Add a CSS rule `.quartz-editor-content table { display: block; overflow-x: auto; }` or wrap via ProseMirror decoration.

**Pros:**
- Minimal code change (1-2 lines of CSS)
- No new components

**Cons:**
- No scroll indicators — user won't know content extends
- `display: block` on `<table>` breaks table semantics and TipTap cell selection
- ProseMirror decorations for wrapping are fragile with table extensions
- No awareness of scroll state for UX hints

**Why not chosen:** Too crude. Breaks table behavior and provides poor UX.

### Alternative B: TipTap NodeView replacement

**Approach:** Override TipTap's table NodeView via `.extend({ addNodeView() })` with a custom React NodeView that wraps the table in a scroll container.

**Pros:**
- React component — familiar patterns, easier state management
- Clean integration with TipTap's extension API

**Cons:**
- TipTap's Table extension registers its own NodeView for cell selection, cursor handling, and column width management. Overriding it breaks these behaviors.
- Would need to re-implement all table internals the built-in NodeView handles
- High risk of subtle bugs in cell navigation, selection, and editing

**Why not chosen:** Too risky. TipTap's table NodeView is complex and tightly coupled to cell selection/cursor logic. ProseMirror plugin approach wraps the DOM without interfering.

### Alternative C: Hard column-count threshold with two rendering modes

**Approach:** If table has > 5 columns, render in "scroll mode" with different CSS class. Otherwise render normally.

**Pros:**
- Simple to implement
- Predictable behavior

**Cons:**
- Doesn't account for content width — a 5-column table with very long headers might still overflow
- Requires parser/component to count columns and conditionally apply classes
- Two rendering paths to maintain

**Why not chosen:** Content-aware approach (min-width + overflow wrapper) handles all cases uniformly without counting columns.

### Alternative C: Responsive column collapsing

**Approach:** On narrow viewports, collapse columns into expandable rows (like responsive data tables on mobile).

**Pros:**
- All data visible without scrolling
- Common pattern in web data tables

**Cons:**
- Completely changes the visual structure — not recognizable as a table
- Complex to implement in TipTap's contenteditable context
- Editing collapsed cells would be confusing
- Markdown doesn't have a concept of collapsed tables

**Why not chosen:** Too complex, alien UX for a markdown editor. Scroll is the standard solution.

## 6. Security, Privacy, and Compliance

No security implications. This is a pure UI/CSS change:
- No new data flows
- No external network requests
- No user data handling changes
- Table content stays in the existing markdown file

The `min-width` approach doesn't allow content injection or XSS — all table content is already sanitized through TipTap's contenteditable and the existing parser.

## 7. Testing Strategy

### Unit Tests

| Test | File | What it validates |
|------|------|-------------------|
| Round-trip wide table | `test/unit/table-scroll.test.ts` | Table with 10 columns round-trips correctly |
| Round-trip alignment + scroll | `test/unit/table-scroll.test.ts` | Aligned wide table preserves alignment markers |
| Parser: wide table | `test/parser.test.ts` (add case) | 10-column table parses into correct structure |
| Serializer: wide table | `test/serializer.test.ts` (add case) | 10-column JSON serializes to proper markdown |

### E2E Tests

| Test | Spec | What it validates |
|------|------|-------------------|
| Scroll wrapper renders | `test/e2e/specs/table-scroll.spec.ts` | Wide table has scroll wrapper, narrow table doesn't |
| Horizontal scroll works | `test/e2e/specs/table-scroll.spec.ts` | Can scroll to see hidden columns |
| Shadow indicators | `test/e2e/specs/table-scroll.spec.ts` | Right shadow visible at start, left shadow visible after scroll |
| Cell editing in scroll | `test/e2e/specs/table-scroll.spec.ts` | Can click and type in a scrolled-to cell |
| Tab navigation scrolls | `test/e2e/specs/table-scroll.spec.ts` | Tab through cells auto-scrolls wrapper |
| Keyboard shortcuts work | `test/e2e/specs/table-scroll.spec.ts` | Add row/column/delete still work in scroll mode |
| Narrow viewport | `test/e2e/specs/table-scroll.spec.ts` | Scroll activates earlier on narrow viewports |

### Manual QA

- [ ] Create table via `/table` slash command — verify no scroll for 3x3
- [ ] Add columns until scroll activates — verify smooth transition
- [ ] Scroll with mouse wheel, trackpad, and scrollbar drag
- [ ] Verify shadow indicators appear/disappear correctly
- [ ] Test in all themes (Default, Warm, Academic)
- [ ] Test narrow mode (resize VS Code panel < 900px)
- [ ] Open existing markdown with wide table — verify renders with scroll
- [ ] Edit, save, reopen — verify no markdown changes

## 8. Rollout Plan

### Phase 1: CSS + Scroll Wrapper (S scope)

**Agent delivers:**
- `TableScrollWrapper.tsx` component
- CSS changes in `editor.css` and `themes.css`
- Updated `Editor.tsx` with NodeView registration
- All existing tests passing

**Human reviews:**
- Visual appearance of tables with 3, 6, 8, 10 columns
- Scroll feel and shadow indicators
- Theme consistency

**Approved when:** Human confirms scroll behavior looks good and existing tables still render correctly.

### Phase 2: Tests + Edge Cases (S scope)

**Agent delivers:**
- Unit tests for wide table roundtrip
- E2E tests for scroll behavior
- Edge case handling (empty tables, single-column, 20+ columns)

**Human reviews:**
- Test coverage completeness
- Edge case behavior

**Approved when:** All tests pass, human satisfied with coverage.

### Phase 3: Polish (XS scope)

**Agent delivers:**
- Scrollbar styling
- Narrow mode adjustments
- Auto-scroll on Tab navigation into hidden cells
- Table hint bar positioning fix if needed

**Human reviews:**
- Final UX polish
- Interaction smoothness

**Approved when:** Human confirms production-ready.

## 9. Human Validation Plan

| Checkpoint | Agent Produces | Human Validates | Blocks |
|------------|---------------|-----------------|--------|
| Column threshold | Width analysis + screenshots (done) | Confirmed 5-col threshold | ~~Phase 1~~ Resolved |
| Visual design | Working scroll wrapper + shadows | Appearance in all themes | Phase 2 |
| Interaction quality | Working prototype | Scroll feel, tab behavior, editing in scroll | Phase 3 |

## 10. Dependencies and Risks

### Dependencies

- TipTap table extension compatibility with custom NodeView — may need fallback to ProseMirror plugin approach
- VS Code webview scrolling behavior — horizontal scroll in nested scroll containers can be tricky

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| ProseMirror plugin DOM wrapping conflicts with TipTap table updates (e.g., add column re-renders table) | High | Medium | Plugin re-checks on every `update()` — re-wraps if table lost its wrapper |
| Scroll container captures vertical scroll events | Medium | Low | `overscroll-behavior-x: contain` isolates scroll axes |
| Theme-specific padding changes break existing tables | Medium | Low | Test all 3 themes in Phase 1 |
| Performance with very large tables (50+ rows, 20+ cols) | Low | Low | `min-width` is CSS-only, no JS per-cell; scroll is native browser |

## 11. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Is 120px min column width appropriate? | Mathuran | Open — to validate in Phase 1 prototype |
| ~~2~~ | ~~Sticky first column P1 or follow-up?~~ | ~~Mathuran~~ | **Resolved** — deferred to follow-up (moved to Non-Goals) |
| ~~3~~ | ~~NodeView or ProseMirror plugin?~~ | ~~Agent~~ | **Resolved** — ProseMirror plugin (NodeView conflicts with TipTap internals) |

## 12. Implementation Issues

*To be populated after design approval via `/create-issues table-horizontal-scroll`.*

| # | Title | Status | Scope |
|---|-------|--------|-------|
| — | — | — | — |

**Progress:** 0/0 issues complete (0%)

## Appendix

### A. Code Block Scroll Reference

Current working scroll implementation for code blocks (`editor.css:201`):
```css
.quartz-editor-content pre {
  overflow-x: auto;
  /* ... */
}
```

Tables need similar treatment but with:
- Interactive content (cells are editable)
- Multi-row structure (scroll position should persist across rows)
- Visual indicators (code blocks are visually distinct; tables blend with content)

### B. Comparable Editors

| Editor | Table Scroll Behavior |
|--------|----------------------|
| Notion | Horizontal scroll with shadow indicators, sticky first column optional |
| Obsidian | Horizontal scroll, no indicators |
| Typora | Table overflows with scroll, minimal styling |
| GitHub | `overflow-x: auto` wrapper, no indicators |

Our approach most closely follows Notion's pattern — scroll + shadow indicators — as it aligns with Quartz's Notion-style design philosophy.
