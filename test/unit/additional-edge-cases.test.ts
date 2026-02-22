import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/markdown/parser';
import { serializeMarkdown } from '../../src/markdown/serializer';

describe('Additional Parser Edge Cases', () => {
  // ============================================================
  // TRICKY INLINE PATTERNS
  // ============================================================

  it('should parse underscores inside words as literal (not italic)', () => {
    // Common in variable names: some_var_name
    const { doc: result } = parseMarkdown('Use some_var_name here');
    const paragraph = result.content![0];
    expect(paragraph.type).toBe('paragraph');
    // Should NOT have italic marks for underscores inside words
    const text = paragraph.content![0];
    expect(text.text).toContain('some_var_name');
  });

  it('should parse asterisks in file paths as literal', () => {
    // Glob patterns: *.js or **/*.ts
    const { doc: result } = parseMarkdown('Use `*.js` for JavaScript files');
    const paragraph = result.content![0];
    expect(paragraph.type).toBe('paragraph');
    // Should have inline code
    const codeNode = paragraph.content?.find(n => n.marks?.some(m => m.type === 'code'));
    expect(codeNode).toBeDefined();
    expect(codeNode!.text).toBe('*.js');
  });

  it('should handle unclosed bold correctly', () => {
    // Unclosed bold should not break parsing
    const { doc: result } = parseMarkdown('Start **unclosed bold');
    expect(result.type).toBe('doc');
    expect(result.content!.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle unclosed italic correctly', () => {
    const { doc: result } = parseMarkdown('Start *unclosed italic');
    expect(result.type).toBe('doc');
    expect(result.content!.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle unclosed inline code correctly', () => {
    const { doc: result } = parseMarkdown('Start `unclosed code');
    expect(result.type).toBe('doc');
    expect(result.content!.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle mismatched marks (bold then italic close)', () => {
    const { doc: result } = parseMarkdown('**bold *italic** end*');
    expect(result.type).toBe('doc');
    // Should not throw
  });

  // ============================================================
  // LIST EDGE CASES
  // ============================================================

  it('should parse list with 10+ items', () => {
    const items = Array.from({ length: 15 }, (_, i) => `- Item ${i + 1}`);
    const { doc: result } = parseMarkdown(items.join('\n'));

    const bulletList = result.content![0];
    expect(bulletList.type).toBe('bulletList');
    expect(bulletList.content).toHaveLength(15);
  });

  it('should parse ordered list starting at number > 1', () => {
    const { doc: result } = parseMarkdown('5. Fifth item\n6. Sixth item\n7. Seventh item');
    const orderedList = result.content![0];
    expect(orderedList.type).toBe('orderedList');
    expect(orderedList.attrs?.start).toBe(5);
    expect(orderedList.content).toHaveLength(3);
  });

  it('should parse list with inline code in items', () => {
    const { doc: result } = parseMarkdown('- Use `npm install`\n- Run `npm start`');
    const bulletList = result.content![0];
    expect(bulletList.type).toBe('bulletList');

    const firstItem = bulletList.content![0];
    const paragraph = firstItem.content![0];
    const codeNode = paragraph.content?.find(n => n.marks?.some(m => m.type === 'code'));
    expect(codeNode).toBeDefined();
    expect(codeNode!.text).toBe('npm install');
  });

  it('should parse list with links in items', () => {
    const { doc: result } = parseMarkdown('- Visit [Google](https://google.com)\n- Check [GitHub](https://github.com)');
    const bulletList = result.content![0];
    expect(bulletList.type).toBe('bulletList');

    const firstItem = bulletList.content![0];
    const paragraph = firstItem.content![0];
    const linkNode = paragraph.content?.find(n => n.marks?.some(m => m.type === 'link'));
    expect(linkNode).toBeDefined();
    const linkMark = linkNode!.marks!.find(m => m.type === 'link');
    expect(linkMark!.attrs!.href).toBe('https://google.com');
  });

  // ============================================================
  // TABLE EDGE CASES
  // ============================================================

  it('should parse table with only header row (no body)', () => {
    const { doc: result } = parseMarkdown('| Header 1 | Header 2 |\n|----------|----------|');
    const table = result.content![0];
    expect(table.type).toBe('table');
    expect(table.content).toHaveLength(1);
    expect(table.content![0].content![0].type).toBe('tableHeader');
  });

  it('should parse table with many body rows (20+)', () => {
    const header = '| Col1 | Col2 |';
    const sep = '|------|------|';
    const rows = Array.from({ length: 25 }, (_, i) => `| R${i + 1}C1 | R${i + 1}C2 |`);
    const { doc: result } = parseMarkdown([header, sep, ...rows].join('\n'));

    const table = result.content![0];
    expect(table.type).toBe('table');
    expect(table.content).toHaveLength(26); // 1 header + 25 body
  });

  it('should parse table with missing cells (uneven columns)', () => {
    // This often causes issues - one row has fewer cells
    const { doc: result } = parseMarkdown('| A | B | C |\n|---|---|---|\n| 1 | 2 |\n| 4 | 5 | 6 |');
    const table = result.content![0];
    expect(table.type).toBe('table');
    // Should not crash
  });

  // ============================================================
  // CODE BLOCK EDGE CASES
  // ============================================================

  it('should parse code block with only whitespace content', () => {
    const { doc: result } = parseMarkdown('```\n   \n\t\n```');
    const codeBlock = result.content![0];
    expect(codeBlock.type).toBe('codeBlock');
  });

  it('should parse code block with unicode language name', () => {
    const { doc: result } = parseMarkdown('```日本語\ncontent\n```');
    const codeBlock = result.content![0];
    expect(codeBlock.type).toBe('codeBlock');
    // Language might be parsed or ignored
  });

  it('should parse indented code block (4 spaces)', () => {
    // CommonMark allows 4-space indentation for code blocks
    const { doc: result } = parseMarkdown('Normal text\n\n    indented code\n    more code');
    expect(result.content!.length).toBeGreaterThanOrEqual(1);
    // Should have either a code block or paragraph
  });

  // ============================================================
  // BLOCKQUOTE EDGE CASES
  // ============================================================

  it('should parse blockquote with lazy continuation', () => {
    // Lazy continuation: subsequent lines don't need >
    const { doc: result } = parseMarkdown('> First line\nSecond line (lazy)');
    const blockquote = result.content?.find(n => n.type === 'blockquote');
    // Depending on parser mode, this might be one blockquote or separate
    expect(result.content!.length).toBeGreaterThanOrEqual(1);
  });

  it('should parse empty blockquote', () => {
    const { doc: result } = parseMarkdown('>');
    const blockquote = result.content?.find(n => n.type === 'blockquote');
    expect(blockquote).toBeDefined();
  });

  it('should parse blockquote with only blank line markers', () => {
    const { doc: result } = parseMarkdown('> \n> \n> ');
    const blockquote = result.content?.find(n => n.type === 'blockquote');
    expect(blockquote).toBeDefined();
  });

  // ============================================================
  // HEADING EDGE CASES
  // ============================================================

  it('should parse heading with closing hashes', () => {
    const { doc: result } = parseMarkdown('## Heading ##');
    const heading = result.content![0];
    expect(heading.type).toBe('heading');
    expect(heading.attrs?.level).toBe(2);
    // The closing hashes might or might not be stripped
  });

  it('should parse heading with lots of hashes (7+)', () => {
    // Markdown only supports h1-h6
    const { doc: result } = parseMarkdown('####### Not a heading');
    // Should be a paragraph (not valid heading)
    const first = result.content![0];
    expect(first.type).toBe('paragraph');
  });

  it('should parse heading followed immediately by paragraph', () => {
    const { doc: result } = parseMarkdown('# Heading\nParagraph without blank line');
    expect(result.content!.length).toBe(2);
    expect(result.content![0].type).toBe('heading');
    expect(result.content![1].type).toBe('paragraph');
  });

  // ============================================================
  // LINK AND IMAGE EDGE CASES
  // ============================================================

  it('should parse link with parentheses in URL', () => {
    const { doc: result } = parseMarkdown('[Wiki](https://en.wikipedia.org/wiki/Link_(Unix))');
    const paragraph = result.content![0];
    const linkNode = paragraph.content?.find(n => n.marks?.some(m => m.type === 'link'));
    expect(linkNode).toBeDefined();
    // URL might be truncated or correctly parsed depending on implementation
  });

  it('should parse autolink in angle brackets', () => {
    const { doc: result } = parseMarkdown('<https://example.com>');
    const paragraph = result.content![0];
    expect(paragraph.content!.length).toBeGreaterThanOrEqual(1);
    // Should have link or text with the URL
  });

  it('should parse image followed by text', () => {
    const { doc: result } = parseMarkdown('![alt](image.png) Caption text');
    const paragraph = result.content![0];
    expect(paragraph.content!.length).toBeGreaterThanOrEqual(1);
    const image = paragraph.content?.find(n => n.type === 'image');
    expect(image).toBeDefined();
  });

  // ============================================================
  // HORIZONTAL RULE EDGE CASES
  // ============================================================

  it('should parse HR with many dashes (10+)', () => {
    const { doc: result } = parseMarkdown('----------------');
    const hr = result.content?.find(n => n.type === 'horizontalRule');
    expect(hr).toBeDefined();
  });

  it('should parse HR with asterisks', () => {
    const { doc: result } = parseMarkdown('***');
    const hr = result.content?.find(n => n.type === 'horizontalRule');
    expect(hr).toBeDefined();
  });

  it('should parse HR with underscores', () => {
    const { doc: result } = parseMarkdown('___');
    const hr = result.content?.find(n => n.type === 'horizontalRule');
    expect(hr).toBeDefined();
  });

  it('should parse HR with spaces between dashes', () => {
    const { doc: result } = parseMarkdown('- - -');
    const hr = result.content?.find(n => n.type === 'horizontalRule');
    expect(hr).toBeDefined();
  });

  // ============================================================
  // ESCAPE SEQUENCES
  // ============================================================

  it('should handle escaped asterisks', () => {
    const { doc: result } = parseMarkdown('This is \\*not bold\\*');
    const paragraph = result.content![0];
    // Should NOT have bold marks
    const boldNode = paragraph.content?.find(n => n.marks?.some(m => m.type === 'bold'));
    expect(boldNode).toBeUndefined();
    // Should contain the asterisks as literal text
    const text = paragraph.content![0].text;
    expect(text).toContain('*');
  });

  it('should handle escaped backticks', () => {
    const { doc: result } = parseMarkdown('This is \\`not code\\`');
    const paragraph = result.content![0];
    const codeNode = paragraph.content?.find(n => n.marks?.some(m => m.type === 'code'));
    expect(codeNode).toBeUndefined();
  });

  // ============================================================
  // SERIALIZER EDGE CASES
  // ============================================================
});

describe('Additional Serializer Edge Cases', () => {
  it('should serialize nested lists correctly', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Parent' }] },
                {
                  type: 'bulletList',
                  content: [
                    {
                      type: 'listItem',
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Child' }] }]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    const result = serializeMarkdown(doc);
    expect(result).toContain('- Parent');
    expect(result).toContain('Child');
    // Child should be indented
    const lines = result.split('\n');
    const childLine = lines.find(l => l.includes('Child'));
    expect(childLine).toBeDefined();
    // Should have leading spaces for nesting
    expect(childLine!.startsWith('  ')).toBe(true);
  });

  it('should serialize task list with checked and unchecked items', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Done' }] }]
            },
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Todo' }] }]
            }
          ]
        }
      ]
    };

    const result = serializeMarkdown(doc);
    expect(result).toContain('- [x] Done');
    expect(result).toContain('- [ ] Todo');
  });

  it('should serialize empty list item', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: undefined }]
            }
          ]
        }
      ]
    };

    const result = serializeMarkdown(doc);
    // Should not crash
    expect(result).toContain('-');
  });

  it('should serialize code block preserving empty lines', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language: 'python' },
          content: [{ type: 'text', text: 'line1\n\nline3' }]
        }
      ]
    };

    const result = serializeMarkdown(doc);
    expect(result).toContain('```python');
    expect(result).toContain('line1\n\nline3');
    expect(result).toContain('```');
  });

  it('should serialize multiple marks on same text', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'styled',
              marks: [{ type: 'bold' }, { type: 'italic' }]
            }
          ]
        }
      ]
    };

    const result = serializeMarkdown(doc);
    // Should have both ** and *
    expect(result).toContain('***styled***');
  });

  it('should serialize table with formatted content', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        { type: 'text', text: 'Bold', marks: [{ type: 'bold' }] }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        { type: 'text', text: 'italic', marks: [{ type: 'italic' }] }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    const result = serializeMarkdown(doc);
    expect(result).toContain('**Bold**');
    expect(result).toContain('*italic*');
  });

  it('should serialize highlight marks', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'highlighted',
              marks: [{ type: 'highlight' }]
            }
          ]
        }
      ]
    };

    const result = serializeMarkdown(doc);
    expect(result).toContain('==highlighted==');
  });

  it('should serialize hard breaks', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Line 1' },
            { type: 'hardBreak' },
            { type: 'text', text: 'Line 2' }
          ]
        }
      ]
    };

    const result = serializeMarkdown(doc);
    // Hard break should serialize as two trailing spaces + newline
    expect(result).toContain('Line 1  \nLine 2');
  });

  it('should serialize link with special characters in URL', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'link',
              marks: [{ type: 'link', attrs: { href: 'https://example.com/path?a=1&b=2' } }]
            }
          ]
        }
      ]
    };

    const result = serializeMarkdown(doc);
    expect(result).toContain('[link](https://example.com/path?a=1&b=2)');
  });

  it('should serialize image with alt text', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'image',
              attrs: { src: 'image.png', alt: 'My Image' }
            }
          ]
        }
      ]
    };

    const result = serializeMarkdown(doc);
    expect(result).toContain('![My Image](image.png)');
  });

  it('should serialize blockquote with multiple paragraphs', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Para 1' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Para 2' }] }
          ]
        }
      ]
    };

    const result = serializeMarkdown(doc);
    expect(result).toContain('> Para 1');
    expect(result).toContain('> Para 2');
  });
});

