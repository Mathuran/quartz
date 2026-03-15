# Quartz Launch Website Design Document

**Author:** Mathuran Sadagopan + Claude Code
**Status:** DRAFT
**Created:** 2026-03-12
**Last Updated:** 2026-03-12 (brand style revision based on logo review)
**Reviewers:** Mathuran Sadagopan

---

## 1. Problem Statement

Quartz is a polished Notion-style markdown editor for VS Code, but potential users have no way to experience it before installing. The VS Code Marketplace listing relies on static screenshots and text descriptions — an inadequate medium for showcasing a product whose entire value proposition is *how it feels to use*. Developers deciding between markdown tools can't see Quartz's block editing, slash commands, or formatting toolbar in action. Without a dedicated launch website, Quartz competes on screenshots alone against established extensions with millions of installs. A high-quality, interactive launch page would convert curious visitors into installs by letting them *feel* the editor before committing.

## 2. Goals and Non-Goals

### Goals

- **P0: Conversion** — Achieve a 15%+ click-through rate on the "Install on VS Code" CTA from unique visitors within the first 30 days
- **P0: Interactive demo** — Ship a guided scroll-driven showcase + a live "Try it yourself" embedded Quartz editor that visitors can type in
- **P0: Brand identity** — Establish a distinctive Quartz visual language (colors, typography, motion, sound) that differentiates from generic developer tool sites
- **P1: Performance** — Achieve 90+ Lighthouse performance score with <2s first contentful paint, even with 3D effects and animations
- **P1: Social proof** — Display live install count, GitHub stars, and 3-5 curated testimonials/tweets
- **P2: SEO** — Rank on page 1 for "notion style markdown editor vscode" within 60 days

### Non-Goals

- Full documentation site (README + Marketplace listing cover this)
- Blog or changelog (out of scope for v1)
- User accounts, analytics dashboards, or backend functionality
- Mobile-optimized editing experience (responsive layout yes, full mobile editor no)
- Pricing page or premium tier (Quartz is free/MIT)
- CMS or content management — content is hardcoded for launch

## 3. Background and Context

### Current State

Quartz v0.3.0 is published on the VS Code Marketplace. The social media launch plan (see `social-media-launch-plan.md`) explicitly listed "standalone website" as a non-goal — that decision is now being revisited because a high-quality website would amplify every social media post by providing a compelling link destination.

### Technical Opportunity

The Quartz editor core (TipTap extensions, parser, serializer, React components) already runs in a browser — the VS Code webview *is* a browser environment. This means the interactive demo is not a simulation; it's the actual editor running natively on the web. The `postMessage` bridge to VS Code can be swapped for direct state management.

### Competitive Website Analysis

| Product | Website Style | Interactive Demo? | 3D/Motion? |
|---------|--------------|-------------------|------------|
| Notion | Clean, minimal, scroll-driven | Yes (embedded workspace) | Subtle parallax |
| Linear | Dark, cinematic, heavy motion | Feature videos | Yes (WebGL) |
| Raycast | Dark, bold, scroll-triggered | Animated previews | Subtle 3D |
| Cursor | Minimal, dev-focused | No | Minimal |
| **Quartz (target)** | **Geometric, minimal, confident** | **Yes (live editor)** | **Subtle (SVG + GSAP)** |

The Quartz website should feel closer to Cursor/Raycast in clarity while being uniquely geometric — the line-art crystal logo is the hero, not a 3D render trying to compete with Linear's budget.

## 4. Proposed Solution

### 4.1 Design Philosophy: "Geometric Clarity"

The Quartz brand derives from the mineral, but filtered through a designer's hand. The logo — a minimal line-art crystal with visible facets and clean strokes — sets the tone: **precision through restraint, not spectacle**. The website should feel like the logo expanded into a full experience: geometric, airy, and confident in its simplicity.

**Core Design Principles:**

