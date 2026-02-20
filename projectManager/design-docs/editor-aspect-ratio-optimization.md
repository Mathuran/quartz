# Editor Aspect Ratio Optimization Design Document

**Author:** Claude (AI Assistant)
**Status:** APPROVED
**Created:** 2026-02-17
**Last Updated:** 2026-02-18
**Reviewers:** [To be assigned]

---

## 1. Problem Statement

The Quartz markdown editor currently uses a fixed 816px page width (matching US Letter paper width at 96 DPI), which was chosen arbitrarily based on print conventions rather than screen-first design principles. In VSCode's wide workspace environment—where monitors commonly exceed 1920px width—this creates a centered, narrow column floating in a sea of empty space. The current implementation doesn't leverage mathematical proportions known to optimize readability, aesthetics, and cognitive comfort.

Users working on ultra-wide monitors (2560px+) experience a disconnect: the editor feels cramped for content while simultaneously wasting 60%+ of available screen real estate. The 816px width produces approximately 90-100 characters per line at default font sizes, exceeding the research-backed optimal range of 50-75 characters for comfortable reading.

**Target Users:** Our primary users are **developers writing technical documentation and design documents**. Their content includes:

- Prose explanations and specifications
- **Code blocks** (typically 80-120 character line limits per style guides)
- **Mermaid diagrams** (can require significant horizontal space to render)
- Tables, API specifications, and configuration examples

This mixed-content use case requires balancing prose readability with code/diagram accommodation.

**Impact of not solving:** Users experience suboptimal readability, eye fatigue on long editing sessions, and a design that feels neither modern nor intentionally crafted. Code blocks wrap awkwardly or require horizontal scrolling.

---

## 2. Goals and Non-Goals

### Goals

| Priority | Goal                                                                       | Success Metric                                                                                |
| -------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **P0**   | Identify mathematically optimal aspect ratio for developer documentation   | Document ratio selection with supporting research; user preference surveys show ≥70% approval |
| **P0**   | Achieve 75-90 characters per line for prose (accommodating code at 80-120) | Prose CPL in target range; code blocks don't wrap at 80 chars                                 |
| **P0**   | Code blocks and Mermaid diagrams render without awkward wrapping           | 80-char code lines fit; common Mermaid diagrams don't overflow                                |
| **P1**   | Implement configurable width presets based on mathematical ratios          | Users can select from √2, Golden Ratio, π-derived, and custom widths                          |
| **P1**   | Maintain visual harmony across different viewport sizes                    | Consistent proportional behavior from 1280px to 3840px viewports                              |
| **P2**   | Optimize vertical rhythm and page margins using same ratio principles      | Line-height and margins follow selected ratio system                                          |

### Non-Goals

- **Not changing the fundamental page-centered layout** — the "page floating on canvas" metaphor is retained
- **Not implementing dynamic responsive reflow** — width stays fixed within chosen mode (page vs fluid already exists)
- **Not supporting print-first ratios** — this is a screen-first design; print export can apply different rules
- **Not creating a visual theme system** — this focuses on geometry, not colors/typography style
- **Not implementing "focus mode" or "zen mode"** — that's a separate feature concern

---

## 3. Background and Context

### Current Implementation

The Quartz editor currently uses:

- **Page width:** 816px (configurable via `quartz.editor.pageWidth`)
- **Page margin:** 72px (configurable via `quartz.editor.pageMargin`)
- **Effective content width:** 672px (816 - 72×2)
- **Responsive breakpoint:** 600px (switches to fluid layout)
- **Aspect ratio comment:** "height = width × √2" (but not enforced)

