import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/markdown/parser';

describe('Callout Parser (blockquote handler)', () => {
  it('should parse basic callout with content', () => {
    const md = '> [!note]\n> Some content here';
    const { doc } = parseMarkdown(md);
    const callout = doc.content![0];
    expect(callout.type).toBe('callout');
    expect(callout.attrs!.calloutType).toBe('note');
    expect(callout.attrs!.title).toBe('');
    expect(callout.attrs!.collapsed).toBe(false);
    expect(callout.attrs!.foldable).toBe(false);
    // Content should be the remaining paragraph
    expect(callout.content!.length).toBe(1);
    expect(callout.content![0].type).toBe('paragraph');
  });

  it('should parse all 8 callout types', () => {
    const types = ['note', 'tip', 'warning', 'danger', 'info', 'example', 'quote', 'abstract'];
    for (const type of types) {
      const md = `> [!${type}]\n> Content`;
      const { doc } = parseMarkdown(md);
      const callout = doc.content![0];
      expect(callout.type).toBe('callout');
      expect(callout.attrs!.calloutType).toBe(type);
    }
  });

  it('should parse callout types case-insensitively', () => {
    const variants = ['NOTE', 'Note', 'note', 'NoTe'];
    for (const variant of variants) {
      const md = `> [!${variant}]\n> Content`;
      const { doc } = parseMarkdown(md);
      const callout = doc.content![0];
      expect(callout.type).toBe('callout');
      expect(callout.attrs!.calloutType).toBe('note');
    }
  });

  it('should parse callout with title', () => {
    const md = '> [!warning] Be careful\n> This is dangerous';
    const { doc } = parseMarkdown(md);
    const callout = doc.content![0];
    expect(callout.type).toBe('callout');
    expect(callout.attrs!.calloutType).toBe('warning');
    expect(callout.attrs!.title).toBe('Be careful');
  });

  it('should parse callout without title', () => {
    const md = '> [!info]\n> Information here';
    const { doc } = parseMarkdown(md);
    const callout = doc.content![0];
    expect(callout.attrs!.title).toBe('');
  });

  it('should parse callout with empty/whitespace-only title', () => {
    const md = '> [!note] \n> Content';
    const { doc } = parseMarkdown(md);
    const callout = doc.content![0];
    expect(callout.type).toBe('callout');
    expect(callout.attrs!.title).toBe('');
  });

  it('should parse collapsed callout (minus suffix)', () => {
    const md = '> [!tip]-\n> Hidden content';
    const { doc } = parseMarkdown(md);
    const callout = doc.content![0];
    expect(callout.type).toBe('callout');
    expect(callout.attrs!.calloutType).toBe('tip');
    expect(callout.attrs!.collapsed).toBe(true);
    expect(callout.attrs!.foldable).toBe(true);
  });

  it('should parse expandable callout (plus suffix)', () => {
    const md = '> [!tip]+\n> Visible content';
    const { doc } = parseMarkdown(md);
    const callout = doc.content![0];
    expect(callout.type).toBe('callout');
    expect(callout.attrs!.calloutType).toBe('tip');
    expect(callout.attrs!.collapsed).toBe(false);
    expect(callout.attrs!.foldable).toBe(true);
  });

  it('should parse non-foldable callout (no suffix)', () => {
    const md = '> [!note]\n> Content';
    const { doc } = parseMarkdown(md);
    const callout = doc.content![0];
    expect(callout.attrs!.foldable).toBe(false);
    expect(callout.attrs!.collapsed).toBe(false);
  });

  it('should parse foldable callout with title', () => {
    const md = '> [!danger]- Watch out!\n> Scary stuff';
    const { doc } = parseMarkdown(md);
    const callout = doc.content![0];
    expect(callout.attrs!.calloutType).toBe('danger');
    expect(callout.attrs!.collapsed).toBe(true);
    expect(callout.attrs!.foldable).toBe(true);
    expect(callout.attrs!.title).toBe('Watch out!');
  });

  it('should parse callout with multiple paragraphs', () => {
    const md = '> [!note]\n>\n> First paragraph\n>\n> Second paragraph';
    const { doc } = parseMarkdown(md);
    const callout = doc.content![0];
    expect(callout.type).toBe('callout');
    expect(callout.content!.length).toBe(2);
    expect(callout.content![0].type).toBe('paragraph');
    expect(callout.content![1].type).toBe('paragraph');
  });

  it('should parse callout with bullet list inside', () => {
    const md = '> [!example]\n> - Item 1\n> - Item 2';
    const { doc } = parseMarkdown(md);
    const callout = doc.content![0];
    expect(callout.type).toBe('callout');
    const list = callout.content!.find((n) => n.type === 'bulletList');
    expect(list).toBeDefined();
  });

  it('should parse empty callout (marker only, no additional content)', () => {
    const md = '> [!note]';
    const { doc } = parseMarkdown(md);
    const callout = doc.content![0];
    expect(callout.type).toBe('callout');
    expect(callout.attrs!.calloutType).toBe('note');
    // Should have a default empty paragraph as content
    expect(callout.content!.length).toBe(1);
    expect(callout.content![0].type).toBe('paragraph');
  });

  it('should still parse regular blockquotes as blockquote nodes', () => {
    const md = '> Just a regular quote\n> with more text';
    const { doc } = parseMarkdown(md);
    const node = doc.content![0];
    expect(node.type).toBe('blockquote');
  });

  it('should not match invalid callout syntax', () => {
    const md = '> [!invalid]\n> Content';
    const { doc } = parseMarkdown(md);
    const node = doc.content![0];
    expect(node.type).toBe('blockquote');
  });

  it('should not match callout-like text that is not at beginning', () => {
    const md = '> Some text [!note]\n> Content';
    const { doc } = parseMarkdown(md);
    const node = doc.content![0];
    expect(node.type).toBe('blockquote');
  });
});