1. **Line over Fill** — The logo is pure geometry with no fill, gradient, or shadow. The website echoes this: thin strokes, wireframe motifs, generous whitespace. Visual weight comes from composition, not effects.
2. **Geometric Precision** — Clean lines, crystalline angles, hexagonal/faceted motifs drawn from the logo's faceted crystal shape. Elements align to a strict grid; asymmetry is intentional, not accidental.
3. **Light & Airy** — The logo reads clearly on a light background. The site defaults to a **light theme** with ample breathing room. Dark theme is a supported alternative, not the primary experience.
4. **Purposeful Motion** — Every animation communicates something; nothing moves for decoration alone. Animations are subtle and short — elements slide or fade in, they don't explode into view.
5. **Confident Minimalism** — No glassmorphism, no heavy blur effects, no particle systems. The confidence of a single-weight line drawing. Let the live editor demo be the spectacle; the surrounding page is the frame.

### 4.2 Visual Identity System

#### Color Palette

The logo is monochrome line-art — it works on any background. The color system follows suit: a neutral canvas with a single signature accent. No prismatic rainbow gradients; the palette is restrained to match the logo's restraint.

**Primary Palette — Light Theme (default)**

| Token | Value | Usage |
|-------|-------|-------|
| `--q-canvas` | `#fafafa` | Page background, lightest layer |
| `--q-surface` | `#ffffff` | Cards, elevated surfaces |
| `--q-surface-alt` | `#f5f5f7` | Alternating section backgrounds |
| `--q-stroke` | `#d1d1d6` | Borders, dividers, logo-weight lines |
| `--q-stroke-strong` | `#8e8e93` | Emphasized strokes, icon outlines |
| `--q-text` | `#1d1d1f` | Primary text, headings |
| `--q-text-secondary` | `#6e6e73` | Secondary text, captions |

**Primary Palette — Dark Theme (alternative)**

| Token | Value | Usage |
|-------|-------|-------|
| `--q-canvas` | `#0a0a14` | Page background |
| `--q-surface` | `#1a1a2e` | Cards, elevated surfaces (matches Marketplace banner) |
| `--q-surface-alt` | `#22223a` | Alternating section backgrounds |
| `--q-stroke` | `#3a3a4e` | Borders, dividers |
| `--q-stroke-strong` | `#6e6e8e` | Emphasized strokes |
| `--q-text` | `#f0f0f5` | Primary text, headings |
| `--q-text-secondary` | `#8b8b9e` | Secondary text, captions |

**Accent Palette**

| Token | Value | Usage |
|-------|-------|-------|
| `--q-crystal` | `#7c4dff` | Primary accent, CTAs, links |
| `--q-crystal-subtle` | `rgba(124, 77, 255, 0.08)` | Hover backgrounds, subtle tints |
| `--q-crystal-hover` | `#6a3de8` | Darkened accent for hover states |
| `--q-success` | `#00bfa5` | Success states |
| `--q-warning` | `#ffa657` | Warning states |

**The crystal purple (`#7c4dff`) remains the signature Quartz brand color** — it's already used in the editor for callout blocks, it evokes amethyst quartz, and it stands out from the sea of blue developer tools. But it's used sparingly: CTAs, links, and select highlights. The logo's monochrome geometry dominates; purple accents punctuate.

#### Typography

**Display Font:** `"Inter"` (variable weight)
- Clean geometric sans-serif that echoes crystalline precision
- Variable font for smooth weight transitions in animations
- Widely available, excellent rendering across platforms

**Body Font:** `"Inter"` at 400/500 weight
- Same family for cohesion, lighter weights for readability

**Code Font:** `"JetBrains Mono"` or `"Fira Code"`
- Matches the editor's monospace stack
- Ligatures enabled for code samples

**Type Scale:**

| Level | Size | Weight | Letter-spacing | Usage |
|-------|------|--------|----------------|-------|
| Display | 72px / 4.5rem | 800 | -0.03em | Hero headline |
| H1 | 48px / 3rem | 700 | -0.02em | Section titles |
| H2 | 32px / 2rem | 600 | -0.01em | Subsection titles |
| H3 | 24px / 1.5rem | 600 | 0 | Feature labels |
| Body | 18px / 1.125rem | 400 | 0.01em | Paragraphs |
| Caption | 14px / 0.875rem | 500 | 0.02em | Labels, metadata |
| Code | 16px / 1rem | 400 | 0 | Code samples |

#### Animation Language

**Easing:** Smooth, understated curves — elements arrive calmly, not dramatically:
- `--q-ease-out`: `cubic-bezier(0.16, 1, 0.3, 1)` — Primary (elements appearing)
- `--q-ease-in-out`: `cubic-bezier(0.65, 0, 0.35, 1)` — Transitions

