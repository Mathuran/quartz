import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const listInputRuleKey = new PluginKey('listInputRule');

/**
 * Extension to handle markdown list markers typed inside existing list items.
 *
 * Problem: When users press Enter in a list and then type "- Item 2" or "2. Second",
 * TipTap's built-in input rules don't trigger (they only create NEW lists from paragraphs).
 * This leaves the list marker as literal text: "- Item 2" instead of "Item 2".
 *
 * Solution: Detect when a list marker is typed at the start of a list item and strip it.
 */
export const listInputRuleExtension = Extension.create({
  name: 'listInputRule',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: listInputRuleKey,
        props: {
          handleTextInput(view, from, to, text) {
            const { state } = view;
            const { $from } = state.selection;

            // Only apply inside list items
            const listItem = $from.node($from.depth);
            const parentOfListItem = $from.depth > 1 ? $from.node($from.depth - 1) : null;

            const isInListItem = listItem?.type.name === 'listItem' ||
                                 listItem?.type.name === 'taskItem' ||
                                 parentOfListItem?.type.name === 'listItem' ||
                                 parentOfListItem?.type.name === 'taskItem';

            if (!isInListItem) {
              return false;
            }

            // Get text content before cursor in current block
            const textBeforeCursor = $from.parent.textContent.slice(0, $from.parentOffset);
            const fullText = textBeforeCursor + text;

            // Check for bullet list marker: "- " at start of text
            const bulletMatch = fullText.match(/^[-*+]\s$/);
            if (bulletMatch) {
              // Delete the marker
              const { tr } = state;
              const startOfBlock = from - textBeforeCursor.length;
              tr.delete(startOfBlock, to);
              // Don't insert the space (which would complete "- ")
              view.dispatch(tr);
              return true;
            }

            // Check for ordered list marker: "1. ", "2. ", etc. at start of text
            const orderedMatch = fullText.match(/^\d+\.\s$/);
            if (orderedMatch) {
              // Delete the marker
              const { tr } = state;
              const startOfBlock = from - textBeforeCursor.length;
              tr.delete(startOfBlock, to);
              view.dispatch(tr);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
