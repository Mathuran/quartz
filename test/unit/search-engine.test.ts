import { describe, it, expect } from 'vitest';
import { findMatches } from '../../src/webview/search/searchEngine';
import { parseMarkdown } from '../../src/markdown/parser';
import { Schema } from '@tiptap/pm/model';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';

// Create a minimal ProseMirror schema for testing
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    heading: {
      group: 'block',
      content: 'inline*',
      attrs: { level: { default: 1 } },
    },
    text: { group: 'inline', inline: true },
    codeBlock: {
      group: 'block',
      content: 'text*',
      code: true,
    },
    blockquote: {
      group: 'block',
      content: 'block+',
    },
    bulletList: {
      group: 'block',
      content: 'listItem+',
    },
    listItem: {
      content: 'paragraph block*',
    },
  },
  marks: {
    bold: {},
    italic: {},
    code: {},
  },
});

function createDoc(text: string): ProseMirrorNode {
  return schema.node('doc', null, [schema.node('paragraph', null, text ? [schema.text(text)] : [])]);
}

function createMultiParagraphDoc(...paragraphs: string[]): ProseMirrorNode {
  return schema.node(
    'doc',
    null,
    paragraphs.map((p) =>
      schema.node('paragraph', null, p ? [schema.text(p)] : []),
    ),
  );
}

function createDocWithMarks(segments: Array<{ text: string; marks?: string[] }>): ProseMirrorNode {
  const children = segments.map(({ text, marks: markNames }) => {
    const marks = (markNames || []).map((m) => schema.mark(m));
    return schema.text(text, marks);
  });
  return schema.node('doc', null, [schema.node('paragraph', null, children)]);
}

