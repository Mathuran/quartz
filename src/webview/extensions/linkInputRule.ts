import { Extension, markInputRule } from '@tiptap/core';
import { isValidUrl } from '../utils/urlValidation';

/**
 * Regex for markdown link syntax: [text](url)
 * - \[([^\]]+)\] - Captures the link text (at least one char)
 * - \(([^)]+)\) - Captures the URL (at least one char)
 * - $ - Must be at the end (triggered when closing ) is typed)
 */
const linkRegex = /\[([^\]]+)\]\(([^)]+)\)$/;

/**
 * Extension that adds an input rule for markdown link syntax.
 * When the user types [text](url), it converts it to a proper link.
 */
export const linkInputRuleExtension = Extension.create({
  name: 'markdownLinkInputRule',

  addInputRules() {
    const linkType = this.editor?.schema.marks.link;

    if (!linkType) {
      return [];
    }

    return [
      markInputRule({
        find: linkRegex,
        type: linkType,
        getAttributes: (match) => {
          const href = match[2];
          if (!isValidUrl(href)) {
            return false; // Prevents the rule from applying
          }
          return { href };
        },
      }),
    ];
  },
});
