import type { JSONContent } from '@tiptap/core';
import type { NodeSerializer, SerializeContext } from './types';
import { serializeListItemContent } from './listUtils';

export const orderedListSerializer: NodeSerializer = {
  nodeTypes: ['orderedList'],
  serialize(node: JSONContent, indent: number, context: SerializeContext): string {
    if (!node.content) return '';
    const start = (node.attrs?.start as number) || 1;
    return node.content
      .map((item, i) => {
        const content = serializeListItemContent(item, indent, context);
        return `${' '.repeat(indent)}${start + i}. ${content}`;
      })
      .join('\n');
  },
};
