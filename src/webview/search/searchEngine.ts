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
    if (!node.isText || !node.text) return;
    const text = options.caseSensitive ? node.text : node.text.toLowerCase();
    let index = 0;
    while ((index = text.indexOf(searchText, index)) !== -1) {
      if (options.wholeWord && !isWholeWord(node.text!, index, searchText.length)) {
        index++;
        continue;
      }
      matches.push({ from: pos + index, to: pos + index + query.length });
      index++;
    }
  });

  return matches;
}
