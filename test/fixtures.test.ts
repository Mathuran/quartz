import { describe, it, expect } from 'vitest';
import { parseFixture, readFixture, listFixtures, assertRoundtrip } from './helpers';

describe('Fixture Files', () => {
  const fixtures = listFixtures();

  it('should have fixture files available', () => {
    expect(fixtures.length).toBeGreaterThan(0);
    expect(fixtures).toContain('headings');
    expect(fixtures).toContain('lists');
    expect(fixtures).toContain('code-blocks');
    expect(fixtures).toContain('tables');
    expect(fixtures).toContain('inline-formatting');
    expect(fixtures).toContain('blockquotes');
    expect(fixtures).toContain('mixed-document');
    expect(fixtures).toContain('edge-cases');
  });

  describe('parsing', () => {
    for (const name of fixtures) {
      it(`should parse fixture "${name}" without error`, () => {
        const result = parseFixture(name);
        expect(result.type).toBe('doc');
        expect(result.content!.length).toBeGreaterThan(0);
      });
    }
  });

  describe('round-trip fidelity', () => {
    for (const name of fixtures) {
      it(`should round-trip fixture "${name}" — parse(serialize(parse(md))) === parse(md)`, () => {
        const markdown = readFixture(name);
        assertRoundtrip(markdown);
      });
    }
  });
});
