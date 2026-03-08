import type { BlockDiff, AlignedRow } from './types';

export function computeAlignment(diffs: BlockDiff[]): AlignedRow[] {
  return diffs.map((diff): AlignedRow => {
    switch (diff.type) {
      case 'unchanged':
        return { left: diff.oldBlock!, right: diff.newBlock!, diffType: 'unchanged' };
      case 'modified':
        return { left: diff.oldBlock!, right: diff.newBlock!, diffType: 'modified' };
      case 'removed':
        return { left: diff.oldBlock!, right: null, diffType: 'removed' };
      case 'added':
        return { left: null, right: diff.newBlock!, diffType: 'added' };
    }
  });
}
