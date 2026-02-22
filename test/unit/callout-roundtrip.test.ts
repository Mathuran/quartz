import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/markdown/parser';
import { serializeMarkdown } from '../../src/markdown/serializer';

function roundTrip(md: string): string {
  const { doc, frontmatter } = parseMarkdown(md);
  return serializeMarkdown(doc, frontmatter);
}

function assertRoundTrip(md: string): void {
  const firstPass = parseMarkdown(md);
  const serialized = serializeMarkdown(firstPass.doc, firstPass.frontmatter);
  const secondPass = parseMarkdown(serialized);
  // Structural equivalence: parse(serialize(parse(md))) === parse(md)
  expect(secondPass).toEqual(firstPass);
}

describe('Callout Round-Trip', () => {
  it('should round-trip a basic note callout', () => {
    const md = '> [!note]\n> Some content here';
    assertRoundTrip(md);
    const result = roundTrip(md);
    expect(result).toContain('[!note]');
    expect(result).toContain('Some content here');
  });

  it('should round-trip all 8 callout types', () => {
    const types = ['note', 'tip', 'warning', 'danger', 'info', 'example', 'quote', 'abstract'];
    for (const type of types) {
      const md = `> [!${type}]\n> Content for ${type}`;
      assertRoundTrip(md);
    }
  });

  it('should round-trip callout with title', () => {
    const md = '> [!warning] Be careful\n> This is important';
    assertRoundTrip(md);
    const result = roundTrip(md);
    expect(result).toContain('[!warning] Be careful');
  });

  it('should round-trip collapsed callout', () => {
    const md = '> [!tip]-\n> Hidden content';
    assertRoundTrip(md);
    const result = roundTrip(md);
    expect(result).toContain('[!tip]-');
  });

  it('should round-trip expanded foldable callout', () => {
    const md = '> [!tip]+\n> Visible content';
    assertRoundTrip(md);
    const result = roundTrip(md);
    expect(result).toContain('[!tip]+');
  });

  it('should round-trip foldable callout with title', () => {
    const md = '> [!danger]- Watch out!\n> Scary stuff';
    assertRoundTrip(md);
    const result = roundTrip(md);
    expect(result).toContain('[!danger]- Watch out!');
  });

  it('should round-trip callout with multiple paragraphs', () => {
    const md = '> [!note]\n>\n> First paragraph\n>\n> Second paragraph';
    assertRoundTrip(md);
    const result = roundTrip(md);
    expect(result).toContain('First paragraph');
    expect(result).toContain('Second paragraph');
  });

  it('should round-trip empty callout', () => {
    const md = '> [!note]';
    assertRoundTrip(md);
  });

  it('should not affect regular blockquotes', () => {
    const md = '> Just a regular quote';
    assertRoundTrip(md);
    const result = roundTrip(md);
    expect(result).toContain('> Just a regular quote');
    // Should NOT contain callout syntax
    expect(result).not.toContain('[!');
  });

  it('should round-trip callout with list inside', () => {
    const md = '> [!example]\n> - Item 1\n> - Item 2';
    assertRoundTrip(md);
  });
});
