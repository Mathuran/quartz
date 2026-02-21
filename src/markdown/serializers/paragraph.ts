import type { JSONContent } from '@tiptap/core';
import type { NodeSerializer, SerializeContext } from './types';

export const paragraphSerializer: NodeSerializer = {
  nodeTypes: ['paragraph'],
  serialize(node: JSONContent, _indent: number, context: SerializeContext): string {
    if (!node.content || node.content.length === 0) return '';
    return context.serializeInline(node.content);
  },
};
