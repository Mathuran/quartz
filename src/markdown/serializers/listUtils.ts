import type { JSONContent } from '@tiptap/core';
import type { SerializeContext } from './types';

/**
 * Compute the marker width for a given list type.
 * Nested content must be indented to align with the text after the marker
 * so that markdown-it parses it as belonging to the parent item.
 *
 * - bullet list (`- `):      2
 * - task list  (`- [ ] `):   2  (markdown-it marker is `- `, not `- [ ] `)
 * - ordered list (`1. `):    digits + 2  (e.g. `1. ` = 3, `10. ` = 4)
 */
function nestIndentWidth(parentListType: string, markerNumber?: number): number {
  if (parentListType === 'orderedList') {
    const digits = markerNumber !== undefined ? String(markerNumber).length : 1;
    return digits + 2; // e.g. "1. " = 3, "10. " = 4
  }
  if (parentListType === 'taskList') {
    // markdown-it treats `- ` as the marker (width 2) for task items,
    // with `[ ] ` being part of the content, not the marker.
    // Using 6 here would push nested items 4+ spaces past content start,
    // triggering the indented-code-block rule and breaking roundtrip.
    return 2;
  }
  // bulletList
  return 2; // "- " = 2
}

/**
 * Serialize the content of a list item (shared by bullet, ordered, and task lists).
 * Handles paragraphs, nested lists, and other block-level children.
 *
 * @param item        The listItem / taskItem node
 * @param indent      Current indentation level (number of spaces)
 * @param context     Serialization context
 * @param parentType  The parent list type ('bulletList' | 'orderedList' | 'taskList')
 * @param markerNum   For ordered lists, the 1-based number of this item (used to compute indent width)
 */
export function serializeListItemContent(
  item: JSONContent,
  indent: number,
  context: SerializeContext,
  parentType?: string,
  markerNum?: number,
): string {
  if (!item.content) return '';
  const parts: string[] = [];

  const childIndent = indent + nestIndentWidth(parentType || 'bulletList', markerNum);

  for (let i = 0; i < item.content.length; i++) {
    const child = item.content[i];
    if (child.type === 'paragraph') {
      parts.push(child.content ? context.serializeInline(child.content) : '');
    } else if (
      child.type === 'bulletList' ||
      child.type === 'orderedList' ||
      child.type === 'taskList'
    ) {
      parts.push('\n' + context.serializeNode(child, childIndent));
    } else {
      // Fallback: delegate any unrecognized block child (blockquote, codeBlock, image, etc.)
      const serialized = context.serializeNode(child, childIndent);
      if (serialized !== null) {
        parts.push('\n' + serialized);
      }
    }
  }

  return parts.join('');
}
