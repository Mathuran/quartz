import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorState } from '@tiptap/pm/state';
import type { DiffType } from '../diff/types';

interface DiffDecorationConfig {
  /** Map from top-level block index to its diff type. Only non-'unchanged' entries needed. */
  blockDiffMap: Map<number, DiffType>;
}

interface DiffPluginState {
  blockDiffMap: Map<number, DiffType>;
  decorationSet: DecorationSet;
}

const diffDecorationKey = new PluginKey<DiffPluginState>('diffDecoration');

function buildDecorations(
  state: EditorState,
  blockDiffMap: Map<number, DiffType>,
): DecorationSet {
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
}

/**
 * TipTap extension that highlights top-level blocks based on their diff status.
 * Pass `blockDiffMap` mapping block indices to DiffType.
 *
 * Caches the DecorationSet in plugin state and only rebuilds when the
 * blockDiffMap changes (via transaction metadata). For document changes
 * without map changes, the existing DecorationSet is mapped to preserve
 * position accuracy without a full rebuild.
 */
export const DiffDecorationExtension = Extension.create<DiffDecorationConfig>({
  name: 'diffDecoration',

  addOptions() {
    return {
      blockDiffMap: new Map(),
    };
  },

  addProseMirrorPlugins() {
    const initialBlockDiffMap = this.options.blockDiffMap;

    return [
      new Plugin<DiffPluginState>({
        key: diffDecorationKey,
        state: {
          init(_, state): DiffPluginState {
            return {
              blockDiffMap: initialBlockDiffMap,
              decorationSet: buildDecorations(state, initialBlockDiffMap),
            };
          },
          apply(tr, prev, _oldState, newState): DiffPluginState {
            const meta = tr.getMeta(diffDecorationKey) as
              | { blockDiffMap: Map<number, DiffType> }
              | undefined;

            if (meta) {
              // blockDiffMap changed — rebuild decorations
              return {
                blockDiffMap: meta.blockDiffMap,
                decorationSet: buildDecorations(newState, meta.blockDiffMap),
              };
            }

            if (tr.docChanged) {
              // Document changed but map didn't — map existing decorations
              return {
                ...prev,
                decorationSet: prev.decorationSet.map(tr.mapping, tr.doc),
              };
            }

            // Nothing changed
            return prev;
          },
        },
        props: {
          decorations(state) {
            return diffDecorationKey.getState(state)?.decorationSet ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
