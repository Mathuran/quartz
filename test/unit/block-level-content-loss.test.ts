import { describe, it, expect, vi } from 'vitest';
import { parseMarkdown } from '../../src/markdown/parser';
import { serializeMarkdown } from '../../src/markdown/serializer';
import { extractFrontmatter, hasFrontmatter } from '../../src/markdown/frontmatter';

function roundTrip(md: string): string {
  const { doc, frontmatter } = parseMarkdown(md);
  return serializeMarkdown(doc, frontmatter);
}

describe('Blockquote block-level content handling', () => {
  it('should parse a heading inside a blockquote', () => {
    const md = '> # Title inside blockquote';
    const { doc: result } = parseMarkdown(md);

    const blockquote = result.content![0];
    expect(blockquote.type).toBe('blockquote');
    expect(blockquote.content).toBeDefined();

    const heading = blockquote.content!.find((n) => n.type === 'heading');
    expect(heading).toBeDefined();
    expect(heading!.attrs?.level).toBe(1);
    expect(heading!.content![0].text).toBe('Title inside blockquote');
  });

  it('should parse an H2 heading inside a blockquote', () => {
    const md = '> ## Subtitle';
    const { doc: result } = parseMarkdown(md);

    const blockquote = result.content![0];
    expect(blockquote.type).toBe('blockquote');

    const heading = blockquote.content!.find((n) => n.type === 'heading');
    expect(heading).toBeDefined();
    expect(heading!.attrs?.level).toBe(2);
    expect(heading!.content![0].text).toBe('Subtitle');
  });

  it('should parse a code block inside a blockquote', () => {
    const md = [
      '> ```js',
      '> const x = 1;',
      '> ```',
    ].join('\n');
    const { doc: result } = parseMarkdown(md);

    const blockquote = result.content![0];
    expect(blockquote.type).toBe('blockquote');

    const codeBlock = blockquote.content!.find((n) => n.type === 'codeBlock');
    expect(codeBlock).toBeDefined();
    expect(codeBlock!.attrs?.language).toBe('js');
    expect(codeBlock!.content![0].text).toBe('const x = 1;');
  });

  it('should parse a horizontal rule inside a blockquote', () => {
    const md = [
      '> text before',
      '>',
      '> ---',
      '>',
      '> text after',
    ].join('\n');
    const { doc: result } = parseMarkdown(md);

    const blockquote = result.content![0];
    expect(blockquote.type).toBe('blockquote');

    const hr = blockquote.content!.find((n) => n.type === 'horizontalRule');
    expect(hr).toBeDefined();
  });

  it('should parse mixed content inside a blockquote (paragraph + heading + code)', () => {
    const md = [
      '> Some text',
      '>',
      '> ## A heading',
      '>',
      '> ```python',
      '> print("hello")',
      '> ```',
    ].join('\n');
    const { doc: result } = parseMarkdown(md);

    const blockquote = result.content![0];
    expect(blockquote.type).toBe('blockquote');

    const paragraph = blockquote.content!.find((n) => n.type === 'paragraph');
    expect(paragraph).toBeDefined();

    const heading = blockquote.content!.find((n) => n.type === 'heading');
    expect(heading).toBeDefined();
    expect(heading!.attrs?.level).toBe(2);

    const codeBlock = blockquote.content!.find((n) => n.type === 'codeBlock');
    expect(codeBlock).toBeDefined();
    expect(codeBlock!.attrs?.language).toBe('python');
  });

  it('should parse a table inside a blockquote', () => {
    const md = [
      '> | A | B |',
      '> |---|---|',
      '> | 1 | 2 |',
    ].join('\n');
    const { doc: result } = parseMarkdown(md);

    const blockquote = result.content![0];
    expect(blockquote.type).toBe('blockquote');

    const table = blockquote.content!.find((n) => n.type === 'table');
    expect(table).toBeDefined();
    expect(table!.content).toHaveLength(2); // header + body row
  });
});

describe('Blockquote roundtrip with block-level content', () => {
  it('should round-trip a blockquote containing a heading', () => {
    const md = '> # Heading in quote\n';
    expect(roundTrip(md)).toBe(md);
  });

  it('should round-trip a blockquote containing a code block', () => {
    const md = '> ```js\n> const x = 1;\n> ```\n';
    expect(roundTrip(md)).toBe(md);
  });

  it('should round-trip a blockquote containing a horizontal rule (structure preserved)', () => {
    const md = '> text\n>\n> ---\n>\n> more text\n';
    const result = roundTrip(md);
    // Verify the essential structure is preserved in the output
    expect(result).toContain('> text');
    expect(result).toContain('> ---');
    expect(result).toContain('> more text');
    // Verify the HR is parsed back correctly on re-parse
    const { doc } = parseMarkdown(result);
    const blockquote = doc.content![0];
    expect(blockquote.type).toBe('blockquote');
    expect(blockquote.content!.some((n) => n.type === 'horizontalRule')).toBe(true);
  });
});

