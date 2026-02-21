import type { JSONContent } from '@tiptap/core';
import type { NodeSerializer } from './types';

export const imageSerializer: NodeSerializer = {
  nodeTypes: ['image'],
  serialize(node: JSONContent): string {
    const src = (node.attrs?.src as string) || '';
    const alt = (node.attrs?.alt as string) || '';
    return `![${alt}](${src})`;
  },
};
