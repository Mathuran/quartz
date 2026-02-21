import type { JSONContent } from '@tiptap/core';
import type { NodeSerializer, SerializeContext } from './types';
import { serializeListItemContent } from './listUtils';

export const taskListSerializer: NodeSerializer = {
  nodeTypes: ['taskList'],
  serialize(node: JSONContent, indent: number, context: SerializeContext): string {
    if (!node.content) return '';
    return node.content
      .map((item) => {
        const checked = item.attrs?.checked ? 'x' : ' ';
        const content = serializeListItemContent(item, indent, context);
        return `${' '.repeat(indent)}- [${checked}] ${content}`;
      })
      .join('\n');
  },
};