**Motion Principles:**
- **Scroll-driven reveals:** Elements fade in with a subtle upward slide (opacity + translateY). No blur, no scale — keep it clean like the logo.
- **Line drawing:** The hero crystal can animate as an SVG stroke draw-on — matching the logo's line-art nature.
- **Micro-interactions:** Buttons shift subtly on hover (translate, border color change). No glass press effects.
- **Section transitions:** Clean fade or wipe between sections. No prismatic sweeps.

**Duration Scale:**
| Type | Duration | Usage |
|------|----------|-------|
| Micro | 100-150ms | Button hover, toggle |
| Standard | 250-350ms | Element reveals, transitions |
| Entrance | 500-600ms | Hero line draw, section reveals |

#### Sound Design

**Removed.** Sound and haptic feedback are dropped from v1 scope. The logo's aesthetic is silent and geometric — layering audio effects conflicts with the brand restraint. This eliminates `sound.js`, `haptics.js`, and the associated complexity. Can be revisited post-launch if user testing suggests it would add value.

### 4.3 Page Architecture

The website is a single-page application with scroll-driven sections:

```
┌──────────────────────────────────────────────┐
│ NAVBAR (fixed, glassmorphic)                 │
│  Logo  ·  Features  ·  Demo  ·  Install CTA │
├──────────────────────────────────────────────┤
│                                              │
│ HERO SECTION                                 │
│  SVG crystal (stroke draw-on animation)      │
│  "Your markdown, refined."                   │
│  Subtitle + Install CTA                      │
│  Clean, airy layout with generous spacing    │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│ SOCIAL PROOF BAR                             │
│  ★ GitHub Stars · ↓ Installs · "MIT"         │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│ GUIDED SHOWCASE (scroll-triggered)           │
│  Step 1: "Write naturally" — typing anim     │
│  Step 2: "/ to create" — slash menu demo     │
│  Step 3: "Blocks that move" — drag demo      │
│  Step 4: "Your markdown, untouched" — diff   │
│  Each step: left=description, right=preview  │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│ FEATURE GRID                                 │
│  6 cards with icon + title + description     │
│  Clean bordered cards with hover accent      │
│  Cards: Slash commands, Tables, Code blocks, │
│         Callouts, Frontmatter, Dark/Light    │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│ LIVE DEMO SECTION                            │
│  "Try it yourself"                           │
│  Full embedded Quartz editor                 │
│  Pre-loaded with sample markdown             │
│  Floating "Install for VS Code" CTA          │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│ TESTIMONIALS                                 │
│  Horizontal scroll of tweet-style cards      │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│ FOOTER                                       │
│  GitHub · Marketplace · License · Credits    │
│                                              │
└──────────────────────────────────────────────┘
```

### 4.4 Visual Effects (SVG + CSS)

The logo is line-art — the website's visual effects should extend that language rather than contradict it with photorealistic 3D renders. **Three.js is dropped from the stack.** The hero crystal is an SVG, not a WebGL canvas.

**Hero Crystal (SVG):**
- The logo crystal rendered as an inline SVG with individually addressable path segments
- **Stroke draw-on animation:** On page load, the crystal's edges draw themselves via CSS `stroke-dashoffset` animation (600ms, staggered per facet)
- Subtle slow rotation via CSS `transform: rotate3d()` (pure CSS, no JS needed)
- On scroll, the crystal scales down smoothly and anchors into the navbar as the logo
- Optional: cursor proximity causes a subtle stroke-width increase on the nearest facet edges (lightweight JS, no Three.js)

**Feature Cards:**
- Clean bordered cards with thin `1px` stroke matching `--q-stroke`
- On hover: border transitions to `--q-crystal`, subtle `translateY(-2px)` lift
- No glassmorphism, no backdrop-filter, no 3D tilt — the logo doesn't use these effects, neither should the cards

**Background:**
- Clean and empty. No particles, no floating shards. The logo is a single focused shape on a clean field — the page follows suit.
- Sections separated by thin horizontal lines or alternating `--q-surface` / `--q-surface-alt` backgrounds

### 4.5 Technical Architecture

