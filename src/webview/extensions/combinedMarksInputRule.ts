import { Extension } from '@tiptap/core';
import { InputRule } from '@tiptap/pm/inputrules';
import { Mark } from '@tiptap/pm/model';

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
    const schema = this.editor.schema;
    const boldType = schema.marks.bold;
    const italicType = schema.marks.italic;

    if (!boldType || !italicType) {
      return [];
    }

    return [
      // Combined bold+italic with asterisks: ***text***
      new InputRule(boldItalicAsteriskRegex, (state, match, start, end) => {
        const text = match[1];
        const fullMatch = match[0];
        const hasLeadingSpace = fullMatch.startsWith(' ');

        // Calculate the actual start position (skip the leading space if present)
        const textStart = hasLeadingSpace ? start + 1 : start;

        // Create marks
        const marks: Mark[] = [boldType.create(), italicType.create()];

        // Create the transaction
        const tr = state.tr;

        // Delete the original markdown syntax
        tr.delete(textStart, end);

        // Insert the styled text at the deletion point
        tr.insertText(text, textStart);

        // Apply the marks to the inserted text
        tr.addMark(textStart, textStart + text.length, boldType.create());
        tr.addMark(textStart, textStart + text.length, italicType.create());

        return tr;
      }),

      // Combined bold+italic with underscores: ___text___
      new InputRule(boldItalicUnderscoreRegex, (state, match, start, end) => {
        const text = match[1];
        const fullMatch = match[0];
        const hasLeadingSpace = fullMatch.startsWith(' ');

        // Calculate the actual start position (skip the leading space if present)
        const textStart = hasLeadingSpace ? start + 1 : start;

        // Create the transaction
        const tr = state.tr;

        // Delete the original markdown syntax
        tr.delete(textStart, end);

        // Insert the styled text at the deletion point
        tr.insertText(text, textStart);

        // Apply the marks to the inserted text
        tr.addMark(textStart, textStart + text.length, boldType.create());
        tr.addMark(textStart, textStart + text.length, italicType.create());

        return tr;
      }),
    ];
  },
});
