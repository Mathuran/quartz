import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/markdown/parser';

describe('Inline Mark Handling Fixes', () => {
  describe('targeted search-and-splice for mark close tokens', () => {
    it('should correctly handle bold + italic (nested, non-overlapping)', () => {
      const { doc } = parseMarkdown('**bold *bold-italic* bold**');
      const paragraph = doc.content![0];
      expect(paragraph.type).toBe('paragraph');

      // Find the bold-italic node (has both marks)
      const boldItalicNode = paragraph.content!.find(
        (n) =>
          n.marks?.some((m) => m.type === 'bold') &&
          n.marks?.some((m) => m.type === 'italic')
      );
      expect(boldItalicNode).toBeDefined();
      expect(boldItalicNode!.text).toBe('bold-italic');

      // Find bold-only nodes
      const boldOnlyNodes = paragraph.content!.filter(
        (n) =>
          n.marks?.some((m) => m.type === 'bold') &&
          !n.marks?.some((m) => m.type === 'italic')
      );
      expect(boldOnlyNodes.length).toBeGreaterThanOrEqual(1);
    });

    it('should correctly handle bold + strikethrough (nested)', () => {
      const { doc } = parseMarkdown('**bold ~~bold-strike~~ bold**');
      const paragraph = doc.content![0];
      expect(paragraph.type).toBe('paragraph');

      // Find the bold-strike node
      const boldStrikeNode = paragraph.content!.find(
        (n) =>
          n.marks?.some((m) => m.type === 'bold') &&
          n.marks?.some((m) => m.type === 'strike')
      );
      expect(boldStrikeNode).toBeDefined();
      expect(boldStrikeNode!.text).toBe('bold-strike');
    });

    it('should correctly handle triple nesting: bold > italic > strikethrough', () => {
      const { doc } = parseMarkdown('**bold *italic ~~all-three~~***');
      const paragraph = doc.content![0];
      expect(paragraph.type).toBe('paragraph');

      // Find the node with all three marks
      const tripleNode = paragraph.content!.find(
        (n) =>
          n.marks?.some((m) => m.type === 'bold') &&
          n.marks?.some((m) => m.type === 'italic') &&
          n.marks?.some((m) => m.type === 'strike')
      );
      expect(tripleNode).toBeDefined();
      expect(tripleNode!.text).toBe('all-three');
    });

    it('should not corrupt mark stack when marks close in non-LIFO order', () => {
      // markdown-it normalizes overlapping marks, but the splice approach
      // still protects against any non-LIFO close order.
      // Test with a valid nested case: **bold _italic_** remaining
      const { doc } = parseMarkdown('**bold _italic_** remaining');
      const paragraph = doc.content![0];
      expect(paragraph.type).toBe('paragraph');

      // "remaining" should have NO marks (mark stack should be clean)
      const remainingNode = paragraph.content!.find(
        (n) => n.text === ' remaining'
      );
      expect(remainingNode).toBeDefined();
      expect(remainingNode!.marks).toBeUndefined();
    });
  });

  describe('softbreak carries forward active marks', () => {
    it('should apply bold mark to softbreak newline node', () => {
      // markdown-it produces a softbreak token for a newline within a paragraph
      // when using commonmark mode. The newline inside bold should carry the bold mark.
      const { doc } = parseMarkdown('**bold\nstill bold**');
      const paragraph = doc.content![0];
      expect(paragraph.type).toBe('paragraph');

      // Find the newline text node
      const newlineNode = paragraph.content!.find((n) => n.text === '\n');
      expect(newlineNode).toBeDefined();
      // The newline node should carry the bold mark
      expect(newlineNode!.marks).toBeDefined();
      expect(newlineNode!.marks!.some((m) => m.type === 'bold')).toBe(true);
    });

    it('should apply italic mark to softbreak newline node', () => {
      const { doc } = parseMarkdown('*italic\nstill italic*');
      const paragraph = doc.content![0];
      expect(paragraph.type).toBe('paragraph');

      const newlineNode = paragraph.content!.find((n) => n.text === '\n');
      expect(newlineNode).toBeDefined();
      expect(newlineNode!.marks).toBeDefined();
      expect(newlineNode!.marks!.some((m) => m.type === 'italic')).toBe(true);
    });

    it('should not apply marks to softbreak when no marks are active', () => {
      const { doc } = parseMarkdown('plain\ntext');
      const paragraph = doc.content![0];
      expect(paragraph.type).toBe('paragraph');

      const newlineNode = paragraph.content!.find((n) => n.text === '\n');
      expect(newlineNode).toBeDefined();
      expect(newlineNode!.marks).toBeUndefined();
    });

    it('should apply multiple marks (bold+italic) to softbreak newline node', () => {
      const { doc } = parseMarkdown('***bold-italic\nstill***');
      const paragraph = doc.content![0];
      expect(paragraph.type).toBe('paragraph');

      const newlineNode = paragraph.content!.find((n) => n.text === '\n');
      expect(newlineNode).toBeDefined();
      expect(newlineNode!.marks).toBeDefined();
      expect(newlineNode!.marks!.some((m) => m.type === 'bold')).toBe(true);
      expect(newlineNode!.marks!.some((m) => m.type === 'italic')).toBe(true);
    });
  });

  describe('code_inline empty content guard', () => {
    it('should not crash on empty inline code', () => {
      // While markdown-it typically won't produce empty code_inline tokens,
      // the guard protects against edge cases. We verify no crash and that
      // regular inline code still works.
      expect(() => parseMarkdown('``')).not.toThrow();
    });

    it('should still parse non-empty inline code correctly', () => {
      const { doc } = parseMarkdown('`code`');
      const paragraph = doc.content![0];
      const codeNode = paragraph.content!.find(
        (n) => n.marks?.some((m) => m.type === 'code')
      );
      expect(codeNode).toBeDefined();
      expect(codeNode!.text).toBe('code');
    });

    it('should parse inline code with only whitespace content', () => {
      const { doc } = parseMarkdown('` `');
      const paragraph = doc.content![0];
      const codeNode = paragraph.content!.find(
        (n) => n.marks?.some((m) => m.type === 'code')
      );
      expect(codeNode).toBeDefined();
      expect(codeNode!.text).toBe(' ');
    });
  });

  describe('overlapping marks scenarios', () => {
    it('should parse bold text followed by italic text without corruption', () => {
      const { doc } = parseMarkdown('**bold** *italic*');
      const paragraph = doc.content![0];

      const boldNode = paragraph.content!.find(
        (n) => n.marks?.some((m) => m.type === 'bold')
      );
      expect(boldNode).toBeDefined();
      expect(boldNode!.text).toBe('bold');

      const italicNode = paragraph.content!.find(
        (n) => n.marks?.some((m) => m.type === 'italic')
      );
      expect(italicNode).toBeDefined();
      expect(italicNode!.text).toBe('italic');
    });

    it('should parse bold text with strikethrough inside', () => {
      const { doc } = parseMarkdown('**bold ~~strike~~ bold**');
      const paragraph = doc.content![0];

      // The strikethrough text should have both bold and strike marks
      const strikeNode = paragraph.content!.find(
        (n) =>
          n.marks?.some((m) => m.type === 'strike') &&
          n.marks?.some((m) => m.type === 'bold')
      );
      expect(strikeNode).toBeDefined();
      expect(strikeNode!.text).toBe('strike');

      // The surrounding bold text should only have bold mark
      const boldOnlyNodes = paragraph.content!.filter(
        (n) =>
          n.marks?.some((m) => m.type === 'bold') &&
          !n.marks?.some((m) => m.type === 'strike')
      );
      expect(boldOnlyNodes.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle adjacent different marks without leaking', () => {
      const { doc } = parseMarkdown('**bold**~~strike~~*italic*');
      const paragraph = doc.content![0];

      // Verify each mark type exists in exactly the right node
      const boldNode = paragraph.content!.find(
        (n) =>
          n.text === 'bold' &&
          n.marks?.some((m) => m.type === 'bold')
      );
      expect(boldNode).toBeDefined();
      expect(boldNode!.marks).toHaveLength(1);

      const strikeNode = paragraph.content!.find(
        (n) =>
          n.text === 'strike' &&
          n.marks?.some((m) => m.type === 'strike')
      );
      expect(strikeNode).toBeDefined();
      expect(strikeNode!.marks).toHaveLength(1);

      const italicNode = paragraph.content!.find(
        (n) =>
          n.text === 'italic' &&
          n.marks?.some((m) => m.type === 'italic')
      );
      expect(italicNode).toBeDefined();
      expect(italicNode!.marks).toHaveLength(1);
    });
  });
});
