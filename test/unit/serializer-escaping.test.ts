import { describe, it, expect } from 'vitest';
import { serializeMarkdown } from '../../src/markdown/serializer';
import { parseMarkdown } from '../../src/markdown/parser';
import type { JSONContent } from '@tiptap/core';

// ─── Helpers ────────────────────────────────────────────────────────────────

function doc(...content: JSONContent[]): JSONContent {
  return { type: 'doc', content };
}

function paragraph(...content: JSONContent[]): JSONContent {
  return { type: 'paragraph', content };
}

function text(t: string, marks?: JSONContent['marks']): JSONContent {
  return marks ? { type: 'text', text: t, marks } : { type: 'text', text: t };
}

function roundTrip(md: string): string {
  const { doc: parsed, frontmatter } = parseMarkdown(md);
  return serializeMarkdown(parsed, frontmatter);
}

// ─── Markdown Escaping (unit tests) ────────────────────────────────────────

describe('Serializer — Markdown Escaping', () => {
  it('should escape asterisks in plain text', () => {
    const result = serializeMarkdown(doc(paragraph(text('*asterisks*'))));
    expect(result).toContain('\\*asterisks\\*');
    expect(result).not.toContain('**');
  });

  it('should escape underscores in plain text', () => {
    const result = serializeMarkdown(doc(paragraph(text('_underscores_'))));
    expect(result).toContain('\\_underscores\\_');
  });

  it('should escape backticks in plain text', () => {
    const result = serializeMarkdown(doc(paragraph(text('use `code` here'))));
    expect(result).toContain('\\`code\\`');
  });

  it('should escape tildes in plain text', () => {
    const result = serializeMarkdown(doc(paragraph(text('~~struck~~'))));
    expect(result).toContain('\\~\\~struck\\~\\~');
  });

  it('should escape brackets in plain text', () => {
    const result = serializeMarkdown(doc(paragraph(text('[link](url)'))));
    expect(result).toContain('\\[link\\]');
  });

  it('should escape pipes in plain text', () => {
    const result = serializeMarkdown(doc(paragraph(text('a | b | c'))));
    expect(result).toContain('\\|');
  });

  it('should escape backslashes in plain text', () => {
    const result = serializeMarkdown(doc(paragraph(text('back\\slash'))));
    expect(result).toContain('back\\\\slash');
  });

  it('should NOT escape text inside a code mark', () => {
    const result = serializeMarkdown(
      doc(paragraph(text('*not escaped*', [{ type: 'code' }])))
    );
    // Code mark wraps with backticks, inner text is not escaped
    expect(result).toContain('`*not escaped*`');
  });

  it('should escape inner text of bold mark but not the delimiters', () => {
    // Bold mark wrapping text that itself contains asterisks
    const result = serializeMarkdown(
      doc(paragraph(text('hello*world', [{ type: 'bold' }])))
    );
    expect(result).toContain('**hello\\*world**');
  });
});

// ─── Inline Code with Backtick ─────────────────────────────────────────────

describe('Serializer — Inline Code with Backtick', () => {
  it('should use double backticks when content contains single backtick', () => {
    const result = serializeMarkdown(
      doc(paragraph(text('code with ` inside', [{ type: 'code' }])))
    );
    expect(result).toContain('`` code with ` inside ``');
  });

  it('should use single backticks when content has no backtick', () => {
    const result = serializeMarkdown(
      doc(paragraph(text('normal code', [{ type: 'code' }])))
    );
    expect(result).toContain('`normal code`');
    expect(result).not.toContain('``');
  });
});

// ─── Link/Image Escaping ───────────────────────────────────────────────────

describe('Serializer — Link and Image Escaping', () => {
  it('should escape ) in link href', () => {
    const result = serializeMarkdown(
      doc(
        paragraph(
          text('click', [
            { type: 'link', attrs: { href: 'https://en.wikipedia.org/wiki/Page_(disambiguation)' } },
          ])
        )
      )
    );
    // Only `)` is escaped to %29; `(` does not break markdown link syntax
    expect(result).toContain('(https://en.wikipedia.org/wiki/Page_(disambiguation%29)');
  });

  it('should escape ] in link text', () => {
    const result = serializeMarkdown(
      doc(
        paragraph(
          text('text with ] bracket', [
            { type: 'link', attrs: { href: 'https://example.com' } },
          ])
        )
      )
    );
    // `]` is escaped by escapeMarkdown (which runs before applyMark)
    expect(result).toContain('[text with \\] bracket](https://example.com)');
  });

  it('should escape ] in image alt text (block-level image)', () => {
    const result = serializeMarkdown(
      doc({
        type: 'image',
        attrs: { src: 'img.png', alt: 'alt with ] bracket' },
      })
    );
    expect(result).toContain('![alt with \\] bracket]');
  });

  it('should escape ) in image src (block-level image)', () => {
    const result = serializeMarkdown(
      doc({
        type: 'image',
        attrs: { src: 'https://example.com/img_(1).png', alt: 'photo' },
      })
    );
    // Only `)` is escaped to %29
    expect(result).toContain('(https://example.com/img_(1%29.png)');
  });

  it('should escape ] in inline image alt text', () => {
    const result = serializeMarkdown(
      doc(
        paragraph({
          type: 'image',
          attrs: { src: 'img.png', alt: 'alt]text' },
        })
      )
    );
    expect(result).toContain('![alt\\]text]');
  });

  it('should escape ) in inline image src', () => {
    const result = serializeMarkdown(
      doc(
        paragraph({
          type: 'image',
          attrs: { src: 'path/to/img).png', alt: 'photo' },
        })
      )
    );
    expect(result).toContain('(path/to/img%29.png)');
  });
});

