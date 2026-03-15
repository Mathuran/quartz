import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorState } from '@tiptap/pm/state';
import type { SearchMatch } from '../search/searchEngine';

export interface SearchHighlightState {
  matches: SearchMatch[];
  currentIndex: number;
}

interface SearchPluginState {
  highlightState: SearchHighlightState;
  decorationSet: DecorationSet;
}

export const searchHighlightKey = new PluginKey<SearchPluginState>('searchHighlight');

function buildDecorations(
  state: EditorState,
  highlightState: SearchHighlightState,
): DecorationSet {
  if (highlightState.matches.length === 0) {
    return DecorationSet.empty;
  }

  const { matches, currentIndex } = highlightState;
  const decorations: Decoration[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const isCurrent = i === currentIndex;
    decorations.push(
      Decoration.inline(match.from, match.to, {
        class: isCurrent ? 'quartz-search-match-current' : 'quartz-search-match',
      }),
    );
  }

  return DecorationSet.create(state.doc, decorations);
}

/**
 * TipTap extension that manages search match highlight decorations.
 * State is updated externally via transactions with searchHighlightKey metadata.
 *
 * Caches the DecorationSet in plugin state and only rebuilds when matches
 * change (via metadata). For document changes without match updates, the
 * existing DecorationSet is mapped to preserve position accuracy.
 */
export const SearchHighlightExtension = Extension.create({
  name: 'searchHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchPluginState>({
        key: searchHighlightKey,
        state: {
          init(): SearchPluginState {
            return {
              highlightState: { matches: [], currentIndex: -1 },
              decorationSet: DecorationSet.empty,
            };
          },
          apply(tr, prev, _oldState, newState): SearchPluginState {
            const meta = tr.getMeta(searchHighlightKey) as SearchHighlightState | undefined;

            if (meta) {
              // Matches changed — rebuild decorations
              return {
                highlightState: meta,
                decorationSet: buildDecorations(newState, meta),
              };
            }

            if (tr.docChanged) {
              // Document changed but matches didn't — map existing decorations
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
            return searchHighlightKey.getState(state)?.decorationSet ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
