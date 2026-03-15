import type { JSONContent } from '@tiptap/core';
import type { NodeSerializer } from './types';
import { serializeImage } from './utils';

export const imageSerializer: NodeSerializer = {
  nodeTypes: ['image'],
  serialize(node: JSONContent): string {
    return serializeImage({
      src: node.attrs?.src as string | undefined,
      alt: node.attrs?.alt as string | undefined,
    });
  },
};