// ─── Ordered List start: 0 ─────────────────────────────────────────────────

describe('Serializer — Ordered List start', () => {
  it('should preserve start: 0', () => {
    const result = serializeMarkdown(
      doc({
        type: 'orderedList',
        attrs: { start: 0 },
        content: [
          { type: 'listItem', content: [paragraph(text('First'))] },
          { type: 'listItem', content: [paragraph(text('Second'))] },
        ],
      })
    );
    expect(result).toContain('0. First');
    expect(result).toContain('1. Second');
  });

  it('should preserve start: 5', () => {
    const result = serializeMarkdown(
      doc({
        type: 'orderedList',
        attrs: { start: 5 },
        content: [
          { type: 'listItem', content: [paragraph(text('A'))] },
          { type: 'listItem', content: [paragraph(text('B'))] },
        ],
      })
    );
    expect(result).toContain('5. A');
    expect(result).toContain('6. B');
  });
});

// ─── Heading Clamping ──────────────────────────────────────────────────────

describe('Serializer — Heading Level Clamping', () => {
  it('should clamp level 0 to 1', () => {
    const result = serializeMarkdown(
      doc({
        type: 'heading',
        attrs: { level: 0 },
        content: [text('Zero')],
      })
    );
    expect(result).toContain('# Zero');
    // Ensure it's exactly one #
    expect(result).toMatch(/^# Zero/);
  });

  it('should clamp level 7 to 6', () => {
    const result = serializeMarkdown(
      doc({
        type: 'heading',
        attrs: { level: 7 },
        content: [text('Seven')],
      })
    );
    expect(result).toContain('###### Seven');
    // Ensure it's exactly six #
    expect(result).toMatch(/^#{6} Seven/);
  });

  it('should keep level 3 as-is', () => {
    const result = serializeMarkdown(
      doc({
        type: 'heading',
        attrs: { level: 3 },
        content: [text('Three')],
      })
    );
    expect(result).toContain('### Three');
  });
});

// ─── Nested List Indentation ───────────────────────────────────────────────

describe('Serializer — Nested List Indentation', () => {
  it('should indent nested bullet list inside bullet list by 2 spaces', () => {
    const result = serializeMarkdown(
      doc({
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              paragraph(text('parent')),
              {
                type: 'bulletList',
                content: [
                  { type: 'listItem', content: [paragraph(text('child'))] },
                ],
              },
            ],
          },
        ],
      })
    );
    const lines = result.split('\n');
    const childLine = lines.find((l) => l.includes('child'));
    expect(childLine).toBeDefined();
    // Nested under bullet: 2-space indent
    expect(childLine).toMatch(/^  - child/);
  });

  it('should indent nested bullet list inside ordered list by 3 spaces', () => {
    const result = serializeMarkdown(
      doc({
        type: 'orderedList',
        attrs: { start: 1 },
        content: [
          {
            type: 'listItem',
            content: [
              paragraph(text('parent')),
              {
                type: 'bulletList',
                content: [
                  { type: 'listItem', content: [paragraph(text('child'))] },
                ],
              },
            ],
          },
        ],
      })
    );
    const lines = result.split('\n');
    const childLine = lines.find((l) => l.includes('child'));
    expect(childLine).toBeDefined();
    // Nested under ordered (1. ): 3-space indent
    expect(childLine).toMatch(/^   - child/);
  });

  it('should indent nested list inside 2-digit ordered list by 4 spaces', () => {
    const result = serializeMarkdown(
      doc({
        type: 'orderedList',
        attrs: { start: 10 },
        content: [
          {
            type: 'listItem',
            content: [
              paragraph(text('parent')),
              {
                type: 'bulletList',
                content: [
                  { type: 'listItem', content: [paragraph(text('child'))] },
                ],
              },
            ],
          },
        ],
      })
    );
    const lines = result.split('\n');
    const childLine = lines.find((l) => l.includes('child'));
    expect(childLine).toBeDefined();
    // Nested under ordered (10. ): 4-space indent
    expect(childLine).toMatch(/^    - child/);
  });

  it('should indent nested task list inside task list by 2 spaces', () => {
    const result = serializeMarkdown(
      doc({
        type: 'taskList',
        content: [
          {
            type: 'taskItem',
            attrs: { checked: false },
            content: [
              paragraph(text('parent task')),
              {
                type: 'taskList',
                content: [
                  {
                    type: 'taskItem',
                    attrs: { checked: true },
                    content: [paragraph(text('child task'))],
                  },
                ],
              },
            ],
          },
        ],
      })
    );
    const lines = result.split('\n');
    const childLine = lines.find((l) => l.includes('child task'));
    expect(childLine).toBeDefined();
    // markdown-it treats `- ` as the marker (width 2) for task items,
    // so nested items need 2-space indent for proper roundtrip
    expect(childLine).toMatch(/^  - \[x\] child task/);
  });
});

