import type { JSONContent } from '@tiptap/core';
import type { NodeSerializer, SerializeContext } from './types';

export const headingSerializer: NodeSerializer = {
  nodeTypes: ['heading'],
  serialize(node: JSONContent, _indent: number, context: SerializeContext): string {
    const level = (node.attrs?.level as number) || 1;
    const prefix = '#'.repeat(level);
    const text = node.content ? context.serializeInline(node.content) : '';
    return `${prefix} ${text}`;
  },
};
