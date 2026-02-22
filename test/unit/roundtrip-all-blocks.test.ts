import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/markdown/parser';
import { serializeMarkdown } from '../../src/markdown/serializer';

function roundTrip(md: string): string {
  const { doc, frontmatter } = parseMarkdown(md);
  return serializeMarkdown(doc, frontmatter);
}

describe('Round-Trip All Block Types', () => {
  it('should round-trip a paragraph', () => {
    const result = roundTrip('Hello world');
    expect(result).toContain('Hello world');
  });

  it('should round-trip headings H1-H3', () => {
    const md = '# Title\n\n## Subtitle\n\n### Section';
    const result = roundTrip(md);
    expect(result).toContain('# Title');
    expect(result).toContain('## Subtitle');
    expect(result).toContain('### Section');
  });

  it('should round-trip a bullet list', () => {
    const md = '- item 1\n- item 2\n- item 3';
    const result = roundTrip(md);
    expect(result).toContain('- item 1');
    expect(result).toContain('- item 2');
    expect(result).toContain('- item 3');
  });

  it('should round-trip an ordered list', () => {
    const md = '1. first\n2. second\n3. third';
    const result = roundTrip(md);
    expect(result).toContain('1. first');
    expect(result).toContain('2. second');
    expect(result).toContain('3. third');
  });

  it('should round-trip a task list', () => {
    const md = '- [ ] todo\n- [x] done';
    const result = roundTrip(md);
    expect(result).toContain('- [ ] todo');
    expect(result).toContain('- [x] done');
  });

  it('should round-trip a code block with language', () => {
    const md = '```javascript\nconst x = 1;\n```';
    const result = roundTrip(md);
    expect(result).toContain('```javascript');
    expect(result).toContain('const x = 1;');
    expect(result).toContain('```');
  });

  it('should round-trip a code block without language', () => {
    const md = '```\nplain code\n```';
    const result = roundTrip(md);
    expect(result).toContain('plain code');
    expect(result).toContain('```');
  });

  it('should round-trip a blockquote', () => {
    const md = '> quoted text';
    const result = roundTrip(md);
    expect(result).toContain('> quoted text');
  });

  it('should round-trip a table', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |';
    const result = roundTrip(md);
    expect(result).toContain('|');
    expect(result).toContain('A');
    expect(result).toContain('B');
    expect(result).toContain('1');
    expect(result).toContain('2');
    expect(result).toContain('---');
  });

  it('should round-trip a horizontal rule', () => {
    const md = '---';
    const result = roundTrip(md);
    expect(result).toContain('---');
  });

  it('should round-trip an image', () => {
    const md = '![alt text](https://example.com/img.png)';
    const result = roundTrip(md);
    expect(result).toContain('alt text');
    expect(result).toContain('https://example.com/img.png');
  });

  it('should round-trip a combined document with all block types', () => {
    const md = [
      '# Main Heading',
      '',
      '## Sub Heading',
      '',
      'A paragraph of text.',
      '',
      '- bullet one',
      '- bullet two',
      '',
      '1. ordered one',
      '2. ordered two',
      '',
      '- [ ] unchecked task',
      '- [x] checked task',
      '',
      '```typescript',
      'const y = 42;',
      '```',
      '',
      '> a blockquote',
      '',
      '| Col1 | Col2 |',
      '|------|------|',
      '| valA | valB |',
      '',
      '---',
      '',
      '![logo](https://example.com/logo.png)',
    ].join('\n');

    const result = roundTrip(md);

    expect(result).toContain('# Main Heading');
    expect(result).toContain('## Sub Heading');
    expect(result).toContain('A paragraph of text.');
    expect(result).toContain('- bullet one');
    expect(result).toContain('- bullet two');
    expect(result).toContain('1. ordered one');
    expect(result).toContain('2. ordered two');
    expect(result).toContain('- [ ] unchecked task');
    expect(result).toContain('- [x] checked task');
    expect(result).toContain('```typescript');
    expect(result).toContain('const y = 42;');
    expect(result).toContain('> a blockquote');
    expect(result).toContain('Col1');
    expect(result).toContain('Col2');
    expect(result).toContain('valA');
    expect(result).toContain('valB');
    expect(result).toContain('---');
    expect(result).toContain('logo');
    expect(result).toContain('https://example.com/logo.png');
  });

  it('should be idempotent on double round-trip', () => {
    const md = [
      '# Heading',
      '',
      'Some paragraph text here.',
      '',
      '- list item A',
      '- list item B',
      '',
      '```python',
      'print("hello")',
      '```',
      '',
      '> quote block',
      '',
      '| X | Y |',
      '|---|---|',
      '| 1 | 2 |',
      '',
      '---',
      '',
      '![img](https://example.com/pic.jpg)',
    ].join('\n');

    const first = roundTrip(md);
    const second = roundTrip(first);
    expect(second).toBe(first);
  });

  it('should round-trip frontmatter and body', () => {
    const md = '---\ntitle: Test\n---\n\n# Hello\n\nParagraph text';
    const result = roundTrip(md);
    expect(result).toContain('title: Test');
    expect(result).toContain('# Hello');
    expect(result).toContain('Paragraph text');
  });
});
