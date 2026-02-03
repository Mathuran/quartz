import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/markdown/parser';
import { serializeMarkdown } from '../src/markdown/serializer';
import { extractFrontmatter, hasFrontmatter } from '../src/markdown/frontmatter';
import type { JSONContent } from '@tiptap/core';

function doc(...content: JSONContent[]): JSONContent {
  return { type: 'doc', content };
}

function paragraph(...text: string[]): JSONContent {
  return {
    type: 'paragraph',
    content: text.map((t) => ({ type: 'text', text: t })),
  };
}

function roundTrip(md: string): string {
  return serializeMarkdown(parseMarkdown(md));
}

describe('Frontmatter Extraction', () => {
  it('should extract valid YAML frontmatter and return body', () => {
    const text = '---\ntitle: Hello\ndate: 2024-01-01\n---\n\nBody content here';
    const result = extractFrontmatter(text);
    expect(result.frontmatter).toBe('title: Hello\ndate: 2024-01-01');
    expect(result.body).toBe('\nBody content here');
  });

  it('should return null frontmatter and full body when no frontmatter present', () => {
    const text = 'Just a regular document\nwith no frontmatter';
    const result = extractFrontmatter(text);
    expect(result.frontmatter).toBeNull();
    expect(result.body).toBe(text);
  });

  it('should not treat mid-document dashes as frontmatter', () => {
    const text = 'Some text\n---\ntitle: Nope\n---\nMore text';
    const result = extractFrontmatter(text);
    expect(result.frontmatter).toBeNull();
    expect(result.body).toBe(text);
  });

  it('hasFrontmatter should return true for text with frontmatter', () => {
    const text = '---\ntitle: Test\n---\n\nContent';
    expect(hasFrontmatter(text)).toBe(true);
  });

  it('hasFrontmatter should return false for text without frontmatter', () => {
    const text = 'No frontmatter here';
    expect(hasFrontmatter(text)).toBe(false);
  });
});

describe('Nested Blockquote', () => {
  it('should parse multi-paragraph blockquote structure', () => {
    const md = '> first line\n>\n> second line';
    const result = parseMarkdown(md);
    const outer = result.content![0];
    expect(outer.type).toBe('blockquote');
    expect(outer.content!.length).toBeGreaterThanOrEqual(2);
    expect(outer.content![0].type).toBe('paragraph');
    expect(outer.content![1].type).toBe('paragraph');
  });

  it('should round-trip a simple blockquote', () => {
    const md = '> quoted text\n';
    const result = roundTrip(md);
    expect(result).toContain('> quoted text');
  });

  it('should parse a blockquote node constructed with nested structure', () => {
    // Verify the serializer handles nested blockquote JSONContent correctly
    const nestedBlockquote: JSONContent = {
      type: 'blockquote',
      content: [
        {
          type: 'blockquote',
          content: [paragraph('deeply nested')],
        },
      ],
    };
    const result = serializeMarkdown(doc(nestedBlockquote));
    expect(result).toContain('> > deeply nested');
  });
});

describe('Code Block Without Language', () => {
  it('should parse a code block without language identifier', () => {
    const md = '```\nplain code\n```';
    const result = parseMarkdown(md);
    const codeBlock = result.content![0];
    expect(codeBlock.type).toBe('codeBlock');
    expect(codeBlock.attrs?.language).toBeUndefined();
    expect(codeBlock.content![0].text).toBe('plain code');
  });

  it('should round-trip a code block without language', () => {
    const md = '```\nplain code\n```\n';
    const result = roundTrip(md);
    expect(result).toContain('```\nplain code\n```');
  });
});

describe('Empty List Items', () => {
  it('should parse a list with an empty first item', () => {
    const md = '-\n- text';
    const result = parseMarkdown(md);
    const list = result.content![0];
    expect(list.type).toBe('bulletList');
    expect(list.content).toHaveLength(2);
    // First item should be a listItem (possibly with empty paragraph)
    expect(list.content![0].type).toBe('listItem');
    // Second item should contain "text"
    const secondItem = list.content![1];
    expect(secondItem.type).toBe('listItem');
    const secondParagraph = secondItem.content![0];
    expect(secondParagraph.content![0].text).toBe('text');
  });
});

