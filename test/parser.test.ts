import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/markdown/parser';

describe('Markdown Parser', () => {
  it('should parse empty string to single empty paragraph', () => {
    const { doc: result } = parseMarkdown('');
    expect(result.type).toBe('doc');
    expect(result.content).toHaveLength(1);
    expect(result.content![0].type).toBe('paragraph');
  });

  it('should parse whitespace-only string to single empty paragraph', () => {
    const { doc: result } = parseMarkdown('   \n  \n  ');
    expect(result.type).toBe('doc');
    expect(result.content).toHaveLength(1);
    expect(result.content![0].type).toBe('paragraph');
  });

  it('should parse a simple paragraph', () => {
    const { doc: result } = parseMarkdown('Hello world');
    expect(result.content).toHaveLength(1);
    expect(result.content![0].type).toBe('paragraph');
    expect(result.content![0].content![0].text).toBe('Hello world');
  });

  it('should parse headings H1-H6', () => {
    for (let level = 1; level <= 6; level++) {
      const prefix = '#'.repeat(level);
      const { doc: result } = parseMarkdown(`${prefix} Heading ${level}`);
      const heading = result.content![0];
      expect(heading.type).toBe('heading');
      expect(heading.attrs?.level).toBe(level);
      expect(heading.content![0].text).toBe(`Heading ${level}`);
    }
  });

  it('should parse bullet list', () => {
    const md = '- Item 1\n- Item 2\n- Item 3';
    const { doc: result } = parseMarkdown(md);
    const list = result.content![0];
    expect(list.type).toBe('bulletList');
    expect(list.content).toHaveLength(3);
    expect(list.content![0].type).toBe('listItem');
  });

  it('should parse bullet list items without dash prefix in text content', () => {
    const md = '- Item 1\n- Item 2\n- Item 3';
    const { doc: result } = parseMarkdown(md);
    const list = result.content![0];
    expect(list.type).toBe('bulletList');

    // Each list item's text content should NOT include the dash prefix
    list.content!.forEach((item, index) => {
      const paragraph = item.content![0];
      expect(paragraph.type).toBe('paragraph');
      const textNode = paragraph.content![0];
      expect(textNode.type).toBe('text');
      // Text should be "Item N", not "- Item N"
      expect(textNode.text).toBe(`Item ${index + 1}`);
      expect(textNode.text).not.toMatch(/^[-*+]\s/);
    });
  });

  it('should parse ordered list', () => {
    const md = '1. First\n2. Second\n3. Third';
    const { doc: result } = parseMarkdown(md);
    const list = result.content![0];
    expect(list.type).toBe('orderedList');
    expect(list.content).toHaveLength(3);
  });

  it('should parse ordered list items without number prefix in text content', () => {
    const md = '1. First\n2. Second\n3. Third';
    const { doc: result } = parseMarkdown(md);
    const list = result.content![0];
    expect(list.type).toBe('orderedList');

    const expectedTexts = ['First', 'Second', 'Third'];
    // Each list item's text content should NOT include the number prefix
    list.content!.forEach((item, index) => {
      const paragraph = item.content![0];
      expect(paragraph.type).toBe('paragraph');
      const textNode = paragraph.content![0];
      expect(textNode.type).toBe('text');
      // Text should be "First", "Second", "Third", not "1. First", "2. Second", "3. Third"
      expect(textNode.text).toBe(expectedTexts[index]);
      expect(textNode.text).not.toMatch(/^\d+\.\s/);
    });
  });

  it('should parse nested bullet list', () => {
    const md = '- Top\n  - Nested\n    - Deep';
    const { doc: result } = parseMarkdown(md);
    const list = result.content![0];
    expect(list.type).toBe('bulletList');
    // First item should contain a nested list
    const firstItem = list.content![0];
    expect(firstItem.content!.length).toBeGreaterThan(1);
  });

  it('should parse nested lists without markdown prefixes at all levels', () => {
    const md = '- Level 1\n  - Level 2\n    - Level 3';
    const { doc: result } = parseMarkdown(md);

    // Helper to extract text from a list item
    const getItemText = (item: { content?: { type: string; content?: { type: string; text?: string }[] }[] }) => {
      const paragraph = item.content?.[0];
      if (paragraph?.type === 'paragraph' && paragraph.content?.[0]) {
        return paragraph.content[0].text;
      }
      return null;
    };

    // Helper to check no prefix in text
    const hasNoPrefix = (text: string | null | undefined) => {
      if (!text) return true;
      return !text.match(/^[-*+]\s/) && !text.match(/^\d+\.\s/);
    };

    // Level 1
    const level1List = result.content![0];
    expect(level1List.type).toBe('bulletList');
    const level1Item = level1List.content![0];
    const level1Text = getItemText(level1Item);
    expect(level1Text).toBe('Level 1');
    expect(hasNoPrefix(level1Text)).toBe(true);

    // Level 2
    const level2List = level1Item.content?.find((n: { type: string }) => n.type === 'bulletList');
    expect(level2List).toBeDefined();
    const level2Item = level2List!.content![0];
    const level2Text = getItemText(level2Item);
    expect(level2Text).toBe('Level 2');
    expect(hasNoPrefix(level2Text)).toBe(true);

    // Level 3
    const level3List = level2Item.content?.find((n: { type: string }) => n.type === 'bulletList');
    expect(level3List).toBeDefined();
    const level3Item = level3List!.content![0];
    const level3Text = getItemText(level3Item);
    expect(level3Text).toBe('Level 3');
    expect(hasNoPrefix(level3Text)).toBe(true);
  });

  it('should parse code block with language', () => {
    const md = '```typescript\nconst x = 1;\n```';
    const { doc: result } = parseMarkdown(md);
    const codeBlock = result.content![0];
    expect(codeBlock.type).toBe('codeBlock');
    expect(codeBlock.attrs?.language).toBe('typescript');
    expect(codeBlock.content![0].text).toBe('const x = 1;');
  });

  it('should parse code block without language', () => {
    const md = '```\nsome code\n```';
    const { doc: result } = parseMarkdown(md);
    const codeBlock = result.content![0];
    expect(codeBlock.type).toBe('codeBlock');
  });

  it('should parse blockquote', () => {
    const md = '> This is a quote';
    const { doc: result } = parseMarkdown(md);
    const blockquote = result.content![0];
    expect(blockquote.type).toBe('blockquote');
    expect(blockquote.content![0].type).toBe('paragraph');
  });

  it('should parse horizontal rule', () => {
    const md = 'Before\n\n---\n\nAfter';
    const { doc: result } = parseMarkdown(md);
    expect(result.content!.some((n) => n.type === 'horizontalRule')).toBe(true);
  });

  it('should parse inline bold', () => {
    const { doc: result } = parseMarkdown('This is **bold** text');
    const paragraph = result.content![0];
    const boldNode = paragraph.content!.find(
      (n) => n.marks?.some((m) => m.type === 'bold')
    );
    expect(boldNode).toBeDefined();
    expect(boldNode!.text).toBe('bold');
  });

  it('should parse inline italic', () => {
    const { doc: result } = parseMarkdown('This is *italic* text');
    const paragraph = result.content![0];
    const italicNode = paragraph.content!.find(
      (n) => n.marks?.some((m) => m.type === 'italic')
    );
    expect(italicNode).toBeDefined();
    expect(italicNode!.text).toBe('italic');
  });

  it('should parse inline strikethrough', () => {
    const { doc: result } = parseMarkdown('This is ~~struck~~ text');
    const paragraph = result.content![0];
    const strikeNode = paragraph.content!.find(
      (n) => n.marks?.some((m) => m.type === 'strike')
    );
    expect(strikeNode).toBeDefined();
    expect(strikeNode!.text).toBe('struck');
  });

  it('should parse inline code', () => {
    const { doc: result } = parseMarkdown('Use `console.log()` here');
    const paragraph = result.content![0];
    const codeNode = paragraph.content!.find(
      (n) => n.marks?.some((m) => m.type === 'code')
    );
    expect(codeNode).toBeDefined();
    expect(codeNode!.text).toBe('console.log()');
  });

  it('should parse links', () => {
    const { doc: result } = parseMarkdown('[click here](https://example.com)');
    const paragraph = result.content![0];
    const linkNode = paragraph.content!.find(
      (n) => n.marks?.some((m) => m.type === 'link')
    );
    expect(linkNode).toBeDefined();
    expect(linkNode!.text).toBe('click here');
    const linkMark = linkNode!.marks!.find((m) => m.type === 'link');
    expect(linkMark!.attrs!.href).toBe('https://example.com');
  });

  it('should parse frontmatter separately from doc', () => {
    const md = '---\ntitle: Test\ndate: 2024-01-01\n---\n\n# Hello';
    const { doc, frontmatter } = parseMarkdown(md);
    // Frontmatter should be returned as a separate string
    expect(frontmatter).toBe('title: Test\ndate: 2024-01-01');
    // Frontmatter should NOT be present as a codeBlock node in doc.content
    expect(doc.content![0].type).not.toBe('codeBlock');
    // First node should be the heading
    expect(doc.content![0].type).toBe('heading');
  });

  it('should parse task list', () => {
    const md = '- [ ] Unchecked\n- [x] Checked';
    const { doc: result } = parseMarkdown(md);
    const list = result.content![0];
    expect(list.type).toBe('taskList');
    expect(list.content).toHaveLength(2);
    expect(list.content![0].attrs?.checked).toBe(false);
    expect(list.content![1].attrs?.checked).toBe(true);
  });

  it('should parse table', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |';
    const { doc: result } = parseMarkdown(md);
    const table = result.content![0];
    expect(table.type).toBe('table');
    expect(table.content).toHaveLength(2); // header row + 1 body row
  });

  it('should parse image', () => {
    const md = '![alt text](image.png)';
    const { doc: result } = parseMarkdown(md);
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
    const { doc: result } = parseMarkdown(md);
    expect(result.content!.length).toBeGreaterThan(0);
  });

  it('should parse mixed inline marks (bold+italic)', () => {
    const { doc: result } = parseMarkdown('***bold and italic***');
    const paragraph = result.content![0];
    expect(paragraph.content).toBeDefined();
    // markdown-it may nest em inside strong, creating multiple text nodes with marks
    const allMarks = paragraph.content!.flatMap((n) => (n.marks || []).map((m) => m.type));
    expect(allMarks).toContain('bold');
    expect(allMarks).toContain('italic');
  });
});
