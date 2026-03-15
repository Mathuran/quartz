import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface SearchMatch {
  from: number;
  to: number;
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
}

/**
 * Check if a match at the given position is a whole word (bounded by non-word characters).
 */
function isWholeWord(text: string, index: number, length: number): boolean {
  const before = index > 0 ? text[index - 1] : ' ';
  const after = index + length < text.length ? text[index + length] : ' ';
  const wordChar = /\w/;
  return !wordChar.test(before) && !wordChar.test(after);
}

/**
 * Find all text matches in a ProseMirror document.
 * Searches across inline mark boundaries within each text block by
 * concatenating all text nodes in a block and mapping positions back.
 * Returns an array of { from, to } positions sorted by document position.
 */
export function findMatches(
  doc: ProseMirrorNode,
  query: string,
  options: SearchOptions,
): SearchMatch[] {
  if (!query) return [];

  const matches: SearchMatch[] = [];
  const searchText = options.caseSensitive ? query : query.toLowerCase();

  doc.descendants((node, pos) => {
    // Only process block-level nodes that contain inline content
    if (!node.isTextblock) return;

    // Concatenate all text nodes within this block and record position mappings
    let concatenated = '';
    const segments: Array<{ docPos: number; length: number }> = [];

    node.forEach((child, offset) => {
      if (child.isText && child.text) {
        segments.push({ docPos: pos + 1 + offset, length: child.text.length });
        concatenated += child.text;
      }
    });

    if (!concatenated) return false;

    const haystack = options.caseSensitive ? concatenated : concatenated.toLowerCase();
    let index = 0;
    while ((index = haystack.indexOf(searchText, index)) !== -1) {
      if (options.wholeWord && !isWholeWord(haystack, index, searchText.length)) {
        index++;
        continue;
      }

      // Map concatenated offsets back to document positions
      const from = mapConcatOffsetToDocPos(segments, index);
      const to = mapConcatOffsetToDocPos(segments, index + searchText.length);

      matches.push({ from, to });
      index++;
    }

    // Don't descend into text nodes — we've already handled them
    return false;
  });

  return matches;
}

/**
 * Map an offset in the concatenated text back to a document position.
 */
function mapConcatOffsetToDocPos(
  segments: Array<{ docPos: number; length: number }>,
  offset: number,
): number {
  let consumed = 0;
  for (const seg of segments) {
    if (offset <= consumed + seg.length) {
      return seg.docPos + (offset - consumed);
    }
    consumed += seg.length;
  }
  // Past the end — return the end of the last segment
  const last = segments[segments.length - 1];
  return last.docPos + last.length;
}
