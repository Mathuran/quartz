import { describe, it, expect } from 'vitest';
import { shouldOpenUpward, computeMenuTop } from '../../src/webview/utils/menuPosition';

describe('shouldOpenUpward', () => {
  const menuHeight = 320;
  const viewportHeight = 800;

  it('returns false when there is plenty of space below', () => {
    // anchor at y=100, plenty of room below
    expect(shouldOpenUpward(110, 100, menuHeight, viewportHeight)).toBe(false);
  });

  it('returns true when near the bottom of the viewport', () => {
    // anchor at y=600, only 200px below (less than 320)
    expect(shouldOpenUpward(600, 580, menuHeight, viewportHeight)).toBe(true);
  });

  it('returns false when both above and below are tight but below is bigger', () => {
    // anchor in the middle-ish, tight on both sides but more below
    expect(shouldOpenUpward(300, 280, menuHeight, viewportHeight)).toBe(false);
  });

  it('returns false when there is exactly enough space below', () => {
    // 800 - 472 - 8 = 320 exactly
    expect(shouldOpenUpward(472, 450, menuHeight, viewportHeight)).toBe(false);
  });

  it('returns true when space below is less than menu height and more space above', () => {
    // anchor near bottom: spaceBelow = 800 - 700 - 8 = 92, spaceAbove = 680 - 8 = 672
    expect(shouldOpenUpward(700, 680, menuHeight, viewportHeight)).toBe(true);
  });

  it('uses custom margin', () => {
    // With margin=50: spaceBelow = 800 - 500 - 50 = 250 (< 320), spaceAbove = 480 - 50 = 430
    expect(shouldOpenUpward(500, 480, menuHeight, viewportHeight, 50)).toBe(true);
    // With margin=0: spaceBelow = 800 - 500 = 300 (< 320), spaceAbove = 480
    expect(shouldOpenUpward(500, 480, menuHeight, viewportHeight, 0)).toBe(true);
  });
});

describe('computeMenuTop', () => {
  it('opens downward when space is available', () => {
    const result = computeMenuTop({ top: 100, bottom: 120 }, 320);
    expect(result.openUpward).toBe(false);
    expect(result.top).toBe(124); // bottom + 4
  });

  it('opens upward when near the bottom', () => {
    // Use a viewport height context where bottom=700 leaves no room
    // shouldOpenUpward(700, 680, 320, 800) → true
    const result = computeMenuTop({ top: 680, bottom: 700 }, 320);
    expect(result.openUpward).toBe(true);
    expect(result.top).toBe(356); // top - 320 - 4
  });

  it('respects custom gap', () => {
    const result = computeMenuTop({ top: 100, bottom: 120 }, 320, 10);
    expect(result.openUpward).toBe(false);
    expect(result.top).toBe(130); // bottom + 10
  });

  it('positions correctly when opening upward with custom gap', () => {
    const result = computeMenuTop({ top: 680, bottom: 700 }, 320, 10);
    expect(result.openUpward).toBe(true);
    expect(result.top).toBe(350); // top - 320 - 10
  });
});