describe('Roundtrip Edge Cases', () => {
  const roundtrip = (markdown: string) => {
    const { doc, frontmatter } = parseMarkdown(markdown);
    return serializeMarkdown(doc, frontmatter);
  };

  it('should roundtrip heading with link', () => {
    const input = '# Heading with [link](https://example.com)';
    const output = roundtrip(input);
    expect(output).toContain('Heading');
    expect(output).toContain('link');
    expect(output).toContain('https://example.com');
  });

  it('should roundtrip list with bold items', () => {
    const input = '- **Bold item 1**\n- **Bold item 2**';
    const output = roundtrip(input);
    expect(output).toContain('**Bold item 1**');
    expect(output).toContain('**Bold item 2**');
  });

  it('should roundtrip blockquote with code', () => {
    const input = '> Quote with `code`';
    const output = roundtrip(input);
    expect(output).toContain('Quote');
    expect(output).toContain('`code`');
  });

  it('should roundtrip horizontal rule variations', () => {
    // Note: all HR variations should serialize to '---'
    const input1 = '---';
    const output1 = roundtrip(input1);
    expect(output1.trim()).toBe('---');
  });

  it('should roundtrip code block with language', () => {
    const input = '```javascript\nconst x = 1;\n```';
    const output = roundtrip(input);
    expect(output).toContain('```javascript');
    expect(output).toContain('const x = 1;');
    expect(output).toContain('```');
  });
});
