import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/markdown/parser';

describe('Markdown Parser', () => {
  it('should parse empty string to single empty paragraph', () => {
    const result = parseMarkdown('');
    expect(result.type).toBe('doc');
    expect(result.content).toHaveLength(1);
    expect(result.content![0].type).toBe('paragraph');
  });

  it('should parse whitespace-only string to single empty paragraph', () => {
    const result = parseMarkdown('   \n  \n  ');
    expect(result.type).toBe('doc');
    expect(result.content).toHaveLength(1);
    expect(result.content![0].type).toBe('paragraph');
  });

  it('should parse a simple paragraph', () => {
    const result = parseMarkdown('Hello world');
    expect(result.content).toHaveLength(1);
    expect(result.content![0].type).toBe('paragraph');
    expect(result.content![0].content![0].text).toBe('Hello world');
  });

  it('should parse headings H1-H6', () => {
    for (let level = 1; level <= 6; level++) {
      const prefix = '#'.repeat(level);
      const result = parseMarkdown(`${prefix} Heading ${level}`);
      const heading = result.content![0];
      expect(heading.type).toBe('heading');
      expect(heading.attrs?.level).toBe(level);
      expect(heading.content![0].text).toBe(`Heading ${level}`);
    }
  });

  it('should parse bullet list', () => {
    const md = '- Item 1\n- Item 2\n- Item 3';
    const result = parseMarkdown(md);
    const list = result.content![0];
    expect(list.type).toBe('bulletList');
    expect(list.content).toHaveLength(3);
    expect(list.content![0].type).toBe('listItem');
  });

  it('should parse ordered list', () => {
    const md = '1. First\n2. Second\n3. Third';
    const result = parseMarkdown(md);
    const list = result.content![0];
    expect(list.type).toBe('orderedList');
    expect(list.content).toHaveLength(3);
  });

  it('should parse nested bullet list', () => {
    const md = '- Top\n  - Nested\n    - Deep';
    const result = parseMarkdown(md);
    const list = result.content![0];
    expect(list.type).toBe('bulletList');
    // First item should contain a nested list
    const firstItem = list.content![0];
    expect(firstItem.content!.length).toBeGreaterThan(1);
  });

  it('should parse code block with language', () => {
    const md = '```typescript\nconst x = 1;\n```';
    const result = parseMarkdown(md);
    const codeBlock = result.content![0];
    expect(codeBlock.type).toBe('codeBlock');
    expect(codeBlock.attrs?.language).toBe('typescript');
    expect(codeBlock.content![0].text).toBe('const x = 1;');
  });

  it('should parse code block without language', () => {
    const md = '```\nsome code\n```';
    const result = parseMarkdown(md);
    const codeBlock = result.content![0];
    expect(codeBlock.type).toBe('codeBlock');
  });

  it('should parse blockquote', () => {
    const md = '> This is a quote';
    const result = parseMarkdown(md);
    const blockquote = result.content![0];
    expect(blockquote.type).toBe('blockquote');
    expect(blockquote.content![0].type).toBe('paragraph');
  });

  it('should parse horizontal rule', () => {
    const md = 'Before\n\n---\n\nAfter';
    const result = parseMarkdown(md);
    expect(result.content!.some((n) => n.type === 'horizontalRule')).toBe(true);
  });

  it('should parse inline bold', () => {
    const result = parseMarkdown('This is **bold** text');
    const paragraph = result.content![0];
    const boldNode = paragraph.content!.find(
      (n) => n.marks?.some((m) => m.type === 'bold')
    );
    expect(boldNode).toBeDefined();
    expect(boldNode!.text).toBe('bold');
  });

  it('should parse inline italic', () => {
    const result = parseMarkdown('This is *italic* text');
    const paragraph = result.content![0];
    const italicNode = paragraph.content!.find(
      (n) => n.marks?.some((m) => m.type === 'italic')
    );
    expect(italicNode).toBeDefined();
    expect(italicNode!.text).toBe('italic');
  });

  it('should parse inline strikethrough', () => {
    const result = parseMarkdown('This is ~~struck~~ text');
    const paragraph = result.content![0];
    const strikeNode = paragraph.content!.find(
      (n) => n.marks?.some((m) => m.type === 'strike')
    );
    expect(strikeNode).toBeDefined();
    expect(strikeNode!.text).toBe('struck');
  });

  it('should parse inline code', () => {
    const result = parseMarkdown('Use `console.log()` here');
    const paragraph = result.content![0];
    const codeNode = paragraph.content!.find(
      (n) => n.marks?.some((m) => m.type === 'code')
    );
    expect(codeNode).toBeDefined();
    expect(codeNode!.text).toBe('console.log()');
  });

  it('should parse links', () => {
    const result = parseMarkdown('[click here](https://example.com)');
    const paragraph = result.content![0];
    const linkNode = paragraph.content!.find(
      (n) => n.marks?.some((m) => m.type === 'link')
    );
    expect(linkNode).toBeDefined();
    expect(linkNode!.text).toBe('click here');
    const linkMark = linkNode!.marks!.find((m) => m.type === 'link');
    expect(linkMark!.attrs!.href).toBe('https://example.com');
  });

  it('should parse frontmatter', () => {
    const md = '---\ntitle: Test\ndate: 2024-01-01\n---\n\n# Hello';
    const result = parseMarkdown(md);
    // First node should be the frontmatter code block
    const frontmatter = result.content![0];
    expect(frontmatter.type).toBe('codeBlock');
    expect(frontmatter.attrs?.language).toBe('yaml');
    expect(frontmatter.content![0].text).toContain('title: Test');
    // Second node should be the heading
    expect(result.content![1].type).toBe('heading');
  });

  it('should parse task list', () => {
    const md = '- [ ] Unchecked\n- [x] Checked';
    const result = parseMarkdown(md);
    const list = result.content![0];
    expect(list.type).toBe('taskList');
    expect(list.content).toHaveLength(2);
    expect(list.content![0].attrs?.checked).toBe(false);
    expect(list.content![1].attrs?.checked).toBe(true);
  });

  it('should parse table', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |';
    const result = parseMarkdown(md);
    const table = result.content![0];
    expect(table.type).toBe('table');
    expect(table.content).toHaveLength(2); // header row + 1 body row
  });

  it('should parse image', () => {
    const md = '![alt text](image.png)';
    const result = parseMarkdown(md);
    const paragraph = result.content![0];
    const image = paragraph.content!.find((n) => n.type === 'image');
    expect(image).toBeDefined();
    expect(image!.attrs?.src).toBe('image.png');
    expect(image!.attrs?.alt).toBe('alt text');
  });

  it('should handle large documents without error', () => {
    const lines = Array.from({ length: 1000 }, (_, i) => `Line ${i + 1}`);
    const md = lines.join('\n\n');
    expect(() => parseMarkdown(md)).not.toThrow();
    const result = parseMarkdown(md);
    expect(result.content!.length).toBeGreaterThan(0);
  });

  it('should parse mixed inline marks (bold+italic)', () => {
    const result = parseMarkdown('***bold and italic***');
    const paragraph = result.content![0];
    expect(paragraph.content).toBeDefined();
    // markdown-it may nest em inside strong, creating multiple text nodes with marks
    const allMarks = paragraph.content!.flatMap((n) => (n.marks || []).map((m) => m.type));
    expect(allMarks).toContain('bold');
    expect(allMarks).toContain('italic');
  });
});
