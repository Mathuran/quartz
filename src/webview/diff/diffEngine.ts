import type { JSONContent } from '@tiptap/core';
import { parseMarkdown } from '../../markdown/parser';
import { extractFrontmatter } from '../../markdown/frontmatter';
import type { BlockDiff, DiffResult, DiffSummary } from './types';

function normalize(block: JSONContent): string {
  return JSON.stringify(block, (_, value) => (value === undefined ? undefined : value));
}

/**
 * Compute LCS and return matched index pairs [oldIndex, newIndex][].
 * Pre-computes block fingerprints to avoid redundant JSON.stringify calls.
 */
function computeLCS(oldBlocks: JSONContent[], newBlocks: JSONContent[]): [number, number][] {
  const m = oldBlocks.length;
  const n = newBlocks.length;

  // Pre-compute fingerprints once per block
  const oldFingerprints = oldBlocks.map(normalize);
  const newFingerprints = newBlocks.map(normalize);

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldFingerprints[i - 1] === newFingerprints[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to collect matched pairs
  const pairs: [number, number][] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (oldFingerprints[i - 1] === newFingerprints[j - 1]) {
      pairs.push([i - 1, j - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  // Reverse so pairs are in ascending order
  pairs.reverse();
  return pairs;
}

function buildLCSMap(
  lcsPairs: [number, number][],
): { oldInLCS: Set<number>; newInLCS: Set<number>; lcsOldToNew: Map<number, number> } {
  const oldInLCS = new Set<number>();
  const newInLCS = new Set<number>();
  const lcsOldToNew = new Map<number, number>();

  for (const [i, j] of lcsPairs) {
    oldInLCS.add(i);
    newInLCS.add(j);
    lcsOldToNew.set(i, j);
  }

  return { oldInLCS, newInLCS, lcsOldToNew };
}

function pairModified(removed: BlockDiff[], added: BlockDiff[]): BlockDiff[] {
  const result: BlockDiff[] = [];
  let r = 0;
  let a = 0;

  while (r < removed.length && a < added.length) {
    if (removed[r].oldBlock!.type === added[a].newBlock!.type) {
      result.push({
        type: 'modified',
        oldBlock: removed[r].oldBlock,
        newBlock: added[a].newBlock,
        oldIndex: removed[r].oldIndex,
        newIndex: added[a].newIndex,
      });
      r++;
      a++;
    } else {
      result.push(removed[r]);
      r++;
    }
  }

  while (r < removed.length) {
    result.push(removed[r++]);
  }
  while (a < added.length) {
    result.push(added[a++]);
  }

  return result;
}

/** Computes a block-level diff between two markdown documents. */
export function computeDiff(oldMarkdown: string, newMarkdown: string): DiffResult {
  const oldParsed = parseMarkdown(oldMarkdown);
  const newParsed = parseMarkdown(newMarkdown);
  const oldDoc = oldParsed.doc;
  const newDoc = newParsed.doc;

  const oldFm = extractFrontmatter(oldMarkdown);
  const newFm = extractFrontmatter(newMarkdown);
  const hasFrontmatterChange = oldFm.frontmatter !== newFm.frontmatter;

  const oldBlocks = oldDoc.content ?? [];
  const newBlocks = newDoc.content ?? [];

  const lcsPairs = computeLCS(oldBlocks, newBlocks);
  const { oldInLCS, newInLCS, lcsOldToNew } = buildLCSMap(lcsPairs);

  const diffs: BlockDiff[] = [];
  let oi = 0;
  let ni = 0;

  while (oi < oldBlocks.length || ni < newBlocks.length) {
    if (oi < oldBlocks.length && oldInLCS.has(oi)) {
      const matchedNew = lcsOldToNew.get(oi)!;

      const pendingRemoved: BlockDiff[] = [];
      const pendingAdded: BlockDiff[] = [];

      while (ni < matchedNew) {
        if (!newInLCS.has(ni)) {
          pendingAdded.push({ type: 'added', newBlock: newBlocks[ni], newIndex: ni });
        }
        ni++;
      }

      diffs.push(...pairModified(pendingRemoved, pendingAdded));

      diffs.push({
        type: 'unchanged',
        oldBlock: oldBlocks[oi],
        newBlock: newBlocks[ni],
        oldIndex: oi,
        newIndex: ni,
      });
      oi++;
      ni++;
    } else if (oi < oldBlocks.length && !oldInLCS.has(oi)) {
      const pendingRemoved: BlockDiff[] = [];
      while (oi < oldBlocks.length && !oldInLCS.has(oi)) {
        pendingRemoved.push({ type: 'removed', oldBlock: oldBlocks[oi], oldIndex: oi });
        oi++;
      }

      const pendingAdded: BlockDiff[] = [];
      const boundary = oi < oldBlocks.length ? lcsOldToNew.get(oi)! : newBlocks.length;
      while (ni < boundary && !newInLCS.has(ni)) {
        pendingAdded.push({ type: 'added', newBlock: newBlocks[ni], newIndex: ni });
        ni++;
      }

      diffs.push(...pairModified(pendingRemoved, pendingAdded));
    } else {
      diffs.push({ type: 'added', newBlock: newBlocks[ni], newIndex: ni });
      ni++;
    }
  }

  const summary: DiffSummary = { added: 0, removed: 0, modified: 0, unchanged: 0 };
  for (const d of diffs) {
    summary[d.type]++;
  }

  return {
    diffs,
    oldDoc,
    newDoc,
    summary,
    hasFrontmatterChange,
    ...(oldFm.frontmatter != null ? { oldFrontmatter: oldFm.frontmatter } : {}),
    ...(newFm.frontmatter != null ? { newFrontmatter: newFm.frontmatter } : {}),
  };
}