```
website/
├── index.html              # Single page
├── css/
│   ├── reset.css           # Minimal reset
│   ├── variables.css       # Design tokens (colors, type, spacing)
│   ├── base.css            # Global styles
│   ├── animations.css      # Scroll reveals, crystal draw-on, transitions
│   ├── sections/           # Per-section styles
│   │   ├── navbar.css
│   │   ├── hero.css
│   │   ├── showcase.css
│   │   ├── features.css
│   │   ├── demo.css
│   │   └── footer.css
│   └── components/         # Reusable component styles
│       ├── button.css
│       ├── card.css
│       └── badge.css
├── js/
│   ├── main.js             # Entry point, initializes all modules
│   ├── scroll.js           # GSAP ScrollTrigger animations
│   ├── showcase.js         # Guided demo step controller
│   └── stats.js            # GitHub/Marketplace stats fetcher
├── demo/                   # Embedded Quartz editor
│   ├── index.html          # iframe target
│   ├── demo.js             # Quartz editor initialization
│   └── demo.css            # Demo-specific overrides
├── assets/
│   ├── fonts/              # Inter variable, JetBrains Mono
│   ├── crystal.svg         # Logo crystal as inline-ready SVG
│   ├── og-image.png        # Social share image (1200x630)
│   └── favicon.svg         # Crystal-shaped favicon (from logo)
├── build.js                # esbuild bundler script
└── wrangler.toml           # Cloudflare Pages config
```

**No framework. No build step for development.** During dev, files are served directly. For production, `build.js` bundles and minifies via esbuild (already a project dependency).

**Dependencies (CDN or bundled):**
- `gsap` + `ScrollTrigger` (~30KB gzipped) — Scroll-driven animations
- Quartz editor core (reused from `src/webview/` + `src/markdown/`) — Live demo

**Removed from dependencies:** Three.js (~150KB) is no longer needed. The hero crystal is an SVG with CSS animations, saving significant bundle size and eliminating WebGL compatibility concerns.

### 4.6 Live Demo Integration

The embedded editor reuses Quartz's existing webview code:

```
Quartz Codebase                    Website Demo
┌────────────────────┐             ┌──────────────────┐
│ src/webview/       │ ──import──► │ demo/demo.js     │
│   components/      │             │   - No postMessage│
│   extensions/      │             │   - Direct state  │
│   styles/          │             │   - Pre-loaded MD │
│ src/markdown/      │             │   - Read-only save│
│   parser.ts        │             └──────────────────┘
│   serializer.ts    │
└────────────────────┘
```

The demo initializes TipTap directly (no VS Code bridge), loads a curated sample markdown document, and lets visitors edit freely. A "Copy Markdown" button shows the round-trip fidelity — what you edited serializes back to clean markdown.

### 4.7 Content Strategy

**Hero Copy:**
> **Your markdown, refined.**
> A Notion-style editor that lives inside VS Code. Write beautifully. Ship clean markdown.

**Showcase Steps:**

1. **"Write naturally"** — "Start typing and see your markdown rendered as rich blocks. No preview pane needed."
2. **"/ to create anything"** — "Slash commands for headings, code blocks, tables, callouts — everything Notion taught you to expect."
3. **"Blocks that move"** — "Drag, reorder, and restructure your document with block-level editing."
4. **"Your markdown, untouched"** — "Round-trip fidelity means your `.md` files stay clean. No proprietary format lock-in."

**Feature Cards:**

| Feature | Icon Concept | One-liner |
|---------|-------------|-----------|
| Slash Commands | `/` in a circle | Type / to insert any block type |
| Tables | Grid icon | Create and edit tables inline |
| Code Blocks | `</>` brackets | Syntax highlighting for 50+ languages |
| Callouts | Lightbulb | Obsidian-compatible admonition blocks |
| Frontmatter | `---` divider | YAML frontmatter with a clean banner |
| Themes | Moon/Sun | Automatic dark and light theme support |

## 5. Alternative Solutions Considered

### Alternative A: Next.js + Vercel

**Approach:** React-based website with Next.js SSR, deployed on Vercel.

**Pros:**
- React component reuse from the Quartz webview
- SSR for SEO
- Easy deployment
- Hot reload during development

