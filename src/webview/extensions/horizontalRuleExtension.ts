import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { InputRule } from '@tiptap/pm/inputrules';
import { TextSelection } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
import type { Transaction } from '@tiptap/pm/state';

/**
 * Custom HorizontalRule extension with improved input rules.
 *
 * The default TipTap HorizontalRule extension has input rules that require
 * trailing spaces for `___` and `***` patterns. This extension fixes that
 * by adding input rules that trigger when typing a space after:
 * - `---` (three hyphens)
 * - `***` (three asterisks)
 * - `___` (three underscores)
 *
 * The rules require the pattern to be at the start of a line to avoid
 * conflicts with other markdown syntax (like bold/italic).
 */

/**
 * Common handler for inserting a horizontal rule and setting up cursor position.
 */
function insertHorizontalRule(state: EditorState, tr: Transaction, range: { from: number; to: number }) {
  // Delete the typed text
  tr.delete(range.from, range.to);

  // Insert the horizontal rule
  const hrNode = state.schema.nodes.horizontalRule.create();
  tr.replaceWith(range.from, range.from, hrNode);

  // Add a paragraph after if needed and set cursor there
  const posAfter = range.from + 1;
  const nodeAfter = tr.doc.nodeAt(posAfter);

  if (!nodeAfter) {
    // Add a paragraph node after the HR
    const paragraphNode = state.schema.nodes.paragraph.create();
    tr.insert(posAfter, paragraphNode);
    tr.setSelection(TextSelection.create(tr.doc, posAfter + 1));
  } else if (nodeAfter.isTextblock) {
    tr.setSelection(TextSelection.create(tr.doc, posAfter + 1));
  } else {
    tr.setSelection(TextSelection.create(tr.doc, posAfter));
  }

  tr.scrollIntoView();
}

export const CustomHorizontalRule = HorizontalRule.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: 'quartz-hr',
      },
    };
  },

  addInputRules() {
    return [
      // Rule for --- (three hyphens) followed by space
      new InputRule({
        find: /^---\s$/,
        handler: ({ state, range }) => {
          insertHorizontalRule(state, state.tr, range);
        },
      }),

      // Rule for *** (three asterisks) followed by space
      new InputRule({
        find: /^\*\*\*\s$/,
        handler: ({ state, range }) => {
          insertHorizontalRule(state, state.tr, range);
        },
      }),

      // Rule for ___ (three underscores) followed by space
      new InputRule({
        find: /^___\s$/,
        handler: ({ state, range }) => {
          insertHorizontalRule(state, state.tr, range);
        },
      }),
    ];
  },
});
