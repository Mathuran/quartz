import type { JSONContent } from '@tiptap/core';
import type { NodeSerializer } from './types';

export const horizontalRuleSerializer: NodeSerializer = {
  nodeTypes: ['horizontalRule'],
  serialize(_node: JSONContent): string {
    return '---';
  },
};