**Cons:**
- ~80KB+ framework overhead for a single page
- Unnecessary complexity (routing, hydration) for a static landing page
- React adds a layer between the DOM and GSAP, complicating scroll animations
- Vercel dependency

**Why not chosen:** The website is a single page with no dynamic routing, no server-side data fetching, and no component reuse beyond the demo editor. A framework adds weight and complexity for zero benefit. GSAP works best with direct DOM access.

### Alternative B: Astro + Islands

**Approach:** Static-first site with Astro, interactive islands for the demo and 3D.

**Pros:**
- Near-zero JS for static sections
- Islands architecture for interactive parts
- Good build tooling

**Cons:**
- Another build tool to maintain
- Learning curve for Astro-specific patterns
- Islands model complicates full-page scroll animations
- Still adds abstraction between code and DOM

**Why not chosen:** Astro's island model conflicts with the full-page GSAP ScrollTrigger timeline. The site is fundamentally a scroll-driven experience where sections interact — not isolated islands.

### Alternative C: Static HTML with no 3D

**Approach:** Pure HTML/CSS with CSS animations only, no Three.js.

**Pros:**
- Smallest possible bundle
- Maximum accessibility
- Fastest load time

**Cons:**
- Limited scroll-driven animation capabilities without GSAP

**Why this approach was largely adopted:** After reviewing the actual Quartz logo — a minimal line-art crystal — the original Three.js 3D crystal approach was a mismatch. The logo's strength is geometric restraint, not photorealistic rendering. The hero crystal is now an SVG with CSS stroke-draw animation, which is both lighter and truer to the brand. GSAP is retained for scroll-driven section animations (the one thing CSS alone handles poorly), but the rest of the page is pure HTML/CSS. The live editor demo provides the interactive "wow factor" — the surrounding page is the calm, confident frame.

## 6. Security, Privacy, and Compliance

### Security

- **No backend:** The site is entirely static — no server, no database, no API endpoints to attack
- **CSP headers:** Strict Content-Security-Policy via Cloudflare Pages `_headers` file
  - `script-src 'self'` (no inline scripts, no CDN — everything bundled)
  - `style-src 'self' 'unsafe-inline'` (inline styles needed for GSAP transforms)
  - `connect-src https://api.github.com` (for live star/install counts)
