import type { JSONContent } from '@tiptap/core';
import type { SerializeContext } from './types';

/**
 * Serialize the content of a list item (shared by bullet, ordered, and task lists).
 * Handles paragraphs and nested lists within list items.
 */
export function serializeListItemContent(
  item: JSONContent,
  indent: number,
  context: SerializeContext,
): string {
  if (!item.content) return '';
  const parts: string[] = [];

  for (let i = 0; i < item.content.length; i++) {
    const child = item.content[i];
    if (child.type === 'paragraph') {
      parts.push(child.content ? context.serializeInline(child.content) : '');
    } else if (child.type === 'bulletList') {
      parts.push('\n' + context.serializeNode(child, indent + 2));
    } else if (child.type === 'orderedList') {
      parts.push('\n' + context.serializeNode(child, indent + 2));
    } else if (child.type === 'taskList') {
      parts.push('\n' + context.serializeNode(child, indent + 2));
    }
  }

  return parts.join('');
}
