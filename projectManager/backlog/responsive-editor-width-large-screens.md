# Responsive Editor Width for Large Screens

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P1                           |
| **Tags**       | ux, editor                   |
| **Related**    |                              |
| **Created**    | 2026-02-21                   |

## Problem

On large high-resolution screens (e.g., 4K 27" monitors), the editor content area feels too small and narrow. The current fixed A4-style page width that looks great on a 14" MacBook leaves a disproportionate amount of unused space on larger viewports, making the editor feel cramped and underutilizing the available screen real estate. This is a significant UX issue for users with external monitors or large built-in displays.

## Desired Outcome

The editor width should scale proportionally with the viewport so it always feels "right" regardless of screen size. Instead of a fixed A4 max-width, the editor width should follow the formula:

```
width = viewport.width / √2
```

This preserves the 1:√2 aspect ratio of A4 paper dynamically — on a 14" MacBook it still looks like A4, but on a 4K 27" monitor it expands to fill a comfortable portion of the viewport. The result is an editor that breathes on large screens while maintaining familiar proportions on smaller ones.

## Scope & Boundaries

**In scope:**
- Replace fixed max-width with a responsive formula (`viewport.width / √2`)
- Ensure smooth behavior across common viewport sizes (13"–32" displays)
- Maintain existing appearance on ~14" laptop screens (no regression)

**Out of scope:**
- User-configurable width settings (could be a follow-up)
- Multi-column or split-pane editor layouts
- Print-specific A4 formatting

## Open Questions

- Should there be a minimum and maximum cap on the computed width to prevent extremes on very small or very large viewports?
- Should the width update live on window resize, or only on initial render?
- Does the VS Code webview viewport width accurately represent the visible panel width, or do we need to account for sidebars/panels?

## Notes

- The √2 ratio (≈1.414) is the A4 aspect ratio, so this approach is a natural generalization of the current fixed-width design.
- CSS `calc()` with viewport units (`vw`) can implement this without JavaScript: `max-width: calc(100vw / 1.414)`.
- Consider the interaction with VS Code's editor group splits — if the user has side-by-side editors, the viewport width for the webview panel is already reduced.
