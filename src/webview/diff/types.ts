import type { JSONContent } from '@tiptap/core';

/** Classification of a block in the diff result */
export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

/** A single block-level diff entry */
export interface BlockDiff {
  type: DiffType;
  /** Present for 'removed', 'modified', 'unchanged' */
  oldBlock?: JSONContent;
  /** Present for 'added', 'modified', 'unchanged' */
  newBlock?: JSONContent;
  /** Index in the old document's top-level block array */
  oldIndex?: number;
  /** Index in the new document's top-level block array */
  newIndex?: number;
}

/** Summary counts for a diff result */
export interface DiffSummary {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
}

/** Complete result of diffing two documents */
export interface DiffResult {
  diffs: BlockDiff[];
  oldDoc: JSONContent;
  newDoc: JSONContent;
  summary: DiffSummary;
  hasFrontmatterChange: boolean;
  oldFrontmatter?: string;
  newFrontmatter?: string;
}

/** A single row in the aligned split-view layout */
export interface AlignedRow {
  /** Content for the left (old) panel, or null for a placeholder */
  left: JSONContent | null;
  /** Content for the right (new) panel, or null for a placeholder */
  right: JSONContent | null;
  /** The diff type that produced this row */
  diffType: DiffType;
}
