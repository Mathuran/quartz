import { Extension } from '@tiptap/core';
import { InputRule } from '@tiptap/pm/inputrules';

/**
 * Validates a URL to ensure it's safe to use as a link href.
 * Blocks javascript: protocol to prevent XSS attacks.
 */
function isValidUrl(url: string): boolean {
  const trimmedUrl = url.trim().toLowerCase();

  // Block javascript: protocol
  if (trimmedUrl.startsWith('javascript:')) {
    return false;
  }

  // Block data: URLs that could contain scripts
  if (trimmedUrl.startsWith('data:') && !trimmedUrl.startsWith('data:image/')) {
    return false;
  }

  // Block vbscript: protocol
  if (trimmedUrl.startsWith('vbscript:')) {
    return false;
  }

  return true;
}

/**
 * Regex for markdown link syntax: [text](url)
 * - (?<!\\) - Negative lookbehind to ensure the opening bracket is not escaped
 * - \[([^\]]*)\] - Captures the link text (can be empty)
 * - \(([^)]*)\) - Captures the URL (can be empty)
 * - $ - Must be at the end (triggered when closing ) is typed)
 */
const linkRegex = /(?<!\\)\[([^\]]*)\]\(([^)]*)\)$/;

/**
 * Extension that adds an input rule for markdown link syntax.
 * When the user types [text](url), it converts it to a proper link.
 */
export const linkInputRuleExtension = Extension.create({
  name: 'markdownLinkInputRule',

  addInputRules() {
    return [
      new InputRule({
        find: linkRegex,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const linkText = match[1];
          const href = match[2];

          // Handle empty link text - use URL as display text
          const displayText = linkText || href;

          // Handle empty URL - just insert the text without a link
          if (!href) {
            tr.delete(range.from, range.to);
            if (displayText) {
              tr.insertText(displayText, range.from);
            }
            return;
          }

          // Validate URL for security
          if (!isValidUrl(href)) {
            // Invalid URL - don't create link, just insert plain text
            tr.delete(range.from, range.to);
            tr.insertText(displayText || href, range.from);
            return;
          }

          // Delete the markdown syntax
          tr.delete(range.from, range.to);

          // If we have text to display, insert it with the link mark
          if (displayText) {
            const linkMark = state.schema.marks.link?.create({ href });
            if (linkMark) {
              const textNode = state.schema.text(displayText, [linkMark]);
              tr.insert(range.from, textNode);
            } else {
              // Fallback if link mark is not available
              tr.insertText(displayText, range.from);
            }
          }
        },
      }),
    ];
  },
});