// ─── List Item Fallback for Non-List/Non-Paragraph Children ────────────────

describe('Serializer — List Item Block Children', () => {
  it('should serialize a blockquote inside a list item', () => {
    const result = serializeMarkdown(
      doc({
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              paragraph(text('item text')),
              {
                type: 'blockquote',
                content: [paragraph(text('quoted inside list'))],
              },
            ],
          },
        ],
      })
    );
    expect(result).toContain('- item text');
    expect(result).toContain('> quoted inside list');
  });

  it('should serialize a code block inside a list item', () => {
    const result = serializeMarkdown(
      doc({
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              paragraph(text('before code')),
              {
                type: 'codeBlock',
                attrs: { language: 'js' },
                content: [text('const x = 1;')],
              },
            ],
          },
        ],
      })
    );
    expect(result).toContain('- before code');
    expect(result).toContain('```js');
    expect(result).toContain('const x = 1;');
  });
});

// ─── Table Alignment ───────────────────────────────────────────────────────

describe('Serializer — Table Alignment', () => {
  it('should produce center-aligned separator', () => {
    const result = serializeMarkdown(
      doc({
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableHeader',
                attrs: { textAlign: 'center' },
                content: [paragraph(text('Centered'))],
              },
            ],
          },
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableCell',
                content: [paragraph(text('data'))],
              },
            ],
          },
        ],
      })
    );
    // Separator should contain `:---:` pattern
    const lines = result.split('\n');
    const sepLine = lines.find((l) => l.includes('---'));
    expect(sepLine).toBeDefined();
    expect(sepLine).toMatch(/:[-]+:/);
  });

  it('should produce left-aligned separator', () => {
    const result = serializeMarkdown(
      doc({
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableHeader',
                attrs: { textAlign: 'left' },
                content: [paragraph(text('Left'))],
              },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [paragraph(text('data'))] },
            ],
          },
        ],
      })
    );
    const lines = result.split('\n');
    const sepLine = lines.find((l) => l.includes('---'));
    expect(sepLine).toBeDefined();
    expect(sepLine).toMatch(/:[-]+[^:]/);
  });

  it('should produce right-aligned separator', () => {
    const result = serializeMarkdown(
      doc({
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableHeader',
                attrs: { textAlign: 'right' },
                content: [paragraph(text('Right'))],
              },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [paragraph(text('data'))] },
            ],
          },
        ],
      })
    );
    const lines = result.split('\n');
    const sepLine = lines.find((l) => l.includes('---'));
    expect(sepLine).toBeDefined();
    expect(sepLine).toMatch(/[-]+:/);
  });
});

// ─── Table Empty Rows ──────────────────────────────────────────────────────

describe('Serializer — Table Empty Body Rows', () => {
  it('should produce proper empty-cell rows with pipe delimiters', () => {
    const result = serializeMarkdown(
      doc({
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableHeader',
                content: [paragraph(text('A'))],
              },
              {
                type: 'tableHeader',
                content: [paragraph(text('B'))],
              },
            ],
          },
          {
            type: 'tableRow',
            content: [], // empty row
          },
        ],
      })
    );
    const lines = result.split('\n');
    // Should have 3 lines: header, separator, empty body row
    expect(lines.length).toBeGreaterThanOrEqual(3);
    const bodyLine = lines[2];
    // Should have pipe delimiters matching 2 columns
    expect(bodyLine).toMatch(/^\|.*\|.*\|$/);
  });
});

// ─── Roundtrip Tests ───────────────────────────────────────────────────────

describe('Roundtrip — Escaping Scenarios', () => {
  it('should roundtrip text with backslash-escaped asterisks', () => {
    const md = 'text with \\*literal asterisks\\*\n';
    const result = roundTrip(md);
    expect(result).toContain('\\*literal asterisks\\*');
  });

  it('should roundtrip inline code with backtick', () => {
    const md = 'use `` code with ` inside `` here\n';
    const result = roundTrip(md);
    expect(result).toContain('code with ` inside');
  });

  it('should roundtrip link with parentheses in URL', () => {
    const md = '[click](https://en.wikipedia.org/wiki/Page_%28disambiguation%29)\n';
    const result = roundTrip(md);
    expect(result).toContain('click');
    expect(result).toContain('Page_%28disambiguation%29');
  });

  it('should roundtrip nested lists inside ordered lists', () => {
    const md = '1. parent\n   - child\n';
    const result = roundTrip(md);
    expect(result).toContain('1. parent');
    expect(result).toContain('- child');
  });

  it('should be idempotent on double roundtrip for escaped text', () => {
    const md = 'text with \\*stars\\* and \\[brackets\\]\n';
    const first = roundTrip(md);
    const second = roundTrip(first);
    expect(second).toBe(first);
  });
});