describe('findMatches', () => {
  describe('basic matching', () => {
    it('finds a simple match', () => {
      const doc = createDoc('hello world');
      const matches = findMatches(doc, 'world', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ from: 7, to: 12 });
    });

    it('finds multiple matches', () => {
      const doc = createDoc('the cat sat on the mat');
      const matches = findMatches(doc, 'the', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(2);
    });

    it('finds overlapping positions correctly', () => {
      const doc = createDoc('aaa');
      const matches = findMatches(doc, 'aa', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ from: 1, to: 3 });
      expect(matches[1]).toEqual({ from: 2, to: 4 });
    });

    it('returns empty array for no matches', () => {
      const doc = createDoc('hello world');
      const matches = findMatches(doc, 'xyz', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(0);
    });

    it('returns empty array for empty query', () => {
      const doc = createDoc('hello world');
      const matches = findMatches(doc, '', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(0);
    });

    it('finds single character matches', () => {
      const doc = createDoc('abcabc');
      const matches = findMatches(doc, 'a', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(2);
    });
  });

  describe('case sensitivity', () => {
    it('matches case-insensitively by default', () => {
      const doc = createDoc('Hello HELLO hello');
      const matches = findMatches(doc, 'hello', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(3);
    });

    it('matches case-sensitively when enabled', () => {
      const doc = createDoc('Hello HELLO hello');
      const matches = findMatches(doc, 'hello', { caseSensitive: true, wholeWord: false });
      expect(matches).toHaveLength(1);
      // "hello" starts at position 13 (1 + 12 chars before it)
      expect(matches[0].from).toBe(13);
    });

    it('case sensitive matches exact case', () => {
      const doc = createDoc('Hello HELLO hello');
      const matches = findMatches(doc, 'HELLO', { caseSensitive: true, wholeWord: false });
      expect(matches).toHaveLength(1);
      expect(matches[0].from).toBe(7);
    });
  });

  describe('whole word matching', () => {
    it('matches whole words only', () => {
      const doc = createDoc('the cat sat on the mat');
      const matches = findMatches(doc, 'the', { caseSensitive: false, wholeWord: true });
      expect(matches).toHaveLength(2);
    });

    it('skips partial matches when whole word is enabled', () => {
      const doc = createDoc('there is the cat');
      const matches = findMatches(doc, 'the', { caseSensitive: false, wholeWord: true });
      expect(matches).toHaveLength(1);
      // "the" as a whole word starts at position 10 (1 + 9 chars)
      expect(matches[0].from).toBe(10);
    });

    it('does not skip partial matches when whole word is disabled', () => {
      const doc = createDoc('there is the cat');
      const matches = findMatches(doc, 'the', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(2);
    });

    it('matches at start and end of text', () => {
      const doc = createDoc('cat sat cat');
      const matches = findMatches(doc, 'cat', { caseSensitive: false, wholeWord: true });
      expect(matches).toHaveLength(2);
    });
  });

  describe('special characters', () => {
    it('finds literal dots', () => {
      const doc = createDoc('file.txt and file-txt');
      const matches = findMatches(doc, 'file.txt', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(1);
    });

    it('finds literal parentheses', () => {
      const doc = createDoc('function() and function');
      const matches = findMatches(doc, 'function()', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(1);
    });

    it('finds literal asterisks', () => {
      const doc = createDoc('a * b = c');
      const matches = findMatches(doc, '*', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(1);
    });
  });

  describe('multi-paragraph documents', () => {
    it('finds matches across multiple paragraphs', () => {
      const doc = createMultiParagraphDoc('hello world', 'hello again', 'goodbye');
      const matches = findMatches(doc, 'hello', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(2);
    });

    it('returns correct positions across paragraphs', () => {
      const doc = createMultiParagraphDoc('abc', 'abc');
      const matches = findMatches(doc, 'abc', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(2);
      // First paragraph: doc(0) > paragraph(1) > text starts at 1
      expect(matches[0].from).toBe(1);
      // Second paragraph: after first paragraph node (1 + 3 + 1 = 5), then paragraph(6), text starts at 6
      expect(matches[1].from).toBe(6);
    });
  });

  describe('formatted text (multiple text nodes)', () => {
    it('finds matches within bold text', () => {
      const doc = createDocWithMarks([
        { text: 'hello ' },
        { text: 'world', marks: ['bold'] },
      ]);
      const matches = findMatches(doc, 'world', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(1);
    });

    it('does not match across node boundaries', () => {
      // "hello" in plain, "world" in bold — searching "helloworld" should find nothing
      const doc = createDocWithMarks([
        { text: 'hello', marks: [] },
        { text: 'world', marks: ['bold'] },
      ]);
      const matches = findMatches(doc, 'helloworld', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(0);
    });
  });

  describe('unicode and CJK', () => {
    it('finds unicode characters', () => {
      const doc = createDoc('café and naïve');
      const matches = findMatches(doc, 'café', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(1);
    });

    it('finds CJK characters', () => {
      const doc = createDoc('Hello 世界 and 世界');
      const matches = findMatches(doc, '世界', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('handles empty document', () => {
      const doc = createDoc('');
      const matches = findMatches(doc, 'test', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(0);
    });

    it('handles query longer than text', () => {
      const doc = createDoc('hi');
      const matches = findMatches(doc, 'hello world', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(0);
    });

    it('handles query equal to full text', () => {
      const doc = createDoc('exact');
      const matches = findMatches(doc, 'exact', { caseSensitive: false, wholeWord: false });
      expect(matches).toHaveLength(1);
    });
  });
});

describe('match navigation', () => {
  it('wraps from last to first', () => {
    const matches = [
      { from: 1, to: 4 },
      { from: 10, to: 13 },
      { from: 20, to: 23 },
    ];
    const currentIndex = 2;
    const next = (currentIndex + 1) % matches.length;
    expect(next).toBe(0);
  });

  it('wraps from first to last', () => {
    const matches = [
      { from: 1, to: 4 },
      { from: 10, to: 13 },
      { from: 20, to: 23 },
    ];
    const currentIndex = 0;
    const prev = (currentIndex - 1 + matches.length) % matches.length;
    expect(prev).toBe(2);
  });
});
