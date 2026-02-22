import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/markdown/parser';
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

function heading(level: number, text: string): JSONContent {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  };
}

describe('Frontmatter Parser', () => {
  it('should return frontmatter as a separate string', () => {
    const md = '---\ntitle: Hello\ntags: [a, b]\n---\n\n# Heading';
    const { doc: result, frontmatter } = parseMarkdown(md);

    expect(frontmatter).toBe('title: Hello\ntags: [a, b]');
    expect(result.type).toBe('doc');
    // Frontmatter should NOT be present as a codeBlock in doc
    const codeBlocks = result.content!.filter((n) => n.type === 'codeBlock');
    expect(codeBlocks).toHaveLength(0);
    // First node should be the heading
    expect(result.content![0].type).toBe('heading');
  });

  it('should return null frontmatter when none present', () => {
    const md = '# Just a heading\n\nSome content';
    const { doc: result, frontmatter } = parseMarkdown(md);

    expect(frontmatter).toBeNull();
    expect(result.content![0].type).toBe('heading');
  });

  it('should return null frontmatter for empty document', () => {
    const { frontmatter } = parseMarkdown('');
    expect(frontmatter).toBeNull();
  });

  it('should return null frontmatter for whitespace-only document', () => {
    const { frontmatter } = parseMarkdown('   \n  \n');
    expect(frontmatter).toBeNull();
  });

  it('should handle empty frontmatter (--- with no content between)', () => {
    // extractFrontmatter returns null for empty content between --- fences
    // because it requires at least one key: value line
    const md = '---\n---\n\n# Heading';
    const { frontmatter } = parseMarkdown(md);
    // Empty frontmatter doesn't have key: value so extractFrontmatter returns null
    expect(frontmatter).toBeNull();
  });

  it('should preserve complex YAML as raw string', () => {
    const yaml = 'title: "My Post"\ntags: [javascript, react]\ndate: 2024-01-15\nmeta:\n  author: John\n  draft: true';
    const md = `---\n${yaml}\n---\n\nContent`;
    const { frontmatter } = parseMarkdown(md);

    expect(frontmatter).toBe(yaml);
  });

  it('should not include frontmatter as any node in doc.content', () => {
    const md = '---\ntitle: Test\n---\n\nParagraph';
    const { doc: result } = parseMarkdown(md);

    // No codeBlock with yaml language should exist
    for (const node of result.content!) {
      if (node.type === 'codeBlock') {
        expect(node.attrs?.language).not.toBe('yaml');
      }
    }
  });
});

describe('Frontmatter Serializer', () => {
  it('should prepend frontmatter fences when frontmatter is provided', () => {
    const result = serializeMarkdown(
      doc(paragraph('Hello')),
      'title: Hello',
    );
    expect(result).toBe('---\ntitle: Hello\n---\n\nHello\n');
  });

  it('should not prepend anything when frontmatter is null', () => {
    const result = serializeMarkdown(doc(paragraph('Hello')), null);
    expect(result).toBe('Hello\n');
  });

  it('should not prepend anything when frontmatter is undefined', () => {
    const result = serializeMarkdown(doc(paragraph('Hello')), undefined);
    expect(result).toBe('Hello\n');
  });

  it('should not prepend anything when frontmatter is empty string', () => {
    // Empty string is falsy, so no frontmatter prefix
    const result = serializeMarkdown(doc(paragraph('Hello')), '');
    expect(result).toBe('Hello\n');
  });

  it('should handle multi-line frontmatter', () => {
    const fm = 'title: My Post\ntags: [a, b]\ndate: 2024-01-01';
    const result = serializeMarkdown(doc(paragraph('Content')), fm);
    expect(result.startsWith('---\ntitle: My Post\ntags: [a, b]\ndate: 2024-01-01\n---\n\n')).toBe(true);
    expect(result).toContain('Content');
  });

  it('should handle frontmatter with empty doc', () => {
    const result = serializeMarkdown(doc(), 'title: Empty');
    expect(result).toBe('---\ntitle: Empty\n---\n\n');
  });
});

describe('Frontmatter Round-Trip', () => {
  it('should preserve frontmatter fences through roundtrip', () => {
    const input = '---\ntitle: Hello\n---\n\n# Heading\n\nContent\n';
    const { doc, frontmatter } = parseMarkdown(input);
    const output = serializeMarkdown(doc, frontmatter);

    expect(output).toBe(input);
  });

  it('should preserve complex frontmatter through roundtrip', () => {
    const input = '---\ntitle: "My Post"\ntags: [javascript, react]\ndate: 2024-01-15\n---\n\n# Hello World\n\nSome paragraph text.\n';
    const { doc, frontmatter } = parseMarkdown(input);
    const output = serializeMarkdown(doc, frontmatter);

    expect(output).toBe(input);
  });

  it('should not add frontmatter fences when none existed', () => {
    const input = '# Just a heading\n\nSome content\n';
    const { doc, frontmatter } = parseMarkdown(input);
    const output = serializeMarkdown(doc, frontmatter);

    expect(output).not.toContain('---');
    expect(output).toBe(input);
  });

  it('should be idempotent on double roundtrip with frontmatter', () => {
    const input = '---\ntitle: Test\ntags: [a, b, c]\n---\n\n# Heading\n\n- Item 1\n- Item 2\n';
    const r1 = parseMarkdown(input);
    const first = serializeMarkdown(r1.doc, r1.frontmatter);
    const r2 = parseMarkdown(first);
    const second = serializeMarkdown(r2.doc, r2.frontmatter);

    expect(second).toBe(first);
  });

  it('should handle frontmatter-only document through roundtrip', () => {
    const input = '---\ntitle: Only Frontmatter\n---\n';
    const { doc, frontmatter } = parseMarkdown(input);
    const output = serializeMarkdown(doc, frontmatter);

    // Should preserve the frontmatter
    expect(output).toContain('---\ntitle: Only Frontmatter\n---');
  });

  it('should roundtrip document with frontmatter and multiple block types', () => {
    const input = [
      '---',
      'title: Full Document',
      'draft: true',
      '---',
      '',
      '# Main Heading',
      '',
      'A paragraph.',
      '',
      '- item 1',
      '- item 2',
      '',
      '```javascript',
      'const x = 1;',
      '```',
      '',
      '> A quote',
      '',
    ].join('\n');

    const { doc, frontmatter } = parseMarkdown(input);
    const output = serializeMarkdown(doc, frontmatter);

    expect(output).toContain('---\ntitle: Full Document\ndraft: true\n---');
    expect(output).toContain('# Main Heading');
    expect(output).toContain('A paragraph.');
    expect(output).toContain('- item 1');
    expect(output).toContain('```javascript');
    expect(output).toContain('> A quote');
  });
});
