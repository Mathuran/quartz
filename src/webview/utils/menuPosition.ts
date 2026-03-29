/**
 * Viewport-aware menu positioning utilities.
 *
 * Determines whether a dropdown/menu should open upward or downward
 * based on available viewport space.
 */

/**
 * Returns true if the menu should open upward (insufficient space below,
 * sufficient space above).
 */
export function shouldOpenUpward(
  anchorBottom: number,
  anchorTop: number,
  menuHeight: number,
  viewportHeight: number = typeof window !== 'undefined' ? window.innerHeight : 800,
  margin: number = 8,
): boolean {
  const spaceBelow = viewportHeight - anchorBottom - margin;
  const spaceAbove = anchorTop - margin;
  return spaceBelow < menuHeight && spaceAbove > spaceBelow;
}

/**
 * Computes the final `top` position for a fixed-position menu,
 * along with whether it opens upward.
 */
export function computeMenuTop(
  anchorCoords: { top: number; bottom: number },
  menuHeight: number,
  gap: number = 4,
): { top: number; openUpward: boolean } {
  const openUpward = shouldOpenUpward(anchorCoords.bottom, anchorCoords.top, menuHeight);
  if (openUpward) {
    return { top: anchorCoords.top - menuHeight - gap, openUpward: true };
  }
  return { top: anchorCoords.bottom + gap, openUpward: false };
}
