import { describe, it, expect } from 'vitest';
import { computeDiff } from '../../src/webview/diff/diffEngine';
import type { DiffType } from '../../src/webview/diff/types';

/** Helper: extract just the diff types from a result */
function diffTypes(oldMd: string, newMd: string): DiffType[] {
  return computeDiff(oldMd, newMd).diffs.map((d) => d.type);
}

describe('computeDiff', () => {
  // ── Identical documents ──────────────────────────────────────────

  describe('identical documents', () => {
    it('returns all unchanged for identical single paragraph', () => {
      const md = 'Hello world\n';
      const result = computeDiff(md, md);
      expect(result.diffs).toHaveLength(1);
      expect(result.diffs[0].type).toBe('unchanged');
      expect(result.summary).toEqual({ added: 0, removed: 0, modified: 0, unchanged: 1 });
    });

    it('returns all unchanged for identical multi-block document', () => {
      const md = '# Title\n\nParagraph one\n\nParagraph two\n';
      const result = computeDiff(md, md);
      expect(result.diffs.every((d) => d.type === 'unchanged')).toBe(true);
      expect(result.summary.unchanged).toBe(3);
    });

    it('handles two empty documents', () => {
      const result = computeDiff('', '');
      expect(result.diffs).toHaveLength(1); // parser returns a default empty paragraph
      expect(result.summary.unchanged).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Added blocks ─────────────────────────────────────────────────

  describe('added blocks', () => {
    it('detects a paragraph added at the end', () => {
      const old = 'First\n';
      const neu = 'First\n\nSecond\n';
      const types = diffTypes(old, neu);
      expect(types).toEqual(['unchanged', 'added']);
    });

    it('detects a paragraph added at the beginning', () => {
      const old = 'Second\n';
      const neu = 'First\n\nSecond\n';
      const types = diffTypes(old, neu);
      expect(types).toEqual(['added', 'unchanged']);
    });

    it('detects multiple added blocks', () => {
      const old = 'A\n';
      const neu = 'A\n\nB\n\nC\n';
      const types = diffTypes(old, neu);
      expect(types).toEqual(['unchanged', 'added', 'added']);
    });

    it('detects content added to an empty document', () => {
      const result = computeDiff('', '# Hello\n\nWorld\n');
      expect(result.summary.added).toBeGreaterThan(0);
    });
  });

  // ── Removed blocks ───────────────────────────────────────────────

  describe('removed blocks', () => {
    it('detects a paragraph removed from the end', () => {
      const old = 'First\n\nSecond\n';
      const neu = 'First\n';
      const types = diffTypes(old, neu);
      expect(types).toEqual(['unchanged', 'removed']);
    });

    it('detects a paragraph removed from the beginning', () => {
      const old = 'First\n\nSecond\n';
      const neu = 'Second\n';
      const types = diffTypes(old, neu);
      expect(types).toEqual(['removed', 'unchanged']);
    });

    it('detects all content removed', () => {
      const result = computeDiff('# Hello\n\nWorld\n', '');
      expect(result.summary.removed).toBeGreaterThan(0);
    });
  });

  // ── Modified blocks ──────────────────────────────────────────────

  describe('modified blocks', () => {
    it('detects a modified paragraph (same type, different content)', () => {
      const old = 'Hello\n';
      const neu = 'Goodbye\n';
      const types = diffTypes(old, neu);
      expect(types).toEqual(['modified']);
    });

    it('pairs modified blocks when types match', () => {
      const old = '# Old heading\n';
      const neu = '# New heading\n';
      const result = computeDiff(old, neu);
      expect(result.diffs[0].type).toBe('modified');
      expect(result.diffs[0].oldBlock?.type).toBe('heading');
      expect(result.diffs[0].newBlock?.type).toBe('heading');
    });

    it('does not pair as modified when block types differ', () => {
      const old = 'A paragraph\n';
      const neu = '# A heading\n';
      const types = diffTypes(old, neu);
      // Should be removed + added, not modified (paragraph vs heading)
      expect(types).not.toContain('modified');
      expect(types).toContain('removed');
      expect(types).toContain('added');
    });
  });

  // ── Mixed changes ────────────────────────────────────────────────

  describe('mixed changes', () => {
    it('handles add + remove in same document', () => {
      const old = 'A\n\nB\n\nC\n';
      const neu = 'A\n\nD\n\nC\n';
      const result = computeDiff(old, neu);
      expect(result.summary.unchanged).toBe(2); // A, C
      // B → D is modified (both paragraphs)
      expect(result.summary.modified).toBe(1);
    });

    it('handles insertions between unchanged blocks', () => {
      const old = 'A\n\nC\n';
      const neu = 'A\n\nB\n\nC\n';
      const types = diffTypes(old, neu);
      expect(types).toEqual(['unchanged', 'added', 'unchanged']);
    });

    it('handles deletion between unchanged blocks', () => {
      const old = 'A\n\nB\n\nC\n';
      const neu = 'A\n\nC\n';
      const types = diffTypes(old, neu);
      expect(types).toEqual(['unchanged', 'removed', 'unchanged']);
    });

    it('handles complete document replacement', () => {
      const old = 'Old paragraph one\n\nOld paragraph two\n';
      const neu = 'New paragraph one\n\nNew paragraph two\n';
      const result = computeDiff(old, neu);
      // All blocks changed — should be modified (same types)
      expect(result.diffs.every((d) => d.type === 'modified')).toBe(true);
    });
  });

  // ── Block type variations ────────────────────────────────────────

  describe('block types', () => {
    it('diffs headings correctly', () => {
      const old = '# Title\n\n## Subtitle\n';
      const neu = '# Title\n\n## Changed\n';
      const result = computeDiff(old, neu);
      expect(result.diffs[0].type).toBe('unchanged');
      expect(result.diffs[1].type).toBe('modified');
    });

    it('diffs code blocks', () => {
      const old = '```js\nconsole.log("a")\n```\n';
      const neu = '```js\nconsole.log("b")\n```\n';
      const result = computeDiff(old, neu);
      expect(result.diffs[0].type).toBe('modified');
    });

    it('diffs bullet lists', () => {
      const old = '- Item A\n- Item B\n';
      const neu = '- Item A\n- Item C\n';
      const result = computeDiff(old, neu);
      // bulletList is a single block; content changed so modified
      expect(result.diffs[0].type).toBe('modified');
    });

    it('diffs blockquotes', () => {
      const old = '> Quote one\n';
      const neu = '> Quote two\n';
      const result = computeDiff(old, neu);
      expect(result.diffs[0].type).toBe('modified');
    });

    it('diffs horizontal rules as unchanged', () => {
      const old = '---\n';
      const neu = '---\n';
      const result = computeDiff(old, neu);
      expect(result.diffs[0].type).toBe('unchanged');
    });
  });

  // ── Frontmatter ──────────────────────────────────────────────────

  describe('frontmatter', () => {
    it('detects frontmatter change', () => {
      const old = '---\ntitle: Old\n---\n\nContent\n';
      const neu = '---\ntitle: New\n---\n\nContent\n';
      const result = computeDiff(old, neu);
      expect(result.hasFrontmatterChange).toBe(true);
      expect(result.oldFrontmatter).toContain('Old');
      expect(result.newFrontmatter).toContain('New');
    });

    it('detects no frontmatter change', () => {
      const old = '---\ntitle: Same\n---\n\nContent\n';
      const neu = '---\ntitle: Same\n---\n\nContent\n';
      const result = computeDiff(old, neu);
      expect(result.hasFrontmatterChange).toBe(false);
    });

    it('detects frontmatter added', () => {
      const old = 'Content\n';
      const neu = '---\ntitle: New\n---\n\nContent\n';
      const result = computeDiff(old, neu);
      expect(result.hasFrontmatterChange).toBe(true);
      expect(result.oldFrontmatter).toBeUndefined();
      expect(result.newFrontmatter).toContain('New');
    });

    it('detects frontmatter removed', () => {
      const old = '---\ntitle: Old\n---\n\nContent\n';
      const neu = 'Content\n';
      const result = computeDiff(old, neu);
      expect(result.hasFrontmatterChange).toBe(true);
      expect(result.oldFrontmatter).toContain('Old');
      expect(result.newFrontmatter).toBeUndefined();
    });
  });

  // ── Summary ──────────────────────────────────────────────────────

  describe('summary', () => {
    it('counts correctly for a mixed diff', () => {
      const old = 'A\n\nB\n\nC\n\nD\n';
      const neu = 'A\n\nB modified\n\nE\n';
      const result = computeDiff(old, neu);
      // A unchanged, B→"B modified" modified, C removed, D→E modified or removed+added
      const s = result.summary;
      expect(s.added + s.removed + s.modified + s.unchanged).toBe(result.diffs.length);
    });

    it('returns oldDoc and newDoc', () => {
      const result = computeDiff('Hello\n', 'World\n');
      expect(result.oldDoc).toBeDefined();
      expect(result.oldDoc.type).toBe('doc');
      expect(result.newDoc).toBeDefined();
      expect(result.newDoc.type).toBe('doc');
    });
  });

  // ── Index tracking ───────────────────────────────────────────────

  describe('index tracking', () => {
    it('tracks oldIndex and newIndex for unchanged blocks', () => {
      const md = 'A\n\nB\n';
      const result = computeDiff(md, md);
      expect(result.diffs[0].oldIndex).toBe(0);
      expect(result.diffs[0].newIndex).toBe(0);
      expect(result.diffs[1].oldIndex).toBe(1);
      expect(result.diffs[1].newIndex).toBe(1);
    });

    it('tracks newIndex for added blocks', () => {
      const old = 'A\n';
      const neu = 'A\n\nB\n';
      const result = computeDiff(old, neu);
      const added = result.diffs.find((d) => d.type === 'added');
      expect(added).toBeDefined();
      expect(added!.newIndex).toBeDefined();
      expect(added!.oldIndex).toBeUndefined();
    });

    it('tracks oldIndex for removed blocks', () => {
      const old = 'A\n\nB\n';
      const neu = 'A\n';
      const result = computeDiff(old, neu);
      const removed = result.diffs.find((d) => d.type === 'removed');
      expect(removed).toBeDefined();
      expect(removed!.oldIndex).toBeDefined();
      expect(removed!.newIndex).toBeUndefined();
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles single block documents', () => {
      const result = computeDiff('Only one\n', 'Only one\n');
      expect(result.diffs).toHaveLength(1);
      expect(result.diffs[0].type).toBe('unchanged');
    });

    it('handles documents with many blocks', () => {
      const blocks = Array.from({ length: 20 }, (_, i) => `Paragraph ${i}`);
      const old = blocks.join('\n\n') + '\n';
      const neu = blocks.join('\n\n') + '\n';
      const result = computeDiff(old, neu);
      expect(result.diffs.every((d) => d.type === 'unchanged')).toBe(true);
    });

    it('handles reordered blocks', () => {
      const old = 'A\n\nB\n\nC\n';
      const neu = 'C\n\nA\n\nB\n';
      const result = computeDiff(old, neu);
      // LCS should find A,B as common subsequence; C moved
      expect(result.summary.unchanged).toBeGreaterThanOrEqual(1);
    });

    it('handles inline formatting differences', () => {
      const old = 'Hello world\n';
      const neu = 'Hello **world**\n';
      const result = computeDiff(old, neu);
      expect(result.diffs[0].type).toBe('modified');
    });
  });
});