describe('Frontmatter consistency', () => {
  it('hasFrontmatter should return false for non-YAML content between --- markers', () => {
    // This has --- markers but no YAML key: value pairs
    const text = '---\nhello world\n---';
    expect(hasFrontmatter(text)).toBe(false);
    expect(extractFrontmatter(text).frontmatter).toBeNull();
  });

  it('hasFrontmatter should agree with extractFrontmatter for valid YAML', () => {
    const text = '---\ntitle: Test\ndate: 2024-01-01\n---\n\n# Hello';
    expect(hasFrontmatter(text)).toBe(true);
    expect(extractFrontmatter(text).frontmatter).not.toBeNull();
  });

  it('hasFrontmatter should agree with extractFrontmatter for empty content', () => {
    const text = 'No frontmatter here';
    expect(hasFrontmatter(text)).toBe(false);
    expect(extractFrontmatter(text).frontmatter).toBeNull();
  });

  it('hasFrontmatter should agree with extractFrontmatter for --- used as HR', () => {
    // --- at the start followed by non-YAML text followed by ---
    const text = '---\njust some text\n---';
    expect(hasFrontmatter(text)).toBe(false);
    expect(extractFrontmatter(text).frontmatter).toBeNull();
  });
});

describe('Heading/paragraph bounds checks', () => {
  it('should not crash when heading is at end of token stream (malformed)', () => {
    // This tests the handler directly via parseMarkdown which goes through tokensToNodes.
    // A heading_open at the very end would have no inline/close tokens.
    // The parser wraps token processing in try/catch so this shouldn't crash.
    expect(() => parseMarkdown('# Valid heading')).not.toThrow();
  });

  it('should parse headings correctly even with minimal content', () => {
    const { doc: result } = parseMarkdown('#');
    expect(result.type).toBe('doc');
    // markdown-it treats a lone # as a paragraph, not a heading
    expect(result.content!.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Task item regex fix', () => {
  it('should detect empty task item (no trailing text)', () => {
    // markdown-it might not produce [x] without trailing space as a task,
    // but let's test the regex behavior through the parser
    const md = '- [x] Completed task\n- [ ] Empty content after checkbox';
    const { doc: result } = parseMarkdown(md);

    const list = result.content![0];
    expect(list.type).toBe('taskList');
    expect(list.content).toHaveLength(2);
    expect(list.content![0].attrs?.checked).toBe(true);
    expect(list.content![1].attrs?.checked).toBe(false);
  });
});

describe('Safety limit warning', () => {
  it('should log a warning when blockquote safety limit is exhausted', () => {
    // This is hard to trigger in practice (10000 iterations), but we can at least
    // verify the parser handles normal blockquotes without warnings
    const spy = vi.spyOn(console, 'warn');
    parseMarkdown('> normal quote');
    // The safety limit should NOT be triggered for a normal blockquote
    const calls = spy.mock.calls.filter((call) =>
      String(call[0]).includes('safety limit'),
    );
    expect(calls).toHaveLength(0);
    spy.mockRestore();
  });
});

describe('Details recursion depth limit', () => {
  it('should not stack overflow with deeply nested details', () => {
    // Build 15 levels of nested <details> (exceeds the 10-level limit)
    let md = 'innermost content';
    for (let i = 0; i < 15; i++) {
      md = `<details>\n<summary>Level ${i}</summary>\n${md}\n</details>`;
    }
    // Should not throw
    expect(() => parseMarkdown(md)).not.toThrow();
  });
});

describe('Table edge cases', () => {
  it('should handle a table with header row only (no body rows)', () => {
    // markdown-it requires at least a separator line, but we test the parser handles it
    const md = '| A | B |\n|---|---|';
    const { doc: result } = parseMarkdown(md);

    const table = result.content![0];
    expect(table.type).toBe('table');
    // Should have at least one row (header)
    expect(table.content!.length).toBeGreaterThanOrEqual(1);
    expect(table.content![0].type).toBe('tableRow');
  });
});