- **Subresource integrity:** All third-party scripts (if any loaded via CDN) include SRI hashes
- **No cookies, no tracking:** Zero analytics for v1 (Cloudflare Web Analytics can be added later — it's cookie-free)

### Privacy

- No user data collection
- No forms (no email capture in v1)
- GitHub API calls are unauthenticated and public
- Demo editor content stays in the browser — nothing is sent anywhere

### Compliance

- MIT license badge displayed in footer
- Accessible: WCAG 2.1 AA target (contrast ratios, keyboard navigation, reduced motion support)
- `prefers-reduced-motion` media query disables all animations and replaces 3D crystal with a static image

## 7. Testing Strategy

### Unit Tests (Vitest)

- Stats fetcher (mock GitHub API responses, error handling)

### Visual Regression (Playwright screenshots)

- Hero section renders correctly with SVG crystal (light and dark themes)
- Feature cards grid layout at 3 breakpoints (1440px, 1024px, 768px)
- Demo editor loads and is interactive
- Navbar renders properly with scaled-down crystal logo
- `prefers-reduced-motion` disables animations

### E2E Tests (Playwright)

- Page loads within 3 seconds on throttled 3G
- "Install" CTA links to correct Marketplace URL
- Scroll-driven showcase advances through all 4 steps
- Demo editor accepts input and renders formatting
- GitHub stars badge displays a number (not an error)
- SVG crystal draw-on animation completes on page load
- All internal links work (no 404s)
- Keyboard navigation reaches all interactive elements

### Performance Tests

- Lighthouse CI in GitHub Actions: performance ≥ 90, accessibility ≥ 90
- Total bundle size < 300KB gzipped (excl. fonts) — significantly reduced without Three.js

### Cross-Browser

- Chrome, Firefox, Safari (latest 2 versions)
- SVG crystal works everywhere (no WebGL dependency)
- GSAP graceful degradation: if JS disabled, content is still readable (semantic HTML), SVG crystal displays statically

## 8. Rollout Plan

### Phase 1: Foundation — Static page + design system
- **Agent delivers:** `index.html` with all sections as semantic HTML, complete CSS design system (`variables.css`, section styles), SVG crystal inlined in hero, responsive layout, no JS yet. Screenshot of the rendered page.
- **Human reviews:** Visual design, does the logo-derived aesthetic carry through? Color palette in context, typography feel, layout proportions, content copy.
- **Approved when:** Human confirms "this looks like the Quartz brand" and copy resonates

### Phase 2: Motion — GSAP scroll animations + SVG crystal draw-on
- **Agent delivers:** GSAP ScrollTrigger integration, section reveal animations, SVG crystal stroke draw-on animation, navbar scroll behavior (crystal shrinks to nav logo), card hover effects. Screen recording of scroll-through.
- **Human reviews:** Animation timing/feel, does it feel refined or generic? Crystal draw-on timing. Performance on reviewer's machine.
- **Approved when:** Human confirms animations are subtle and enhance the geometric aesthetic

### Phase 3: Live demo — Embedded Quartz editor
- **Agent delivers:** Quartz editor running in an iframe, pre-loaded sample content, "Copy Markdown" button, demo-specific styling. Interactive demo.
- **Human reviews:** Editor functionality, sample content quality, visual integration with the rest of the page
- **Approved when:** Human can type, format, use slash commands, and copy clean markdown output

### Phase 4: Polish + deploy
- **Agent delivers:** SEO meta tags, Open Graph image, favicon, Lighthouse audit results, Cloudflare Pages deployment config, all tests passing
- **Human reviews:** OG image preview, final scroll-through, Lighthouse scores, live URL
- **Approved when:** Live site matches expectations, scores ≥ 90 on Lighthouse

## 9. Human Validation Plan

| Checkpoint | Agent Produces | Human Validates | Blocks |
|------------|---------------|-----------------|--------|
| Design system review | CSS variables, rendered HTML page with SVG crystal | Does it feel "Quartz"? Does the logo aesthetic carry through? Colors, fonts, spacing | Phase 2 |
| Animation feel | Screen recording of scroll-through + crystal draw-on | Timing, subtlety, performance | Phase 3 |
| Content approval | All copy in context | Messaging accuracy, tone, CTA effectiveness | Phase 3 |
| Live demo quality | Embedded editor in page context | Editor works, visual integration | Phase 4 |
| Live site sign-off | Deployed URL | Full experience end-to-end | Launch |

**Blocking human decisions (must resolve before Phase 1):**
1. Approve the crystal purple (`#7c4dff`) as the primary Quartz brand color
2. Confirm "Your markdown, refined." as the hero tagline
3. Approve the page section order and content strategy
4. Confirm light-theme-first approach (derived from logo's light-background aesthetic)

## 10. Dependencies and Risks

### Dependencies

| Dependency | Type | Risk Level |
|------------|------|------------|
| GSAP + ScrollTrigger | External library | Low — industry standard, free for non-commercial |
| Quartz editor core | Internal code | Medium — needs extraction from webview context |
| Cloudflare Pages account | Infrastructure | Low — free tier sufficient |
| Custom domain | Infrastructure | Low — optional, can use `.pages.dev` initially |
| Inter + JetBrains Mono fonts | External assets | Low — Google Fonts / self-hosted |
| GitHub API (public) | External service | Low — unauthenticated, rate limit 60/hr is sufficient |
| Logo SVG (crystal line-art) | Internal asset | Low — exists as image, needs tracing to clean SVG paths |

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SVG crystal draw-on looks underwhelming | Medium — hero needs visual impact | Low | Test timing/easing variations; the logo's geometry is inherently striking when animated well |
| Editor demo has VS Code dependencies that don't work in browser | High — demo is a core feature | Medium | Audit all imports for `vscode` API usage before Phase 3; mock or remove |
| Light theme feels generic / lacks personality | Medium — fails to differentiate | Medium | The crystal purple accent and the SVG logo animation provide distinctiveness; iterate on spacing and typographic details in Phase 1 review |
| GSAP licensing issue | High | Low | GSAP is free for non-commercial/open-source; Quartz is MIT. Verify license terms |

## 11. Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| 1 | Should we register a custom domain (e.g., `quartzeditor.dev`)? | Mathuran | No — can launch on `.pages.dev` |
| 2 | Should the hero tagline be "Your markdown, refined." or something else? | Mathuran | Yes — blocks Phase 1 content |
| 3 | Do we want Cloudflare Web Analytics (privacy-friendly, cookie-free)? | Mathuran | No — can add post-launch |
| 4 | Should the demo editor support file save/download? | Mathuran | No — "Copy Markdown" is sufficient for v1 |
| 5 | Is `#7c4dff` (crystal purple) the right signature brand color, or should we explore alternatives? | Mathuran | Yes — blocks Phase 1 design system |
| 6 | GSAP license: verify that MIT open-source project qualifies for free GSAP usage | Claude Code | Yes — blocks Phase 2 |
| 7 | Confirm light-theme-first approach (derived from logo review)? | Mathuran | Yes — blocks Phase 1 design system |
| 8 | Should the logo SVG be traced from the existing image or redrawn as clean vector paths? | Mathuran | No — either works, but clean redraw is recommended for animation control |

## 12. Implementation Issues

*To be populated after design doc approval via `/create-issues quartz-launch-website`.*

| # | Title | Status | Scope |
|---|-------|--------|-------|
| — | — | — | — |

**Progress:** 0/0 issues complete (0%)

## 13. Appendix

### A. Color Palette Derivation

The color system is derived from three sources:
1. **The Quartz logo** — A monochrome line-art crystal on a light background. This sets the light-theme-first direction and the emphasis on stroke/line over fill/gradient.
2. **Existing Quartz CSS variables** — `#1a1a2e` (code block background / Marketplace banner), `#d4d4d4` (foreground), `#7c4dff` (callout example purple)
3. **Physical quartz properties** — Real quartz crystals appear transparent to milky white, with purple (amethyst) being the most visually distinctive variety

The purple accent was chosen because:
- Amethyst (purple quartz) is the most visually distinctive quartz variety
- Purple is underused in developer tools (most use blue or green)
- It already exists in the codebase as the callout "example" color
- It provides excellent contrast against both light and dark backgrounds

The light-first approach was chosen because:
- The logo reads most naturally on a light/white background
- It differentiates from the sea of dark-themed developer tool sites (Linear, Raycast, Cursor)
- It communicates approachability and clarity — matching the "markdown editor for everyone" positioning
- Dark theme is fully supported via `prefers-color-scheme` and a manual toggle

### B. Performance Budget

| Asset Category | Budget | Notes |
|----------------|--------|-------|
| HTML + inline SVG | <25KB | Single page, semantic, crystal SVG inlined |
| CSS (all) | <30KB | Modular, no framework overhead |
| JS (main) | <40KB | GSAP + custom scripts (no Three.js) |
| JS (Demo editor) | <200KB | Lazy-loaded on scroll to demo section |
| Fonts | <100KB | Inter variable + JetBrains Mono subset |
| Images | <100KB | OG image, optimized PNGs |
| **Total** | **<495KB** | Gzipped, lazy-loaded |

First paint target: <200KB transferred (HTML + CSS + fonts). No JS needed for initial render — the SVG crystal and layout are pure HTML/CSS. GSAP enhances progressively.

### C. Responsive Breakpoints

| Breakpoint | Layout | SVG Crystal | Demo |
|------------|--------|-------------|------|
| ≥1440px | Full, max-width 1200px content | Full size, draw-on animation | Full-width editor |
| 1024-1439px | Full, fluid | Slightly smaller | Full-width editor |
| 768-1023px | Stack showcase steps | Smaller, centered | Full-width editor |
| <768px | Single column | Compact, above headline | Scrollable editor, reduced features |

### D. Accessibility Considerations

- All text meets WCAG 2.1 AA contrast ratios (4.5:1 for body, 3:1 for large text)
- `prefers-reduced-motion`: disables all GSAP animations and SVG draw-on; shows static layouts with crystal fully visible
- `prefers-color-scheme`: site defaults to light theme; dark theme triggered by media query or toggle
- Keyboard navigation: all interactive elements focusable, visible focus rings
- Screen readers: semantic HTML, ARIA labels on interactive elements, `<title>` and `role="img"` on SVG crystal
