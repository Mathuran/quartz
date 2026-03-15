import { describe, it, expect } from 'vitest';
import { serializeMarkdown } from '../../src/markdown/serializer';
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

describe('Serializer Edge Cases', () => {
  it('should serialize doc with 0 content nodes as empty string', () => {
    const result = serializeMarkdown({ type: 'doc', content: [] });
    expect(result).toBe('');
  });

  it('should serialize table with empty cells', () => {
    const table: JSONContent = {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'H1' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'H2' }] }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph' }] },
            { type: 'tableCell', content: [{ type: 'paragraph' }] },
          ],
        },
      ],
    };
    const result = serializeMarkdown(doc(table));
    expect(result).toContain('| H1');
    expect(result).toContain('| H2');
    expect(result).toContain('---');
  });

  it('should serialize table where header has fewer cells than body rows', () => {
    const table: JSONContent = {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'H1' }] }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] },
          ],
        },
      ],
    };
    const result = serializeMarkdown(doc(table));
    expect(result).toContain('H1');
    expect(result).toContain('A');
    expect(result).toContain('B');
  });

  it('should serialize ordered list starting at 0 (preserves start: 0)', () => {
    const orderedList: JSONContent = {
      type: 'orderedList',
      attrs: { start: 0 },
      content: [
        { type: 'listItem', content: [paragraph('First')] },
        { type: 'listItem', content: [paragraph('Second')] },
      ],
    };
    const result = serializeMarkdown(doc(orderedList));
    // Uses `?? 1` so start: 0 is preserved as 0
    expect(result).toContain('0. First');
    expect(result).toContain('1. Second');
  });

  it('should serialize ordered list starting at 999', () => {
    const orderedList: JSONContent = {
      type: 'orderedList',
      attrs: { start: 999 },
      content: [
        { type: 'listItem', content: [paragraph('Alpha')] },
        { type: 'listItem', content: [paragraph('Beta')] },
        { type: 'listItem', content: [paragraph('Gamma')] },
      ],
    };
    const result = serializeMarkdown(doc(orderedList));
    expect(result).toContain('999. Alpha');
    expect(result).toContain('1000. Beta');
    expect(result).toContain('1001. Gamma');
  });

  it('should serialize task list with mixed checked/unchecked items', () => {
    const taskList: JSONContent = {
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: true }, content: [paragraph('Done task')] },
        { type: 'taskItem', attrs: { checked: false }, content: [paragraph('Pending task')] },
        { type: 'taskItem', attrs: { checked: true }, content: [paragraph('Another done')] },
      ],
    };
    const result = serializeMarkdown(doc(taskList));
    expect(result).toContain('- [x] Done task');
    expect(result).toContain('- [ ] Pending task');
    expect(result).toContain('- [x] Another done');
  });

  it('should serialize paragraph with adjacent bold and italic marks without space', () => {
    const para: JSONContent = {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
        { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
      ],
    };
    const result = serializeMarkdown(doc(para));
    expect(result).toContain('**bold**');
    expect(result).toContain('*italic*');
    expect(result).toContain('**bold***italic*');
  });

  it('should serialize link containing bold text', () => {
    const para: JSONContent = {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'click here',
          marks: [
            { type: 'link', attrs: { href: 'https://example.com' } },
            { type: 'bold' },
          ],
        },
      ],
    };
    const result = serializeMarkdown(doc(para));
    expect(result).toContain('[**click here**](https://example.com)');
  });

  it('should serialize image with special characters in URL', () => {
    const image: JSONContent = {
      type: 'image',
      attrs: { src: 'https://example.com/my image.png', alt: 'photo' },
    };
    const result = serializeMarkdown(doc(image));
    expect(result).toContain('![photo](https://example.com/my image.png)');
  });

  it('should serialize details/toggle block', () => {
    const details: JSONContent = {
      type: 'details',
      content: [
        {
          type: 'detailsSummary',
          content: [{ type: 'text', text: 'Summary' }],
        },
        {
          type: 'detailsContent',
          content: [paragraph('Body')],
        },
      ],
    };
    const result = serializeMarkdown(doc(details));
    expect(result).toContain('<details>');
    expect(result).toContain('<summary>Summary</summary>');
    expect(result).toContain('Body');
    expect(result).toContain('</details>');
  });

  it('should serialize deeply nested blockquotes (3 levels)', () => {
    const deepBlockquote: JSONContent = {
      type: 'blockquote',
      content: [
        {
          type: 'blockquote',
          content: [
            {
              type: 'blockquote',
              content: [paragraph('deep text')],
            },
          ],
        },
      ],
    };
    const result = serializeMarkdown(doc(deepBlockquote));
    expect(result).toContain('> > > deep text');
  });

  it('should serialize list item containing a blockquote', () => {
    const listWithQuote: JSONContent = {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            paragraph('item text'),
            {
              type: 'blockquote',
              content: [paragraph('quoted inside list')],
            },
          ],
        },
      ],
    };
    const result = serializeMarkdown(doc(listWithQuote));
    expect(result).toContain('- item text');
  });

  it('should serialize list item containing a code block', () => {
    const listWithCode: JSONContent = {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            paragraph('before code'),
            {
              type: 'codeBlock',
              attrs: { language: 'js' },
              content: [{ type: 'text', text: 'const x = 1;' }],
            },
          ],
        },
      ],
    };
    const result = serializeMarkdown(doc(listWithCode));
    expect(result).toContain('- before code');
  });

  it('should serialize doc with every node type in sequence', () => {
    const allNodes = doc(
      paragraph('A paragraph'),
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'A heading' }],
      },
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [paragraph('bullet item')] },
        ],
      },
      {
        type: 'orderedList',
        attrs: { start: 1 },
        content: [
          { type: 'listItem', content: [paragraph('ordered item')] },
        ],
      },
      {
        type: 'codeBlock',
        attrs: { language: 'ts' },
        content: [{ type: 'text', text: 'let y = 2;' }],
      },
      {
        type: 'blockquote',
        content: [paragraph('quoted text')],
      },
      { type: 'horizontalRule' },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Col' }] }] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Val' }] }] },
            ],
          },
        ],
      },
      {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: false }, content: [paragraph('task')] },
        ],
      },
    );
    const result = serializeMarkdown(allNodes);
    expect(result).toContain('A paragraph');
    expect(result).toContain('## A heading');
    expect(result).toContain('- bullet item');
    expect(result).toContain('1. ordered item');
    expect(result).toContain('```ts');
    expect(result).toContain('let y = 2;');
    expect(result).toContain('> quoted text');
    expect(result).toContain('---');
    expect(result).toContain('| Col');
    expect(result).toContain('| Val');
    expect(result).toContain('- [ ] task');
  });

  it('should serialize hardBreak at end of paragraph', () => {
    const para: JSONContent = {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'line1' },
        { type: 'hardBreak' },
      ],
    };
    const result = serializeMarkdown(doc(para));
    expect(result).toContain('line1  \n');
  });
});
