import { describe, it, expect } from 'vitest';
import { serializeMarkdown } from '../src/markdown/serializer';
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

function heading(level: number, text: string): JSONContent {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  };
}

describe('Markdown Serializer', () => {
  it('should serialize empty doc', () => {
    expect(serializeMarkdown(doc())).toBe('');
  });

  it('should serialize paragraph', () => {
    const result = serializeMarkdown(doc(paragraph('Hello world')));
    expect(result).toBe('Hello world\n');
  });

  it('should serialize headings H1-H6', () => {
    for (let level = 1; level <= 6; level++) {
      const result = serializeMarkdown(doc(heading(level, `Heading ${level}`)));
      expect(result).toBe(`${'#'.repeat(level)} Heading ${level}\n`);
    }
  });

  it('should serialize bullet list', () => {
    const result = serializeMarkdown(
      doc({
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [paragraph('Item 1')] },
          { type: 'listItem', content: [paragraph('Item 2')] },
        ],
      })
    );
    expect(result).toBe('- Item 1\n- Item 2\n');
  });

  it('should serialize ordered list', () => {
    const result = serializeMarkdown(
      doc({
        type: 'orderedList',
        content: [
          { type: 'listItem', content: [paragraph('First')] },
          { type: 'listItem', content: [paragraph('Second')] },
        ],
      })
    );
    expect(result).toBe('1. First\n2. Second\n');
  });

  it('should serialize code block with language', () => {
    const result = serializeMarkdown(
      doc({
        type: 'codeBlock',
        attrs: { language: 'typescript' },
        content: [{ type: 'text', text: 'const x = 1;' }],
      })
    );
    expect(result).toBe('```typescript\nconst x = 1;\n```\n');
  });

  it('should serialize blockquote', () => {
    const result = serializeMarkdown(
      doc({
        type: 'blockquote',
        content: [paragraph('Quoted text')],
      })
    );
    expect(result).toBe('> Quoted text\n');
  });

  it('should serialize horizontal rule', () => {
    const result = serializeMarkdown(
      doc(paragraph('Before'), { type: 'horizontalRule' }, paragraph('After'))
    );
    expect(result).toContain('---');
  });

  it('should serialize bold text', () => {
    const result = serializeMarkdown(
      doc({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
        ],
      })
    );
    expect(result).toContain('**bold**');
  });

  it('should serialize italic text', () => {
    const result = serializeMarkdown(
      doc({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
        ],
      })
    );
    expect(result).toContain('*italic*');
  });

  it('should serialize strikethrough', () => {
    const result = serializeMarkdown(
      doc({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'struck', marks: [{ type: 'strike' }] },
        ],
      })
    );
    expect(result).toContain('~~struck~~');
  });

  it('should serialize inline code', () => {
    const result = serializeMarkdown(
      doc({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'code', marks: [{ type: 'code' }] },
        ],
      })
    );
    expect(result).toContain('`code`');
  });

  it('should serialize link', () => {
    const result = serializeMarkdown(
      doc({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'click',
            marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
          },
        ],
      })
    );
    expect(result).toContain('[click](https://example.com)');
  });

  it('should serialize highlight', () => {
    const result = serializeMarkdown(
      doc({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'highlighted', marks: [{ type: 'highlight' }] },
        ],
      })
    );
    expect(result).toContain('==highlighted==');
  });

  it('should serialize task list', () => {
    const result = serializeMarkdown(
      doc({
        type: 'taskList',
        content: [
          {
            type: 'taskItem',
            attrs: { checked: false },
            content: [paragraph('Todo')],
          },
          {
            type: 'taskItem',
            attrs: { checked: true },
            content: [paragraph('Done')],
          },
        ],
      })
    );
    expect(result).toContain('- [ ] Todo');
    expect(result).toContain('- [x] Done');
  });

  it('should serialize table', () => {
    const result = serializeMarkdown(
      doc({
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableHeader',
                content: [paragraph('A')],
              },
              {
                type: 'tableHeader',
                content: [paragraph('B')],
              },
            ],
          },
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableCell',
                content: [paragraph('1')],
              },
              {
                type: 'tableCell',
                content: [paragraph('2')],
              },
            ],
          },
        ],
      })
    );
    expect(result).toContain('| A');
    expect(result).toContain('| 1');
    expect(result).toContain('---');
  });

  it('should serialize image', () => {
    const result = serializeMarkdown(
      doc({
        type: 'paragraph',
        content: [
          { type: 'image', attrs: { src: 'img.png', alt: 'my image' } },
        ],
      })
    );
    expect(result).toContain('![my image](img.png)');
  });

  it('should ensure trailing newline', () => {
    const result = serializeMarkdown(doc(paragraph('text')));
    expect(result.endsWith('\n')).toBe(true);
  });
});
