import type { JSONContent } from '@tiptap/core';
import type { NodeSerializer, SerializeContext } from './types';
import { serializeListItemContent } from './listUtils';

export const bulletListSerializer: NodeSerializer = {
  nodeTypes: ['bulletList'],
  serialize(node: JSONContent, indent: number, context: SerializeContext): string {
    if (!node.content) return '';
    return node.content
      .map((item) => {
        const content = serializeListItemContent(item, indent, context, 'bulletList');
        return `${' '.repeat(indent)}- ${content}`;
      })
      .join('\n');
  },
};
