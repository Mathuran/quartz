import type { JSONContent } from '@tiptap/core';
import type { NodeSerializer, SerializeContext } from './types';

export const detailsSerializer: NodeSerializer = {
  nodeTypes: ['details'],
  serialize(node: JSONContent, _indent: number, context: SerializeContext): string {
    const summary = node.content?.[0];
    const body = node.content?.[1];
    const summaryText = summary?.content ? context.serializeInline(summary.content) : '';
    const bodyContent = body?.content
      ? body.content
          .map((n) => context.serializeNode(n, 0))
          .filter(Boolean)
          .join('\n\n')
      : '';
    return `<details>\n<summary>${summaryText}</summary>\n\n${bodyContent}\n\n</details>`;
  },
};
