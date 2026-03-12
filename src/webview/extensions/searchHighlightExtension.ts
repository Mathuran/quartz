import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { SearchMatch } from '../search/searchEngine';

export interface SearchHighlightState {
  matches: SearchMatch[];
  currentIndex: number;
}

export const searchHighlightKey = new PluginKey<SearchHighlightState>('searchHighlight');

/**
 * TipTap extension that manages search match highlight decorations.
 * State is updated externally via transactions with searchHighlightKey metadata.
 */
export const SearchHighlightExtension = Extension.create({
  name: 'searchHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchHighlightState>({
        key: searchHighlightKey,
        state: {
          init(): SearchHighlightState {
            return { matches: [], currentIndex: -1 };
          },
          apply(tr, prev): SearchHighlightState {
            const meta = tr.getMeta(searchHighlightKey);
            if (meta) return meta;
            return prev;
          },
        },
        props: {
          decorations(state) {
            const pluginState = searchHighlightKey.getState(state);
            if (!pluginState || pluginState.matches.length === 0) {
              return DecorationSet.empty;
            }

            const { matches, currentIndex } = pluginState;
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
          },
        },
      }),
    ];
  },
});
