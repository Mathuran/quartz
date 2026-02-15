import { Extension } from '@tiptap/core';
import { InputRule } from '@tiptap/pm/inputrules';

/**
 * Regex for combined bold+italic with asterisks: ***text***
 * - (?:^|\s) - Start of line or whitespace (non-capturing group)
 * - \*\*\* - Three asterisks to open
 * - ([^*]+) - Capture the text content (one or more non-asterisk characters)
 * - \*\*\*$ - Three asterisks at the end
 *
 * This regex must be checked BEFORE the individual ** and * rules,
 * otherwise those will consume part of the *** pattern.
 */
const boldItalicAsteriskRegex = /(?:^|\s)\*\*\*([^*]+)\*\*\*$/;

/**
 * Regex for combined bold+italic with underscores: ___text___
 * Same pattern as asterisks but using underscores.
 */
const boldItalicUnderscoreRegex = /(?:^|\s)___([^_]+)___$/;

/**
 * Extension that adds input rules for combined bold+italic syntax.
 * When the user types ***text*** or ___text___, it applies both bold and italic marks.
 *
 * IMPORTANT: This extension must be loaded BEFORE the individual Bold and Italic
 * extensions so that its input rules are processed first. The order of extensions
 * in the array determines the order of input rule processing.
 */
export const combinedMarksInputRuleExtension = Extension.create({
  name: 'combinedMarksInputRule',

  // Set high priority to ensure these rules run before Bold/Italic
  priority: 200,

  addInputRules() {
    return [
      // Combined bold+italic with asterisks: ***text***
      new InputRule({
        find: boldItalicAsteriskRegex,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const text = match[1];

          // Get the bold and italic marks from the schema
          const boldMark = state.schema.marks.bold?.create();
          const italicMark = state.schema.marks.italic?.create();

          if (!boldMark || !italicMark) {
            // If marks aren't available, just insert plain text
            tr.delete(range.from, range.to);
            tr.insertText(text, range.from);
            return;
          }

          // Check if we need to preserve a leading space
          const fullMatch = match[0];
          const hasLeadingSpace = fullMatch.startsWith(' ');

          tr.delete(range.from, range.to);

          // Insert leading space if needed
          if (hasLeadingSpace) {
            tr.insertText(' ', range.from);
            const textNode = state.schema.text(text, [boldMark, italicMark]);
            tr.insert(range.from + 1, textNode);
          } else {
            const textNode = state.schema.text(text, [boldMark, italicMark]);
            tr.insert(range.from, textNode);
          }
        },
      }),

      // Combined bold+italic with underscores: ___text___
      new InputRule({
        find: boldItalicUnderscoreRegex,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const text = match[1];

          // Get the bold and italic marks from the schema
          const boldMark = state.schema.marks.bold?.create();
          const italicMark = state.schema.marks.italic?.create();

          if (!boldMark || !italicMark) {
            // If marks aren't available, just insert plain text
            tr.delete(range.from, range.to);
            tr.insertText(text, range.from);
            return;
          }

          // Check if we need to preserve a leading space
          const fullMatch = match[0];
          const hasLeadingSpace = fullMatch.startsWith(' ');

          tr.delete(range.from, range.to);

          // Insert leading space if needed
          if (hasLeadingSpace) {
            tr.insertText(' ', range.from);
            const textNode = state.schema.text(text, [boldMark, italicMark]);
            tr.insert(range.from + 1, textNode);
          } else {
            const textNode = state.schema.text(text, [boldMark, italicMark]);
            tr.insert(range.from, textNode);
          }
        },
      }),
    ];
  },
});
