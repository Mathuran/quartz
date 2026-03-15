import { describe, it, expect } from 'vitest';
import { serializeMarkdown } from '../../src/markdown/serializer';
import { parseMarkdown } from '../../src/markdown/parser';
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
  const { doc, frontmatter } = parseMarkdown(md);
  return serializeMarkdown(doc, frontmatter);
}

describe('Serializer Minor Fixes', () => {
  describe('Details serializer', () => {
    it('should serialize details with children in unexpected order (content before summary)', () => {
      const details: JSONContent = {
        type: 'details',
        content: [
          {
            type: 'detailsContent',
            content: [paragraph('Body text')],
          },
          {
            type: 'detailsSummary',
            content: [{ type: 'text', text: 'Summary text' }],
          },
        ],
      };
      const result = serializeMarkdown(doc(details));
      expect(result).toContain('<summary>Summary text</summary>');
      expect(result).toContain('Body text');
      expect(result).toContain('<details>');
      expect(result).toContain('</details>');
    });

    it('should serialize details with no body as clean HTML', () => {
      const details: JSONContent = {
        type: 'details',
        content: [
          {
            type: 'detailsSummary',
            content: [{ type: 'text', text: 'Toggle' }],
          },
        ],
      };
      const result = serializeMarkdown(doc(details));
      expect(result).toContain('<details>');
      expect(result).toContain('<summary>Toggle</summary>');
      expect(result).toContain('</details>');
      // Should not have empty body lines between summary and closing tag
      expect(result).toBe('<details>\n<summary>Toggle</summary>\n</details>\n');
    });

    it('should serialize details with empty detailsContent as clean HTML', () => {
      const details: JSONContent = {
        type: 'details',
        content: [
          {
            type: 'detailsSummary',
            content: [{ type: 'text', text: 'Toggle' }],
          },
          {
            type: 'detailsContent',
            content: [],
          },
        ],
      };
      const result = serializeMarkdown(doc(details));
      expect(result).toBe('<details>\n<summary>Toggle</summary>\n</details>\n');
    });
  });

  describe('Blockquote with multiple paragraphs', () => {
    it('should have correct > prefix on all lines', () => {
      const blockquote: JSONContent = {
        type: 'blockquote',
        content: [paragraph('First paragraph'), paragraph('Second paragraph')],
      };
      const result = serializeMarkdown(doc(blockquote));
      const lines = result.trim().split('\n');
      // Every line should start with > or be a bare >
      for (const line of lines) {
        expect(line).toMatch(/^>/);
      }
      expect(result).toContain('> First paragraph');
      expect(result).toContain('> Second paragraph');
    });

    it('should separate multiple paragraphs with blank > line', () => {
      const blockquote: JSONContent = {
        type: 'blockquote',
        content: [paragraph('Para 1'), paragraph('Para 2')],
      };
      const result = serializeMarkdown(doc(blockquote));
      // Between the two paragraphs, there should be a bare > line
      expect(result).toContain('> Para 1\n>\n> Para 2');
    });
  });

  describe('Details block round-trip', () => {
    it('should round-trip details with summary and body', () => {
      const md = '<details>\n<summary>Click me</summary>\n\nSome body content\n\n</details>\n';
      const result = roundTrip(md);
      expect(result).toContain('<details>');
      expect(result).toContain('<summary>Click me</summary>');
      expect(result).toContain('Some body content');
      expect(result).toContain('</details>');
    });
  });
});