describe('Multiple Paragraphs', () => {
  it('should parse two paragraphs separated by a blank line', () => {
    const md = 'Para 1\n\nPara 2';
    const result = parseMarkdown(md);
    expect(result.content).toHaveLength(2);
    expect(result.content![0].type).toBe('paragraph');
    expect(result.content![0].content![0].text).toBe('Para 1');
    expect(result.content![1].type).toBe('paragraph');
    expect(result.content![1].content![0].text).toBe('Para 2');
  });

  it('should parse three paragraphs separated by blank lines', () => {
    const md = 'First\n\nSecond\n\nThird';
    const result = parseMarkdown(md);
    expect(result.content).toHaveLength(3);
    expect(result.content![0].content![0].text).toBe('First');
    expect(result.content![1].content![0].text).toBe('Second');
    expect(result.content![2].content![0].text).toBe('Third');
  });
});

describe('Table Round-Trip', () => {
  it('should parse a 3x3 table with headers and serialize back with pipe syntax', () => {
    const md = '| A | B | C |\n|---|---|---|\n| 1 | 2 | 3 |\n| 4 | 5 | 6 |';
    const result = parseMarkdown(md);
    const table = result.content![0];
    expect(table.type).toBe('table');
    // 1 header row + 2 body rows
    expect(table.content).toHaveLength(3);

    // Header row cells should be tableHeader
    const headerRow = table.content![0];
    expect(headerRow.content![0].type).toBe('tableHeader');
    expect(headerRow.content![1].type).toBe('tableHeader');
    expect(headerRow.content![2].type).toBe('tableHeader');

    // Body row cells should be tableCell
    const bodyRow = table.content![1];
    expect(bodyRow.content![0].type).toBe('tableCell');

    // Serialize and verify pipe syntax is preserved
    const serialized = serializeMarkdown(result);
    expect(serialized).toContain('|');
    expect(serialized).toContain('---');
    expect(serialized).toContain('A');
    expect(serialized).toContain('1');
    expect(serialized).toContain('6');
  });
});

describe('Image in Paragraph Context', () => {
  it('should parse image syntax and produce an image node', () => {
    const md = '![alt text](https://example.com/image.png)';
    const result = parseMarkdown(md);
    const paragraph = result.content![0];
    const imageNode = paragraph.content!.find((n) => n.type === 'image');
    expect(imageNode).toBeDefined();
    expect(imageNode!.attrs?.src).toBe('https://example.com/image.png');
    expect(imageNode!.attrs?.alt).toBe('alt text');
  });
});

describe('Hard Break', () => {
  it('should parse two trailing spaces as a hardBreak node', () => {
    const md = 'line1  \nline2';
    const result = parseMarkdown(md);
    const paragraph = result.content![0];
    expect(paragraph.content).toBeDefined();
    const hasHardBreak = paragraph.content!.some((n) => n.type === 'hardBreak');
    expect(hasHardBreak).toBe(true);
  });
});

describe('Serializer Edge Cases', () => {
  it('should serialize a doc containing only a horizontalRule', () => {
    const result = serializeMarkdown(doc({ type: 'horizontalRule' }));
    expect(result.trim()).toBe('---');
  });

  it('should serialize a nested bullet list (2 levels deep)', () => {
    const nestedList: JSONContent = {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            paragraph('Top'),
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [paragraph('Nested')],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = serializeMarkdown(doc(nestedList));
    expect(result).toContain('- Top');
    expect(result).toContain('  - Nested');
  });

  it('should serialize an ordered list starting at a custom number', () => {
    const orderedList: JSONContent = {
      type: 'orderedList',
      attrs: { start: 5 },
      content: [
        { type: 'listItem', content: [paragraph('Fifth')] },
        { type: 'listItem', content: [paragraph('Sixth')] },
        { type: 'listItem', content: [paragraph('Seventh')] },
      ],
    };
    const result = serializeMarkdown(doc(orderedList));
    expect(result).toContain('5. Fifth');
    expect(result).toContain('6. Sixth');
    expect(result).toContain('7. Seventh');
  });

  it('should serialize a hardBreak inline node as two trailing spaces plus newline', () => {
    const para: JSONContent = {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'line1' },
        { type: 'hardBreak' },
        { type: 'text', text: 'line2' },
      ],
    };
    const result = serializeMarkdown(doc(para));
    expect(result).toContain('line1  \nline2');
  });
});
