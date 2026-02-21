import type { JSONContent } from '@tiptap/core';
import type { NodeSerializer } from './types';

export const codeBlockSerializer: NodeSerializer = {
  nodeTypes: ['codeBlock'],
  serialize(node: JSONContent): string {
    const language = (node.attrs?.language as string) || '';
    const text = node.content ? node.content.map((n) => n.text || '').join('') : '';
    return `\`\`\`${language}\n${text}\n\`\`\``;
  },
};
