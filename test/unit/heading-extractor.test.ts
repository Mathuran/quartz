import { describe, it, expect } from 'vitest';
import { extractHeadings, type HeadingItem } from '../../src/webview/utils/headingExtractor';

// Mock a minimal TipTap editor with a document containing headings
function createMockEditor(nodes: Array<{ type: string; attrs?: Record<string, unknown>; text?: string }>): Parameters<typeof extractHeadings>[0] {
  let pos = 0;
  const descendants: Array<{ node: { type: { name: string }; attrs: Record<string, unknown>; textContent: string }; pos: number }> = [];

  for (const n of nodes) {
    descendants.push({
      node: {
        type: { name: n.type },
        attrs: n.attrs ?? {},
        textContent: n.text ?? '',
      },
      pos,
    });
    // Approximate node size
    pos += (n.text?.length ?? 0) + 2;
  }

  return {
    state: {
      doc: {
        descendants(callback: (node: unknown, pos: number) => void) {
          for (const d of descendants) {
            callback(d.node, d.pos);
          }
        },
      },
    },
  } as unknown as Parameters<typeof extractHeadings>[0];
}

describe('extractHeadings (webview)', () => {
  it('should extract headings from document', () => {
    const editor = createMockEditor([
      { type: 'heading', attrs: { level: 1 }, text: 'Title' },
      { type: 'paragraph', text: 'Some text' },
      { type: 'heading', attrs: { level: 2 }, text: 'Section' },
      { type: 'heading', attrs: { level: 3 }, text: 'Subsection' },
    ]);

    const result = extractHeadings(editor);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ level: 1, text: 'Title', pos: 0 });
    expect(result[1]).toEqual({ level: 2, text: 'Section', pos: expect.any(Number) });
    expect(result[2]).toEqual({ level: 3, text: 'Subsection', pos: expect.any(Number) });
  });

  it('should return empty array for document without headings', () => {
    const editor = createMockEditor([
      { type: 'paragraph', text: 'Just text' },
      { type: 'paragraph', text: 'More text' },
    ]);

    const result = extractHeadings(editor);
    expect(result).toHaveLength(0);
  });

  it('should handle all 6 heading levels', () => {
    const editor = createMockEditor([
      { type: 'heading', attrs: { level: 1 }, text: 'H1' },
      { type: 'heading', attrs: { level: 2 }, text: 'H2' },
      { type: 'heading', attrs: { level: 3 }, text: 'H3' },
      { type: 'heading', attrs: { level: 4 }, text: 'H4' },
      { type: 'heading', attrs: { level: 5 }, text: 'H5' },
      { type: 'heading', attrs: { level: 6 }, text: 'H6' },
    ]);

    const result = extractHeadings(editor);
    expect(result).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      expect(result[i].level).toBe(i + 1);
      expect(result[i].text).toBe(`H${i + 1}`);
    }
  });

  it('should handle empty document', () => {
    const editor = createMockEditor([]);
    const result = extractHeadings(editor);
    expect(result).toHaveLength(0);
  });

  it('should skip non-heading nodes', () => {
    const editor = createMockEditor([
      { type: 'paragraph', text: 'text' },
      { type: 'heading', attrs: { level: 1 }, text: 'Only Heading' },
      { type: 'codeBlock', text: '# not a heading' },
      { type: 'blockquote', text: 'quote' },
    ]);

    const result = extractHeadings(editor);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Only Heading');
  });
});