The 816px default comes from US Letter paper (8.5" × 96 DPI), a print-world convention that doesn't translate well to screen-first design.

### Historical Context of Aspect Ratios in Design

**The √2 Ratio (1:1.414...)**

- First proposed by Georg Christoph Lichtenberg in 1786
- Became ISO 216 standard (A4 paper) in 1922 via Dr. Walter Porstmann
- Key property: folding in half preserves the ratio
- Used by: ISO paper sizes, many European design systems

**The Golden Ratio φ (1:1.618...)**

- Known since ancient Greece (Euclid's Elements, ~300 BC)
- Named "divine proportion" by Luca Pacioli (1509)
- Related to Fibonacci sequence (adjacent terms approach φ)
- Used by: Classical architecture, Renaissance art, Apple design language

**Other Mathematical Ratios**

- **π/2 (1:1.571...):** Between √2 and φ; found in circular geometries
- **e/2 (1:1.359...):** Natural logarithm base; appears in growth curves
- **√3 (1:1.732...):** Hexagonal geometry; wider than φ
- **√5 (1:2.236...):** Very wide; pentagonal diagonal ratio

### Typography Research on Line Length

Research consistently indicates optimal line lengths for readability:

| Source                          | Optimal Range    | Notes                                           |
| ------------------------------- | ---------------- | ----------------------------------------------- |
| Baymard Institute               | 50-75 characters | Product descriptions >80 chars skipped 41% more |
| WCAG 2.1                        | ≤80 characters   | Accessibility guideline                         |
| British Dyslexia Association    | 60-70 characters | 27% faster reading for dyslexic readers         |
| Classic typography (Bringhurst) | 45-75 characters | 66 characters cited as ideal                    |

At 16px font size with average character width of ~8px:

- 50 characters ≈ 400px content width
- 66 characters ≈ 528px content width
- 75 characters ≈ 600px content width

### Developer Documentation Requirements

**Code Block Considerations:**

- PEP 8 (Python): 79 characters max, 99 for some projects
- Prettier/ESLint defaults: 80-100 characters
- Go: 80-120 characters common
- Rust: 100 characters (rustfmt default)

At monospace font (typically ~9.6px per character at 16px font-size):

- 80 characters ≈ 768px minimum content width
- 100 characters ≈ 960px minimum content width
- 120 characters ≈ 1152px minimum content width

**Mermaid Diagram Considerations:**

- Simple flowcharts: 400-600px width
- Sequence diagrams: 600-900px width (depends on participant count)
- Class diagrams: 700-1200px width
- ER diagrams: 800-1400px width

**Key Insight:** For developer documentation, the limiting factor is often **code blocks and diagrams**, not prose. A layout optimized purely for prose readability (66 chars) will frustrate developers with wrapped code.

**Hybrid Approach Consideration:** Prose should follow typography best practices (75-85 chars), while code blocks should have **full-width or near-full-width** rendering within the page container.

### Competitive Analysis

| Editor              | Default Width | Ratio Used | Code Handling          | Notes                         |
| ------------------- | ------------- | ---------- | ---------------------- | ----------------------------- |
| **GitHub README**   | ~888px        | None       | Full-width code blocks | Developer-focused             |
| **GitBook**         | ~768px        | None       | Full-width code blocks | Documentation platform        |
| **Notion**          | ~700px        | None       | Full-width code blocks | Block-based                   |
| **Obsidian**        | ~700px        | None       | Full-width code blocks | "Readable Line Length" plugin |
| **Docusaurus**      | ~996px        | None       | Full-width code blocks | React docs framework          |
| **MkDocs Material** | ~800px        | None       | Full-width code blocks | Technical docs                |
| **Typora**          | ~800px        | None       | Inline                 | "Distraction-free"            |
| **iA Writer**       | ~512px        | ~64 chars  | Minimal                | Prose-focused                 |
| **Google Docs**     | 816px         | US Letter  | N/A                    | Print-first                   |

**Pattern observed:** Developer documentation tools consistently use 768-996px content widths with full-width code blocks.

---

## 4. Proposed Solution

### Overview

We propose implementing a **ratio-based width system** optimized for developer documentation that:

1. Calculates page width using mathematical ratios that accommodate code (80+ chars)
2. Provides preset modes balancing prose readability with code/diagram requirements
3. Uses a **hybrid approach**: optimal prose width with full-width code blocks
4. Maintains the page-centered aesthetic while optimizing for technical content

The default ratio will be **√2 (Lichtenberg ratio)** with **800px content width**, which:

- Accommodates 80-character code lines in monospace
- Provides ~85 characters for prose (acceptable per research)
- Has mathematical elegance (ISO paper standard heritage)

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VSCode Viewport                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Page Wrapper (flex center)               │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                    Page Container                    │  │  │
│  │  │   width = min(maxWidth, viewport / ratio)           │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │         Prose Content (indented)               │  │  │  │
│  │  │  │   margin = contentWidth × marginRatio          │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │    Code Block (full page width, no margin)    │  │  │  │
│  │  │  │         Mermaid Diagram (full width)          │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Ratio Presets (Developer-Optimized)

| Preset Name   | Ratio         | Content Width | Prose Chars | Code Chars (mono) | Use Case                     |
| ------------- | ------------- | ------------- | ----------- | ----------------- | ---------------------------- |
| **Prose**     | φ (1.618)     | 672px         | ~84 chars   | ~70 mono          | Long-form writing            |
| **Developer** | √2 (1.414)    | 800px         | ~100 chars  | ~83 mono          | **Technical docs (DEFAULT)** |
| **Technical** | e/2 (1.359)   | 880px         | ~110 chars  | ~92 mono          | Heavy code/diagrams          |
| **Wide**      | √3/√2 (1.225) | 960px         | ~120 chars  | ~100 mono         | API docs, wide tables        |
| **Classic**   | —             | 816px         | ~102 chars  | ~85 mono          | Current behavior             |
| **Custom**    | User-defined  | User-defined  | Varies      | Varies            | Power users                  |

**Why √2 as Default:**

1. **Mathematical elegance:** Same ratio as A4/ISO paper—folding in half preserves proportions
2. **800px sweet spot:** Fits 80-char code lines in monospace; ~100 chars prose is acceptable for technical content
3. **Historical precedent:** Lichtenberg ratio (1786) → ISO 216 (1922) → international standard
4. **Developer familiarity:** Developers know √2 from paper sizes; feels "right"

### The Unified √2 Design System

**Every dimension derives from √2:**

```
┌─────────────────────────────────────────────────────────────────┐
│                         √2 GOVERNS ALL                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HORIZONTAL (width)           VERTICAL (spacing)                │
│  ─────────────────           ──────────────────                 │
│                                                                 │
│  viewport ÷ √2 = content     base × √2³ = H1 top (45px)        │
│  content ÷ √2⁴ = margin      base × √2² = H2 top (32px)        │
│  margin × 2 + prose = 800    base × √2¹ = H3 top (23px)        │
│                              base × √2⁰ = paragraph (16px)      │
│                              base × √2⁻² = list gap (8px)       │
│                              base × √2⁻⁴ = item gap (4px)       │
│                                                                 │
│  INDENTATION                 LINE HEIGHT                        │
│  ───────────                 ───────────                        │
│                                                                 │
│  list indent = √2¹ (23px)    code = √2 (1.414)                 │
│  nested = +√2¹ per level     prose = 1.5 (compromise)           │
│  blockquote = √2¹ (23px)     heading = 1.25 (tight)             │
│                                                                 │
│  BORDERS                     TYPOGRAPHY                         │
│  ───────                     ──────────                         │
│                                                                 │
│  blockquote = √2⁻⁴ (4px)     H1 = base × √2^2.5 ≈ 38px         │
│  inline-code = √2⁻⁴ radius   H2 = base × √2²   = 32px          │
│                              H3 = base × √2^1.5 ≈ 27px         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**The beauty of √2:** Every measurement relates to every other by powers of √2. Double any spacing? Go up 2 steps. Half it? Go down 2 steps. This creates **perceptual harmony**—the same proportional relationship at every scale, just like ISO paper sizes.

### Detailed Design

#### Configuration Schema (v1 - Single Preset)

```typescript
// v1: Replace existing pageWidth/pageMargin settings
// Old settings (REMOVED):
//   - quartz.editor.pageWidth (was 816px)
//   - quartz.editor.pageMargin (was 72px)

// New: No user-facing settings in v1
// The √2 system is the default and only option
// Settings will be added in v2 when multiple presets ship

interface EditorLayoutConfig {
  // Existing (unchanged)
  pageLayout: boolean;         // Enable page view vs fluid

  // v1: Hardcoded to Developer preset
  // Derived values (not user-configurable in v1):
  //   contentWidth: 800px
  //   proseMargin: 48px
  //   proseWidth: 704px
  //   lineHeight: 1.414 (√2)
}

// v2 (future): Add preset selection
// layoutMode: 'prose' | 'developer' | 'technical' | 'wide';
```

#### Default Values by Mode

```typescript
const PHI = 1.618033988749895;
const SQRT2 = 1.4142135623730951;
const E_HALF = 1.3591409142295225;
const SQRT3_SQRT2 = 1.224744871391589; // √3/√2

const LAYOUT_PRESETS = {
  prose: {
    ratio: PHI,                  // 1.618
    maxContentWidth: 672,        // ~84 chars prose, ~70 mono
    marginRatio: 0.08,           // ~54px margins
    lineHeightRatio: 1.618,      // Golden ratio line height
    codeBlockFullWidth: true,    // Code blocks ignore prose margins
  },
  developer: {
    ratio: SQRT2,                // 1.414 (Lichtenberg/ISO)
    maxContentWidth: 800,        // ~100 chars prose, ~83 mono
    marginRatio: 0.06,           // ~48px margins
    lineHeightRatio: 1.5,
    codeBlockFullWidth: true,    // DEFAULT
  },
  technical: {
    ratio: E_HALF,               // 1.359 (Euler-derived)
    maxContentWidth: 880,        // ~110 chars prose, ~92 mono
    marginRatio: 0.05,           // ~44px margins
    lineHeightRatio: 1.45,
    codeBlockFullWidth: true,
  },
  wide: {
    ratio: SQRT3_SQRT2,          // 1.225
    maxContentWidth: 960,        // ~120 chars prose, ~100 mono
    marginRatio: 0.04,           // ~38px margins
    lineHeightRatio: 1.4,
    codeBlockFullWidth: true,
  },
  classic: {
    ratio: 1,                    // Fixed width (current behavior)
    maxContentWidth: 816,
    marginRatio: 0.088,          // 72px margins
    lineHeightRatio: 1.7,
    codeBlockFullWidth: false,   // Preserve current behavior
  },
};
```

#### Hybrid Code Block Handling

Code blocks and Mermaid diagrams should expand to full page width, ignoring prose margins:

```css
/* Prose content respects margins */
.quartz-editor-content > p,
.quartz-editor-content > ul,
.quartz-editor-content > ol,
.quartz-editor-content > blockquote {
  max-width: calc(var(--content-width) - var(--prose-margin) * 2);
  margin-left: var(--prose-margin);
  margin-right: var(--prose-margin);
}

/* Code blocks, diagrams, and tables use full width */
.quartz-editor-content > pre,
.quartz-editor-content > .mermaid,
.quartz-editor-content > table {
  width: 100%;
  max-width: var(--content-width);
  margin-left: 0;
  margin-right: 0;
}
```

This hybrid approach gives:

- **Prose:** Comfortable 75-85 character lines with margins
- **Code:** Full 80-100+ character lines without horizontal scroll
- **Diagrams:** Maximum space for Mermaid rendering
- **Tables:** Full width for multi-column API docs, configs, comparisons

#### Width Calculation Logic

```typescript
function calculatePageWidth(
  viewportWidth: number,
  config: EditorLayoutConfig
): { pageWidth: number; contentWidth: number; margin: number } {
  const preset = LAYOUT_PRESETS[config.layoutMode];

  // For viewport-responsive width
  const ratioBasedWidth = viewportWidth / preset.ratio;

  // Cap at maximum for readability
  const contentWidth = Math.min(ratioBasedWidth, preset.maxContentWidth);

  // Calculate proportional margin
  const margin = Math.round(contentWidth * preset.marginRatio);

  // Total page width
  const pageWidth = contentWidth + (margin * 2);

  return { pageWidth, contentWidth, margin };
}
```

#### CSS Implementation

```css
.quartz-page {
  --layout-ratio: var(--editor-ratio, 1.618);
  --max-content-width: var(--editor-max-content-width, 600px);
  --margin-ratio: var(--editor-margin-ratio, 0.09);

  width: min(
    calc(100vw / var(--layout-ratio)),
    calc(var(--max-content-width) + var(--max-content-width) * var(--margin-ratio) * 2)
  );

  padding: calc(var(--max-content-width) * var(--margin-ratio));
}

.quartz-editor-content {
  --line-height-ratio: var(--editor-line-height-ratio, 1.5);
  line-height: var(--line-height-ratio);
}
```

### Key Flows

```
User opens VSCode settings
        │
        ▼
Selects "quartz.editor.layoutMode" = "balanced"
        │
        ▼
QuartzEditorProvider reads config
        │
        ▼
Sends layoutMode to webview
        │
        ▼
PageContainer.tsx looks up LAYOUT_PRESETS["balanced"]
        │
        ▼
Calculates: pageWidth = min(viewport/1.618, 600 + margins)
        │
        ▼
Applies CSS variables to .quartz-page
        │
        ▼
Editor renders at optimal width
```

---

## 5. Alternative Solutions Considered

### Alternative A: Pure Character-Count Based Width

**Approach:** Set width directly to achieve target character count (e.g., exactly 66 characters).

**Pros:**

- Most direct path to optimal readability
- Works regardless of font choice
- Simple mental model

**Cons:**

- Requires JavaScript measurement of actual rendered text
- Width changes with font size changes (jarring UX)
- No mathematical/aesthetic foundation
- Ignores viewport proportion aesthetics

**Why not chosen:** Overly mechanical; ignores the holistic aesthetic experience of the editor in its environment.

### Alternative B: Viewport Percentage Based

**Approach:** Simple percentage of viewport (e.g., 50%, 60%, 70%).

**Pros:**

- Extremely simple to implement
- Predictable across viewport sizes
- No complex calculations

**Cons:**

- Arbitrary percentages with no design rationale
- 50% of a 4K monitor is still too wide
- Doesn't scale well across different monitor sizes
- No connection to typography or aesthetics

**Why not chosen:** Lacks intentionality; "50%" has no inherent design meaning.

### Alternative C: Fixed Width Only (Current Approach)

**Approach:** Keep current 816px fixed width.

**Pros:**

- No development work
- Familiar to current users
- Print-compatible

**Cons:**

- Too wide for optimal readability
- Ignores viewport context
- Print-first in a screen-first world
- No mathematical elegance

**Why not chosen:** Doesn't solve the problem; represents the status quo we're improving upon.

### Alternative D: e-Based Ratio (Euler's Number)

**Approach:** Use e (2.718...) or e/2 (1.359...) as the governing ratio.

**Pros:**

- Mathematically significant (natural growth)
- Less common, more distinctive

**Cons:**

- No established design precedent
- e/2 ≈ 1.359 gives very wide content areas
- Harder to explain the choice to users
- Less aesthetic research supporting it

**Why not chosen:** While mathematically interesting, lacks the design heritage and research support of φ and √2.

### Alternative E: Uniform Width for All Content

**Approach:** Same width for prose, code, and diagrams (no hybrid approach).

**Pros:**

- Simpler CSS implementation
- Consistent visual alignment
- Easier mental model

**Cons:**

- Prose optimized width (66 chars) breaks code
- Code optimized width (100+ chars) hurts prose readability
- Can't serve both use cases well

**Why not chosen:** Developer documentation inherently mixes content types with different width requirements. A one-size-fits-all approach creates suboptimal experiences for at least one content type.

### Alternative F: Golden Ratio (φ) Default

**Approach:** Use φ (1.618) as the default ratio with ~672px content width.

**Pros:**

- More aesthetically pleasing ratio
- Better prose readability (~84 chars)
- Strong design heritage

**Cons:**

- 672px = only 70 monospace characters
- 80-char code lines would wrap
- Frustrates developers with code-heavy content

**Why not chosen:** While φ is mathematically beautiful, √2's 800px width better serves the primary use case of developers writing documentation with code. φ is offered as the "Prose" preset for long-form writing.

---

## 6. Security, Privacy, and Compliance

**Security:** This feature involves only client-side layout calculations with no network activity, data storage, or authentication changes. No security implications.

**Privacy:** No user data is collected or transmitted. Layout preferences are stored in VSCode's standard settings system.

**Compliance:** No regulatory implications. Accessibility is improved (better line length supports WCAG 2.1 guidelines).

---

## 7. Testing Strategy

### Unit Tests

| Test Case              | Description                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| Ratio calculations     | Verify `calculatePageWidth()` returns correct values for each preset |
| Boundary conditions    | Test at viewport widths: 600px, 1280px, 1920px, 2560px, 3840px       |
| Custom mode            | Verify custom ratio/width values are applied correctly               |
| CSS variable injection | Confirm variables are set on DOM elements                            |

### Integration Tests

| Test Case                 | Description                                                   |
| ------------------------- | ------------------------------------------------------------- |
| Config change propagation | Changing `layoutMode` in settings updates editor in real-time |
| Preset switching          | Switching between presets applies correct widths              |
| Responsive behavior       | Narrow viewport triggers fluid mode regardless of preset      |

### Visual Regression Tests

| Test Case             | Description                                  |
| --------------------- | -------------------------------------------- |
| Each preset at 1920px | Screenshot comparison for each layout mode   |
| Transition animations | Smooth width transitions when changing modes |
| Content reflow        | Text reflows correctly at different widths   |

### User Acceptance Testing

| Metric                                | Target                                                        |
| ------------------------------------- | ------------------------------------------------------------- |
| Prose character count at default font | 80-100 characters per line                                    |
| Code block width                      | Fits 80-char lines without horizontal scroll                  |
| Mermaid diagram rendering             | Common diagrams (flowchart, sequence) render without overflow |
| User preference survey                | ≥70% of developers prefer new default                         |
| Reading speed test                    | No degradation vs current for prose sections                  |

---

## 8. Rollout Plan

### Phase 1: Single Preset Implementation (v1)

- Implement **Developer preset only** (800px, √2 spacing, √2 line-height)
- Replace current 816px default with new 800px √2-based system
- Implement hybrid width (prose margins, full-width code/tables/diagrams)
- Internal dogfooding with development team

### Phase 2: User Feedback & Iteration

- Release as the new default
- Gather feedback via GitHub issues
- Monitor for edge cases (nested content, overflow behavior)
- Iterate on spacing values if needed

### Phase 3: Additional Presets (v2, if needed)

- Add Prose (672px) preset for long-form writing
- Add Technical (880px) preset for heavy code/diagrams
- Add preset selector to settings
- Consider transition animations

### Monitoring

- Track setting distribution across user base
- Monitor GitHub issues for layout-related complaints
- A/B test reading task completion times (if feasible)

### Rollback Plan

If significant issues arise:

1. Revert default to "classic" mode
2. Keep new presets available as options
3. Document issues and iterate on solution

---

## 9. Dependencies and Risks

### Dependencies

| Dependency                     | Owner          | Status      |
| ------------------------------ | -------------- | ----------- |
| VSCode settings schema update  | Quartz team    | Not started |
| CSS variable support in editor | Already exists | ✓           |
| ResizeObserver for viewport    | Already exists | ✓           |

### Risks and Mitigations

| Risk                                         | Impact | Likelihood | Mitigation                                         |
| -------------------------------------------- | ------ | ---------- | -------------------------------------------------- |
| Users prefer current 816px width             | Medium | Low        | Keep "classic" as an option; don't remove it       |
| Different fonts break character calculations | Medium | Medium     | Test with common fonts; use conservative estimates |
| Performance impact from resize calculations  | Low    | Low        | Debounce calculations; use CSS where possible      |
| Confusion about preset names                 | Low    | Medium     | Include character count in setting descriptions    |
| Accessibility regression                     | High   | Low        | Ensure all presets meet WCAG line length guidance  |

---

## 10. Open Questions

| Question                                                            | Owner         | Status                                         |
| ------------------------------------------------------------------- | ------------- | ---------------------------------------------- |
| ~~Should code blocks have horizontal scroll or wrap at boundaries?~~| Dev team      | **Resolved: Horizontal scroll**                |
| ~~Should Mermaid diagrams zoom-to-fit or overflow with scroll?~~    | Dev team      | **Resolved: Horizontal scroll (consistent)**   |
| ~~Should tables be full-width or follow prose margins?~~            | Design review | **Resolved: Full-width**                       |
| ~~Should width be viewport-responsive or fixed per preset?~~        | Design review | **Resolved: Fixed per preset**                 |
| ~~How should nested code blocks handle width?~~                     | Dev team      | **Resolved: Inherit parent indent**            |
| ~~Should line-height also follow the ratio?~~                       | Design review | **Resolved: Yes, √2 (1.414) for all content**  |
| ~~What's the implementation scope for v1?~~                         | Dev team      | **Resolved: Single preset (Developer/800px)**  |
| ~~What monospace font size should be assumed for calculations?~~    | Dev team      | **Resolved: Same as prose (16px)**             |
| ~~Should we replace or add to existing settings?~~                  | Dev team      | **Resolved: Replace existing settings**        |
| Should there be a "code-focused" preset with minimal prose margins? | Design review | Deferred to v2                                 |
| Do we need transition animations when switching modes?              | UX            | Deferred to v2                                 |

---

## 11. Implementation Issues

| #   | Title                                      | Status | Scope | Depends On       |
| --- | ------------------------------------------ | ------ | ----- | ---------------- |
| [001](../issues/editor-aspect-ratio-optimization/001-define-sqrt2-css-variables.md) | Define √2 CSS Variables and Spacing Scale | DONE   | S     | -                |
| [002](../issues/editor-aspect-ratio-optimization/002-update-page-container-width.md) | Update Page Container Width to 800px      | DONE   | S     | 001              |
| [003](../issues/editor-aspect-ratio-optimization/003-implement-prose-margins.md) | Implement Prose Element Margins           | DONE   | M     | 001, 002         |
| [004](../issues/editor-aspect-ratio-optimization/004-implement-full-width-code-blocks.md) | Implement Full-Width Code Blocks          | DONE   | M     | 001, 002         |
| [005](../issues/editor-aspect-ratio-optimization/005-implement-full-width-tables.md) | Implement Full-Width Tables               | DONE   | S     | 001, 002         |
| [006](../issues/editor-aspect-ratio-optimization/006-implement-full-width-mermaid.md) | Implement Full-Width Mermaid Diagrams     | DONE   | S     | 001, 002         |
| [007](../issues/editor-aspect-ratio-optimization/007-implement-vertical-spacing.md) | Implement √2-Based Vertical Spacing       | DONE   | M     | 001, 003-006     |
| [008](../issues/editor-aspect-ratio-optimization/008-implement-list-indentation.md) | Implement √2-Based List/Blockquote Indent | DONE   | S     | 001, 007         |
| [009](../issues/editor-aspect-ratio-optimization/009-implement-inline-element-spacing.md) | Implement Inline Element Spacing          | DONE   | S     | 001, 008         |
| [010](../issues/editor-aspect-ratio-optimization/010-visual-testing-and-polish.md) | Visual Testing and Polish                 | TODO   | M     | 003-009          |

**Progress:** 9/10 issues complete (90%)

---

## 12. Appendix

### A. Mathematical Ratio Reference

| Ratio   | Value          | Derivation   | Cultural Significance                        |
| ------- | -------------- | ------------ | -------------------------------------------- |
| φ (phi) | 1.618033989... | (1 + √5) / 2 | Golden ratio; Greek temples, Renaissance art |
| √2      | 1.414213562... | √2           | ISO paper; efficient scaling                 |
| π/2     | 1.570796327... | π / 2        | Quarter circle; circular geometry            |
| e/2     | 1.359140914... | e / 2        | Natural growth curves                        |
| √3      | 1.732050808... | √3           | Hexagonal geometry                           |
| φ²      | 2.618033989... | φ × φ        | Nested golden rectangles                     |

### B. Width/Character Count Reference

**Prose (proportional font, ~8px avg char at 16px):**

| Content Width | Prose Chars | Assessment                       |
| ------------- | ----------- | -------------------------------- |
| 528px         | ~66 chars   | Ideal for pure prose             |
| 600px         | ~75 chars   | Upper limit for prose            |
| 672px         | ~84 chars   | Acceptable for technical writing |
| 800px         | ~100 chars  | **Developer docs sweet spot**    |
| 880px         | ~110 chars  | Heavy technical content          |
| 960px         | ~120 chars  | API docs, wide tables            |

**Code (monospace font, ~9.6px char at 16px):**

| Content Width | Mono Chars | Style Guide Fit          |
| ------------- | ---------- | ------------------------ |
| 672px         | ~70 chars  | Too narrow for most code |
| 768px         | ~80 chars  | PEP 8 Python minimum     |
| 800px         | ~83 chars  | **Most style guides**    |
| 880px         | ~92 chars  | Prettier 100-char        |
| 960px         | ~100 chars | rustfmt default          |
| 1152px        | ~120 chars | Extended limits          |

**Key insight:** 800px content width is the minimum to comfortably fit 80-character code lines.

### C. Research Sources

- [Baymard Institute: Line Length Readability](https://baymard.com/blog/line-length-readability)
- [Nielsen Norman Group: Golden Ratio in UI Design](https://www.nngroup.com/articles/golden-ratio-ui-design/)
- [ISO 216 / Lichtenberg Ratio History](https://en.wikipedia.org/wiki/Lichtenberg_ratio)
- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Robert Bringhurst: The Elements of Typographic Style](https://en.wikipedia.org/wiki/The_Elements_of_Typographic_Style)

### D. Competitive Editor Widths

| Editor              | Measured Width | Est. Characters |
| ------------------- | -------------- | --------------- |
| Notion              | ~700px         | ~87 chars       |
| Obsidian (Readable) | ~700px         | ~87 chars       |
| Typora              | ~800px         | ~100 chars      |
| iA Writer           | ~512px         | ~64 chars       |
| Bear                | ~680px         | ~85 chars       |

### E. Mermaid Diagram Width Analysis

Typical Mermaid diagram widths based on complexity:

| Diagram Type               | Elements     | Typical Width | Fits in 800px? |
| -------------------------- | ------------ | ------------- | -------------- |
| Flowchart (simple)         | 3-5 nodes    | 400-500px     | ✓ Yes          |
| Flowchart (medium)         | 6-10 nodes   | 600-800px     | ✓ Tight        |
| Flowchart (complex)        | 10+ nodes    | 900-1200px    | ✗ Overflow     |
| Sequence (2 participants)  | 2 actors     | 300-400px     | ✓ Yes          |
| Sequence (4 participants)  | 4 actors     | 600-700px     | ✓ Yes          |
| Sequence (6+ participants) | 6+ actors    | 900-1100px    | ✗ Overflow     |
| Class diagram (small)      | 3-4 classes  | 500-600px     | ✓ Yes          |
| Class diagram (medium)     | 5-8 classes  | 800-1000px    | ⚠ Borderline   |
| ER diagram                 | 4-6 entities | 700-900px     | ⚠ Borderline   |
| Gantt chart                | 5-10 tasks   | 600-800px     | ✓ Yes          |

**Recommendation:** 800px handles ~80% of common Mermaid diagrams. Complex diagrams should gracefully overflow with horizontal scroll or auto-scale.

### F. Table Width Analysis

Common table patterns in developer documentation:

| Table Type        | Typical Columns                            | Min Comfortable Width | Fits 800px?  |
| ----------------- | ------------------------------------------ | --------------------- | ------------ |
| Simple key-value  | 2 cols                                     | 400px                 | ✓ Yes        |
| API parameters    | 5 cols (name, type, req, default, desc)    | 700-900px             | ⚠ Tight      |
| CLI flags         | 4 cols (flag, short, default, description) | 600-800px             | ✓ Yes        |
| Comparison matrix | 4-6 cols                                   | 700-1000px            | ⚠ Borderline |
| Config options    | 4-5 cols                                   | 650-850px             | ✓ Mostly     |
| Changelog         | 3 cols (version, date, changes)            | 500-700px             | ✓ Yes        |

**Decision: Full-width tables**

- Most technical tables have 4+ columns
- Cramped tables hurt readability more than wide prose
- Horizontal scroll is acceptable fallback for very wide tables
- Consistent with code blocks and Mermaid diagrams

### G. Complete Markdown Element Spacing Specification

This section defines the exact horizontal and vertical spacing for every markdown element in the "Developer" preset (800px content width, √2 ratio).

#### The √2 Design System

The entire spacing system is derived from **√2 (1.4142...)** to create mathematical harmony:

```
√2 GEOMETRIC SCALE
==================

Each step multiplies by √2. Every 2 steps doubles (√2 × √2 = 2).

Power   Multiplier   Base 16px    Rounded    Token
─────   ──────────   ─────────    ───────    ─────
-4      0.25         4px          4px        --space-4xs
-3      0.354        5.66px       6px        --space-3xs
-2      0.5          8px          8px        --space-2xs
-1      0.707        11.3px       11px       --space-xs
 0      1.0          16px         16px       --space-base
+1      1.414        22.6px       23px       --space-sm
+2      2.0          32px         32px       --space-md
+3      2.828        45.3px       45px       --space-lg
+4      4.0          64px         64px       --space-xl
+5      5.657        90.5px       91px       --space-2xl
```

**Why √2?**

- **Self-similar scaling:** Just as A4 paper folded in half preserves its √2 ratio, our spacing scale maintains proportional relationships at every level
- **Doubling symmetry:** Every 2 steps = 2× (4→8→16→32→64)
- **Perceptual uniformity:** √2 steps feel "one notch bigger" consistently
- **Mathematical elegance:** Same ratio governs width AND spacing

#### Deriving Dimensions from √2

**Content Width:**

```
viewport / √2 = content width
1132px / √2 ≈ 800px (at typical VSCode panel width)
```

**Prose Margins:**

```
content width / √2⁴ = prose margin
800px / 16 = 50px → rounded to 48px (--space-lg × 1.07)

Alternative derivation:
content width × (1 - 1/√2) / 2 = breathing room
800 × 0.146 = 117px (too much, so we use √2⁴ division)
```

**Prose Width:**

```
content - (2 × margin) = prose
800 - 96 = 704px

Verification: 704 / 800 = 0.88 ≈ √2 - 0.5 (close to √2-derived)
```

**Line Height:**

```
√2 ≈ 1.414 for ALL content (prose and code)
Mathematical purity: same ratio governs width, spacing, AND line-height
```

**Heading Scale (font sizes would follow same pattern):**

```
H6: base × √2⁰ = 16px
H5: base × √2⁰·⁵ ≈ 19px
H4: base × √2¹ ≈ 23px
H3: base × √2¹·⁵ ≈ 27px
H2: base × √2² = 32px
H1: base × √2²·⁵ ≈ 38px
```

#### Base Units (√2-derived)

```css
:root {
  /* √2 ratio */
  --ratio: 1.4142135623730951;

  /* Base unit */
  --space-base: 16px;

  /* √2 scale: each step × √2 */
  --space-4xs: 4px;                                    /* base / √2⁴ */
  --space-3xs: 6px;                                    /* base / √2³ */
  --space-2xs: 8px;                                    /* base / √2² */
  --space-xs: 11px;                                    /* base / √2¹ */
  --space-sm: 23px;                                    /* base × √2¹ */
  --space-md: 32px;                                    /* base × √2² */
  --space-lg: 45px;                                    /* base × √2³ */
  --space-xl: 64px;                                    /* base × √2⁴ */

  /* Derived dimensions */
  --content-width: 800px;                              /* viewport / √2 */
  --prose-margin: 48px;                                /* ≈ --space-lg */
  --prose-width: calc(var(--content-width) - var(--prose-margin) * 2);

  /* Line heights - all √2 based */
  --line-height-base: 1.414;                           /* √2 for all content */
  --line-height-tight: 1.25;                           /* headings only */
}
```

---

#### Block Elements (√2-derived spacing)

| Element             | Horizontal                          | Vertical Top          | Vertical Bottom       | √2 Derivation              |
| ------------------- | ----------------------------------- | --------------------- | --------------------- | -------------------------- |
| **Paragraph**       | Prose (704px)                       | 0                     | `--space-base` (16px) | base × √2⁰                 |
| **Heading 1**       | Prose                               | `--space-lg` (45px)   | `--space-base` (16px) | base × √2³ / base × √2⁰    |
| **Heading 2**       | Prose                               | `--space-md` (32px)   | `--space-xs` (11px)   | base × √2² / base × √2⁻¹   |
| **Heading 3**       | Prose                               | `--space-sm` (23px)   | `--space-2xs` (8px)   | base × √2¹ / base × √2⁻²   |
| **Heading 4**       | Prose                               | `--space-base` (16px) | `--space-3xs` (6px)   | base × √2⁰ / base × √2⁻³   |
| **Heading 5**       | Prose                               | `--space-xs` (11px)   | `--space-4xs` (4px)   | base × √2⁻¹ / base × √2⁻⁴  |
| **Heading 6**       | Prose                               | `--space-xs` (11px)   | `--space-4xs` (4px)   | base × √2⁻¹ / base × √2⁻⁴  |
| **Code block**      | **Full (800px)**                    | `--space-base` (16px) | `--space-base` (16px) | base × √2⁰ symmetrical     |
| **Blockquote**      | Prose, `--space-sm` (23px) left pad | `--space-base` (16px) | `--space-base` (16px) | pad = base × √2¹           |
| **Unordered list**  | Prose, `--space-sm` (23px) left pad | `--space-2xs` (8px)   | `--space-2xs` (8px)   | base × √2⁻²                |
| **Ordered list**    | Prose, `--space-md` (32px) left pad | `--space-2xs` (8px)   | `--space-2xs` (8px)   | pad = base × √2² (numbers) |
| **List item**       | Inherits                            | 0                     | `--space-4xs` (4px)   | base × √2⁻⁴                |
| **Nested list**     | +`--space-sm` (23px) per level      | `--space-4xs` (4px)   | `--space-4xs` (4px)   | indent = base × √2¹        |
| **Table**           | **Full (800px)**                    | `--space-base` (16px) | `--space-base` (16px) | base × √2⁰                 |
| **Horizontal rule** | **Full (800px)**                    | `--space-sm` (23px)   | `--space-sm` (23px)   | base × √2¹ (section break) |
| **Image (block)**   | **Full (800px)**                    | `--space-base` (16px) | `--space-base` (16px) | base × √2⁰                 |
| **Mermaid diagram** | **Full (800px)**                    | `--space-base` (16px) | `--space-base` (16px) | base × √2⁰                 |
| **Task list**       | Prose, `--space-sm` (23px) left pad | `--space-2xs` (8px)   | `--space-2xs` (8px)   | same as ul                 |
| **Footnote def**    | Prose, `--space-sm` (23px) indent   | `--space-2xs` (8px)   | `--space-2xs` (8px)   | base × √2⁻²                |
| **Definition list** | Prose                               | `--space-2xs` (8px)   | `--space-2xs` (8px)   | base × √2⁻²                |
| **Callout**         | Prose, `--space-base` (16px) pad    | `--space-base` (16px) | `--space-base` (16px) | base × √2⁰                 |
| **Math block**      | **Full (800px)**                    | `--space-base` (16px) | `--space-base` (16px) | base × √2⁰                 |

**Pattern explanation:**

- **Headings:** Top margin decreases by one √2 step per heading level (H1=√2³, H2=√2², H3=√2¹...)
- **Bottom margins:** Decrease faster (by 1 step per level) to keep headings close to their content
- **Full-width elements:** Uniform `--space-base` (16px) for visual consistency
- **Lists:** Tighter spacing (`--space-2xs`) since items are visually connected
- **Indentation:** Uses `--space-sm` (23px ≈ base × √2) for clear visual hierarchy

---

#### Inline Elements (inherit container width)

| Element                | Horizontal             | Vertical                         | Notes                               |
| ---------------------- | ---------------------- | -------------------------------- | ----------------------------------- |
| **Bold/Strong**        | Inherits               | Inherits                         | No extra spacing                    |
| **Italic/Emphasis**    | Inherits               | Inherits                         | No extra spacing                    |
| **Strikethrough**      | Inherits               | Inherits                         | No extra spacing                    |
| **Inline code**        | 4px horizontal padding | 2px vertical padding             | Background color, border-radius 3px |
| **Link**               | Inherits               | Inherits                         | Underline on hover                  |
| **Image (inline)**     | Inherits               | Inherits, vertical-align: middle | Max-height: 1.5em for inline        |
| **Footnote reference** | Inherits               | Superscript                      | Smaller font, clickable             |
| **Math inline**        | 2px horizontal padding | Inherits                         | KaTeX inline rendering              |
| **Highlight/Mark**     | 2px horizontal padding | Inherits                         | Background color                    |
| **Subscript**          | Inherits               | Subscript positioning            | Smaller font (0.75em)               |
| **Superscript**        | Inherits               | Superscript positioning          | Smaller font (0.75em)               |

---

#### Special Cases

**Code block with filename/language badge:**

```
┌─────────────────── Full width (800px) ───────────────────┐
│ ┌─ Language badge ─┐                                     │
│ │ typescript       │ (top-right or top-left)             │
│ └──────────────────┘                                     │
│ const example = "code content here";                     │
│ // More code...                                          │
└──────────────────────────────────────────────────────────┘
     ↑ 16px vertical margin top and bottom
```

**Nested blockquote:**

```
┌── 48px prose margin ──┐
│                       │
│ > Level 1 blockquote  │ ← 24px left border/padding
│ > > Level 2 quote     │ ← +24px additional indent
│ > > > Level 3 quote   │ ← +24px additional indent
│                       │
└───────────────────────┘
```

**List with code block:**

```
┌── 48px prose margin ──┐
│                       │
│ 1. List item text     │ ← Prose width with list indent
│                       │
│    ```                │
│    code inside list   │ ← Inherits list indent (32px), may be < 80 chars
│    ```                │   Uses horizontal scroll if code exceeds width
│                       │
│ 2. Next item          │
└───────────────────────┘
```

**Decision: Nested code inherits parent indent.** Code blocks inside lists/blockquotes respect their container's accumulated indent. This preserves visual hierarchy at the cost of potentially narrower code width. Horizontal scroll handles overflow.

**Deeply nested code (blockquote > list > code):**

```
┌── 48px prose margin ──────────────────────────────────────┐
│                                                           │
│ > Blockquote text (23px indent)                          │
│ >                                                        │
│ > 1. List inside blockquote (+32px indent)              │
│ >                                                        │
│ >    ```                                                 │
│ >    code here (55px total indent = 23 + 32)            │
│ >    // Available width: 704 - 55 = 649px (~67 mono)    │
│ >    // Long lines get horizontal scroll                │
│ >    ```                                                 │
│ >                                                        │
└───────────────────────────────────────────────────────────┘
```

**Overflow behavior (code, tables, Mermaid):**

```
┌─────────────────── Full width (800px) ───────────────────┐
│ ┌─────────────────────────────────────────────────────┐  │
│ │ const veryLongVariableName = someFunction(arg1, → │  │
│ │                                           scroll │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ Col1 │ Col2 │ Col3 │ Col4 │ Col5 │ Col6 │ Col7 →   │  │
│ │      │      │      │      │      │      │   scroll │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐  │
│ │     [Mermaid diagram]                          →   │  │
│ │                                              scroll │  │
│ └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

Decision: ALL full-width elements use horizontal scroll for overflow.
- Code blocks: scroll, never wrap (preserves formatting)
- Tables: scroll when > 800px
- Mermaid: scroll when diagram exceeds container
```
```

---

#### Vertical Rhythm Rules

1. **First child has no top margin** — prevents double spacing at document start
2. **Last child has no bottom margin** — prevents double spacing at document end
3. **Headings after paragraphs get extra top margin** — visual separation (1.5× normal)
4. **Adjacent lists collapse margins** — ul + ul = single 8px gap, not 16px
5. **Code/table/diagram after prose** — 16px gap, no collapse
6. **Prose after code/table/diagram** — 16px gap, no collapse

---

#### Visual: √2 Relationships in the Layout

```
                    VIEWPORT WIDTH
    ◄──────────────────────────────────────────────►
    │                                              │
    │              ÷ √2                            │
    │         ◄──────────►                         │
    │                                              │
    │    ┌────────── CONTENT (800px) ──────────┐   │
    │    │                                     │   │
    │    │ ◄─48px─►                 ◄─48px─►   │   │
    │    │ (÷√2⁴)                   (÷√2⁴)    │   │
    │    │         ┌─────────────┐            │   │
    │    │         │             │            │   │
    │    │         │   PROSE     │            │   │
    │    │         │   704px     │            │   │
    │    │         │             │            │   │
    │    │         └─────────────┘            │   │
    │    │                                     │   │
    │    │  ┌─────────────────────────────┐   │   │
    │    │  │      CODE BLOCK             │   │   │
    │    │  │      (full 800px)           │   │   │
    │    │  └─────────────────────────────┘   │   │
    │    │                                     │   │
    │    └─────────────────────────────────────┘   │
    │                                              │
    └──────────────────────────────────────────────┘

VERTICAL RHYTHM (√2 scale from 16px base):

    ┌──────────────────────────────────────────────┐
    │                                              │
    │  ← 45px (√2³) ─── H1 HEADING ───────────────│
    │                                              │
    │  ← 16px (√2⁰) ─── paragraph ─────────────────│
    │                                              │
    │  ← 32px (√2²) ─── H2 HEADING ───────────────│
    │                                              │
    │  ← 11px (√2⁻¹)── paragraph ─────────────────│
    │                                              │
    │  ← 16px (√2⁰) ─── ┌─────────────────────┐   │
    │                   │ code block          │   │
    │  ← 16px (√2⁰) ─── └─────────────────────┘   │
    │                                              │
    │  ← 8px (√2⁻²) ─── • list item               │
    │  ← 4px (√2⁻⁴) ─── • list item               │
    │  ← 4px (√2⁻⁴) ─── • list item               │
    │  ← 8px (√2⁻²) ───                           │
    │                                              │
    │  ← 23px (√2¹) ─── ─────────────────────     │ (hr)
    │  ← 23px (√2¹) ───                           │
    │                                              │
    └──────────────────────────────────────────────┘
```

#### CSS Implementation (√2-based)

```css
/* ============================================
   √2 SPACING SCALE
   ============================================ */

:root {
  --ratio: 1.4142135623730951;  /* √2 */
  --space-base: 16px;

  /* Geometric scale: base × √2^n */
  --space-4xs: 4px;    /* base × √2⁻⁴ = 16/4      */
  --space-3xs: 6px;    /* base × √2⁻³ ≈ 16/2.83   */
  --space-2xs: 8px;    /* base × √2⁻² = 16/2      */
  --space-xs:  11px;   /* base × √2⁻¹ ≈ 16/1.414  */
  --space-sm:  23px;   /* base × √2¹  ≈ 16×1.414  */
  --space-md:  32px;   /* base × √2²  = 16×2      */
  --space-lg:  45px;   /* base × √2³  ≈ 16×2.83   */
  --space-xl:  64px;   /* base × √2⁴  = 16×4      */

  /* Layout dimensions */
  --content-width: 800px;
  --prose-margin: 48px;  /* ≈ --space-lg */
  --prose-width: 704px;  /* 800 - 48×2 */

  /* Line heights */
  --lh-prose: 1.5;
  --lh-code: 1.414;      /* √2 for code */
  --lh-heading: 1.25;
}

/* ============================================
   HORIZONTAL SPACING
   ============================================ */

/* Prose elements: margins derived from √2⁴ division */
.editor-content > p,
.editor-content > h1, .editor-content > h2,
.editor-content > h3, .editor-content > h4,
.editor-content > h5, .editor-content > h6,
.editor-content > ul, .editor-content > ol,
.editor-content > blockquote,
.editor-content > .callout {
  max-width: var(--prose-width);
  margin-left: var(--prose-margin);
  margin-right: var(--prose-margin);
}

/* Full-width elements */
.editor-content > pre,
.editor-content > .mermaid,
.editor-content > table,
.editor-content > figure,
.editor-content > hr,
.editor-content > .math-display {
  width: 100%;
  max-width: var(--content-width);
  margin-left: 0;
  margin-right: 0;
}

/* ============================================
   VERTICAL SPACING (√2 scale)
   ============================================ */

/* Paragraphs: base unit */
.editor-content > p {
  margin-top: 0;
  margin-bottom: var(--space-base);  /* 16px = √2⁰ */
}

/* Headings: decreasing √2 scale */
.editor-content > h1 {
  margin-top: var(--space-lg);     /* 45px = √2³ */
  margin-bottom: var(--space-base); /* 16px = √2⁰ */
  line-height: var(--lh-heading);
}

.editor-content > h2 {
  margin-top: var(--space-md);     /* 32px = √2² */
  margin-bottom: var(--space-xs);  /* 11px = √2⁻¹ */
  line-height: var(--lh-heading);
}

.editor-content > h3 {
  margin-top: var(--space-sm);     /* 23px = √2¹ */
  margin-bottom: var(--space-2xs); /* 8px = √2⁻² */
  line-height: var(--lh-heading);
}

.editor-content > h4 {
  margin-top: var(--space-base);   /* 16px = √2⁰ */
  margin-bottom: var(--space-3xs); /* 6px = √2⁻³ */
}

.editor-content > h5,
.editor-content > h6 {
  margin-top: var(--space-xs);     /* 11px = √2⁻¹ */
  margin-bottom: var(--space-4xs); /* 4px = √2⁻⁴ */
}

/* Code/tables/diagrams: base unit symmetrical */
.editor-content > pre,
.editor-content > table,
.editor-content > .mermaid {
  margin-top: var(--space-base);    /* 16px = √2⁰ */
  margin-bottom: var(--space-base); /* 16px = √2⁰ */
}

.editor-content > pre {
  line-height: var(--lh-code);  /* √2 line height */
}

/* Lists: tighter spacing */
.editor-content > ul,
.editor-content > ol {
  margin-top: var(--space-2xs);    /* 8px = √2⁻² */
  margin-bottom: var(--space-2xs); /* 8px = √2⁻² */
  padding-left: var(--space-sm);   /* 23px = √2¹ */
}

.editor-content li {
  margin-bottom: var(--space-4xs); /* 4px = √2⁻⁴ */
}

/* Nested lists: √2¹ indent per level */
.editor-content li > ul,
.editor-content li > ol {
  margin-top: var(--space-4xs);
  margin-bottom: var(--space-4xs);
  padding-left: var(--space-sm);   /* 23px = √2¹ */
}

/* Blockquotes */
.editor-content > blockquote {
  margin-top: var(--space-base);
  margin-bottom: var(--space-base);
  padding-left: var(--space-sm);   /* 23px = √2¹ */
  border-left: var(--space-4xs) solid var(--border-color); /* 4px */
}

/* Horizontal rule: slightly larger for section break */
.editor-content > hr {
  margin-top: var(--space-sm);     /* 23px = √2¹ */
  margin-bottom: var(--space-sm);  /* 23px = √2¹ */
}

/* First/last normalization */
.editor-content > *:first-child { margin-top: 0; }
.editor-content > *:last-child { margin-bottom: 0; }
```

---

#### Summary: √2-Derived Dimensions

| Dimension                  | Value       | √2 Derivation               |
| -------------------------- | ----------- | --------------------------- |
| **Content width**          | 800px       | viewport ÷ √2               |
| **Prose margin**           | 48px        | content ÷ √2⁴ ≈ 50px → 48px |
| **Prose width**            | 704px       | content − (margin × 2)      |
| **List/blockquote indent** | 23px        | base × √2¹                  |
| **Nested indent**          | +23px/level | base × √2¹                  |

| Spacing Token  | Value | √2 Power |
| -------------- | ----- | -------- |
| `--space-4xs`  | 4px   | √2⁻⁴     |
| `--space-3xs`  | 6px   | √2⁻³     |
| `--space-2xs`  | 8px   | √2⁻²     |
| `--space-xs`   | 11px  | √2⁻¹     |
| `--space-base` | 16px  | √2⁰      |
| `--space-sm`   | 23px  | √2¹      |
| `--space-md`   | 32px  | √2²      |
| `--space-lg`   | 45px  | √2³      |
| `--space-xl`   | 64px  | √2⁴      |

| Width Category | Width                | Elements                                           |
| -------------- | -------------------- | -------------------------------------------------- |
| **Prose**      | 704px (48px margins) | Paragraphs, headings, lists, blockquotes, callouts |
| **Full-width** | 800px (no margins)   | Code blocks, tables, Mermaid, images, HR, math     |
| **Inline**     | Inherits             | Bold, italic, links, inline code                   |

---

### H. Code Style Guide Line Limits

| Language/Tool    | Default Limit | Extended Limit        |
| ---------------- | ------------- | --------------------- |
| PEP 8 (Python)   | 79 chars      | 99 chars              |
| Black (Python)   | 88 chars      | 88 chars              |
| Prettier (JS/TS) | 80 chars      | 100-120 chars         |
| rustfmt (Rust)   | 100 chars     | 100 chars             |
| gofmt (Go)       | No limit      | ~100 chars convention |
| Google Java      | 100 chars     | 100 chars             |
| Linux Kernel     | 80 chars      | 100 chars             |

**800px content width (83 mono chars) fits:** PEP 8 strict, Prettier default, conventional Go
**Requires wider:** Black, rustfmt, Google Java, extended Prettier

---

*Document ends.*
