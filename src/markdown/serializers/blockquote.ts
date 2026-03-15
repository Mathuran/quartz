import type { JSONContent } from '@tiptap/core';
import type { NodeSerializer, SerializeContext } from './types';

export const blockquoteSerializer: NodeSerializer = {
  nodeTypes: ['blockquote'],
  serialize(node: JSONContent, _indent: number, context: SerializeContext): string {
    if (!node.content) return '>';
    const inner = node.content
      .map((child) => context.serializeNode(child, 0))
      .filter((s): s is string => s !== null)
      .join('\n\n');
    return inner
      .split('\n')
      .map((line) => (line ? `> ${line}` : '>'))
      .join('\n');
  },
};
