import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { DiffType } from '../diff/types';

export interface DiffDecorationConfig {
  /** Map from top-level block index to its diff type. Only non-'unchanged' entries needed. */
  blockDiffMap: Map<number, DiffType>;
}

const diffDecorationKey = new PluginKey('diffDecoration');

/**
 * TipTap extension that highlights top-level blocks based on their diff status.
 * Pass `blockDiffMap` mapping block indices to DiffType.
 */
export const DiffDecorationExtension = Extension.create<DiffDecorationConfig>({
  name: 'diffDecoration',

  addOptions() {
    return {
      blockDiffMap: new Map(),
    };
  },

  addProseMirrorPlugins() {
    const { blockDiffMap } = this.options;

    return [
      new Plugin({
        key: diffDecorationKey,
        props: {
          decorations(state) {
            if (blockDiffMap.size === 0) return DecorationSet.empty;

            const decorations: Decoration[] = [];
            const doc = state.doc;
            let blockIndex = 0;

            doc.forEach((node, pos) => {
              const diffType = blockDiffMap.get(blockIndex);
              if (diffType && diffType !== 'unchanged') {
                const className = `quartz-diff-${diffType}`;
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: className,
                  }),
                );
              }
              blockIndex++;
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
