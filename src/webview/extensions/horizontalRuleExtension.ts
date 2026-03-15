import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { InputRule } from '@tiptap/core';

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
 *
 * Uses TipTap's chain() API (not state.tr) so that all mutations happen
 * on the handler-provided transaction, preserving proper undo grouping.
 */

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
        handler: ({ chain, range }) => {
          chain().deleteRange(range).setHorizontalRule().run();
        },
      }),

      // Rule for *** (three asterisks) followed by space
      new InputRule({
        find: /^\*\*\*\s$/,
        handler: ({ chain, range }) => {
          chain().deleteRange(range).setHorizontalRule().run();
        },
      }),

      // Rule for ___ (three underscores) followed by space
      new InputRule({
        find: /^___\s$/,
        handler: ({ chain, range }) => {
          chain().deleteRange(range).setHorizontalRule().run();
        },
      }),
    ];
  },
});
