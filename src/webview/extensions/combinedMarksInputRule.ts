import { Extension, InputRule } from '@tiptap/core';

/**
 * Regex for combined bold+italic with asterisks: ***text***
 * - (?:^|\s) - Start of line or whitespace (non-capturing group)
 * - \*\*\* - Three asterisks to open
 * - ([^*]+) - Capture the text content (one or more non-asterisk characters)
 * - \*\*\*$ - Three asterisks at the end
 */
const boldItalicAsteriskRegex = /(?:^|\s)\*\*\*([^*]+)\*\*\*$/;

/**
 * Regex for combined bold+italic with underscores: ___text___
 */
const boldItalicUnderscoreRegex = /(?:^|\s)___([^_]+)___$/;

/**
 * Extension that adds input rules for combined bold+italic syntax.
 * When the user types ***text*** or ___text___, it applies both bold and italic marks.
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
        handler: ({ state, range, match, chain }) => {
          const text = match[1];
          const fullMatch = match[0];
          const hasLeadingSpace = fullMatch.startsWith(' ');

          const boldMark = state.schema.marks.bold?.create();
          const italicMark = state.schema.marks.italic?.create();

          if (!boldMark || !italicMark) {
            chain().deleteRange(range).insertContent(text).run();
            return;
          }

          // Build the replacement content
          const content = hasLeadingSpace
            ? [' ', { type: 'text', text, marks: [{ type: 'bold' }, { type: 'italic' }] }]
            : [{ type: 'text', text, marks: [{ type: 'bold' }, { type: 'italic' }] }];

          chain().deleteRange(range).insertContent(content).run();
        },
      }),

      // Combined bold+italic with underscores: ___text___
      new InputRule({
        find: boldItalicUnderscoreRegex,
        handler: ({ state, range, match, chain }) => {
          const text = match[1];
          const fullMatch = match[0];
          const hasLeadingSpace = fullMatch.startsWith(' ');

          const boldMark = state.schema.marks.bold?.create();
          const italicMark = state.schema.marks.italic?.create();

          if (!boldMark || !italicMark) {
            chain().deleteRange(range).insertContent(text).run();
            return;
          }

          // Build the replacement content
          const content = hasLeadingSpace
            ? [' ', { type: 'text', text, marks: [{ type: 'bold' }, { type: 'italic' }] }]
            : [{ type: 'text', text, marks: [{ type: 'bold' }, { type: 'italic' }] }];

          chain().deleteRange(range).insertContent(content).run();
        },
      }),
    ];
  },
});
