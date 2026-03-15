import { describe, it, expect } from 'vitest';
import { ALL_LANGUAGES, COMMON_LANGUAGES } from '../../src/webview/constants/languages';

describe('languages', () => {
  it('ALL_LANGUAGES has no duplicate entries by id', () => {
    const ids = ALL_LANGUAGES.map((l) => l.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('ALL_LANGUAGES contains all COMMON_LANGUAGES', () => {
    const allIds = new Set(ALL_LANGUAGES.map((l) => l.id));
    for (const lang of COMMON_LANGUAGES) {
      expect(allIds.has(lang.id)).toBe(true);
    }
  });

  it('ALL_LANGUAGES is sorted alphabetically by label', () => {
    for (let i = 1; i < ALL_LANGUAGES.length; i++) {
      expect(
        ALL_LANGUAGES[i - 1].label.localeCompare(ALL_LANGUAGES[i].label),
      ).toBeLessThanOrEqual(0);
    }
  });
});
