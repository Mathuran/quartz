/**
 * Shared escaping utilities for the markdown serializer.
 *
 * These functions ensure that text containing markdown-significant characters
 * is escaped with backslashes so that re-parsing produces the same document.
 */

/**
 * Escape markdown-significant characters in plain text.
 *
 * Line-start triggers: `#`, `>`, `-`, `+`, `*`, `1.` (ordered list marker)
 * Inline triggers:     `*`, `_`, `` ` ``, `~`, `[`, `]`, `|`, `\`
 *
 * Characters inside code spans or code blocks should NOT be passed through this
 * function — the caller is responsible for that distinction.
 */
export function escapeMarkdown(text: string): string {
  // Process line by line to handle line-start escaping properly
  return text
    .split('\n')
    .map((line) => {
      let result = '';
      let i = 0;

      // Handle line-start triggers
      if (line.length > 0) {
        // `#` at start of line followed by space or end-of-line
        if (/^#{1,6}(?:\s|$)/.test(line)) {
          result += '\\';
        }
        // `>` at start of line (blockquote)
        else if (line[0] === '>') {
          result += '\\';
        }
        // `-` or `+` or `*` at start of line followed by space (unordered list)
        else if (/^[-+*]\s/.test(line)) {
          result += '\\';
        }
        // Ordered list marker: digits followed by `.` or `)` and space
        else if (/^\d+[.)]\s/.test(line)) {
          // Escape the first digit
          result += '\\';
        }
      }

      // Escape inline markdown characters
      for (i = 0; i < line.length; i++) {
        const ch = line[i];
        switch (ch) {
          case '\\':
            result += '\\\\';
            break;
          case '*':
            result += '\\*';
            break;
          case '_':
            result += '\\_';
            break;
          case '`':
            result += '\\`';
            break;
          case '~':
            result += '\\~';
            break;
          case '[':
            result += '\\[';
            break;
          case ']':
            result += '\\]';
            break;
          case '|':
            result += '\\|';
            break;
          default:
            result += ch;
        }
      }

      return result;
    })
    .join('\n');
}

/**
 * Escape `)` in URLs so that the markdown link/image syntax is not broken.
 *
 * `[text](url)` — if `url` contains `)`, we percent-encode it as `%29`.
 */
export function escapeUrl(url: string): string {
  return url.replace(/\)/g, '%29');
}

/**
 * Escape `]` in link text or image alt text to prevent premature closing of
 * the `[...]` portion of a markdown link or image.
 */
function escapeLinkText(text: string): string {
  return text.replace(/\]/g, '\\]');
}

/**
 * Build a markdown image string with proper escaping.
 *
 * Shared by the block-level `image.ts` serializer and the inline image path
 * in `inline.ts`.
 */
export function serializeImage(attrs: { src?: string; alt?: string }): string {
  const src = attrs.src || '';
  const alt = attrs.alt || '';
  return `![${escapeLinkText(alt)}](${escapeUrl(src)})`;
}
