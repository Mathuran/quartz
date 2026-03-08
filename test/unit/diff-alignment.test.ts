import { describe, it, expect } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import { computeAlignment } from '../../src/webview/diff/alignment';
import type { BlockDiff } from '../../src/webview/diff/types';

const p = (text: string): JSONContent => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

describe('computeAlignment', () => {
  it('returns empty alignment for empty diffs', () => {
    expect(computeAlignment([])).toEqual([]);
  });

  it('maps all unchanged diffs to rows with real blocks on both sides', () => {
    const diffs: BlockDiff[] = [
      { type: 'unchanged', oldBlock: p('a'), newBlock: p('a'), oldIndex: 0, newIndex: 0 },
      { type: 'unchanged', oldBlock: p('b'), newBlock: p('b'), oldIndex: 1, newIndex: 1 },
    ];
    const rows = computeAlignment(diffs);
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.left).not.toBeNull();
      expect(row.right).not.toBeNull();
      expect(row.diffType).toBe('unchanged');
    }
  });

  it('maps a single added block to a row with null left', () => {
    const diffs: BlockDiff[] = [
      { type: 'added', newBlock: p('new'), newIndex: 0 },
    ];
    const rows = computeAlignment(diffs);
    expect(rows).toEqual([
      { left: null, right: p('new'), diffType: 'added' },
    ]);
  });

  it('maps a single removed block to a row with null right', () => {
    const diffs: BlockDiff[] = [
      { type: 'removed', oldBlock: p('old'), oldIndex: 0 },
    ];
    const rows = computeAlignment(diffs);
    expect(rows).toEqual([
      { left: p('old'), right: null, diffType: 'removed' },
    ]);
  });

  it('maps a modified block to a row with real blocks on both sides', () => {
    const diffs: BlockDiff[] = [
      { type: 'modified', oldBlock: p('before'), newBlock: p('after'), oldIndex: 0, newIndex: 0 },
    ];
    const rows = computeAlignment(diffs);
    expect(rows).toEqual([
      { left: p('before'), right: p('after'), diffType: 'modified' },
    ]);
  });

  it('handles a complex mix of diff types', () => {
    const diffs: BlockDiff[] = [
      { type: 'unchanged', oldBlock: p('a'), newBlock: p('a'), oldIndex: 0, newIndex: 0 },
      { type: 'unchanged', oldBlock: p('b'), newBlock: p('b'), oldIndex: 1, newIndex: 1 },
      { type: 'added', newBlock: p('c'), newIndex: 2 },
      { type: 'removed', oldBlock: p('d'), oldIndex: 2 },
      { type: 'modified', oldBlock: p('e'), newBlock: p('e2'), oldIndex: 3, newIndex: 3 },
    ];
    const rows = computeAlignment(diffs);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({ left: p('a'), right: p('a'), diffType: 'unchanged' });
    expect(rows[1]).toEqual({ left: p('b'), right: p('b'), diffType: 'unchanged' });
    expect(rows[2]).toEqual({ left: null, right: p('c'), diffType: 'added' });
    expect(rows[3]).toEqual({ left: p('d'), right: null, diffType: 'removed' });
    expect(rows[4]).toEqual({ left: p('e'), right: p('e2'), diffType: 'modified' });
  });

  it('handles multiple consecutive added blocks', () => {
    const diffs: BlockDiff[] = [
      { type: 'added', newBlock: p('x'), newIndex: 0 },
      { type: 'added', newBlock: p('y'), newIndex: 1 },
      { type: 'added', newBlock: p('z'), newIndex: 2 },
    ];
    const rows = computeAlignment(diffs);
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.left).toBeNull();
      expect(row.right).not.toBeNull();
      expect(row.diffType).toBe('added');
    }
    expect(rows[0].right).toEqual(p('x'));
    expect(rows[1].right).toEqual(p('y'));
    expect(rows[2].right).toEqual(p('z'));
  });
});
