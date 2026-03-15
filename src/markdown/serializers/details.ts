import type { JSONContent } from '@tiptap/core';
import type { NodeSerializer, SerializeContext } from './types';

export const detailsSerializer: NodeSerializer = {
  nodeTypes: ['details'],
  serialize(node: JSONContent, _indent: number, context: SerializeContext): string {
    const summary = node.content?.find((c) => c.type === 'detailsSummary');
    const body = node.content?.find((c) => c.type === 'detailsContent');
    const summaryText = summary?.content ? context.serializeInline(summary.content) : '';
    const bodyContent = body?.content
      ? body.content
          .map((n) => context.serializeNode(n, 0))
          .filter(Boolean)
          .join('\n\n')
      : '';

    if (!bodyContent) {
      return `<details>\n<summary>${summaryText}</summary>\n</details>`;
    }

    return `<details>\n<summary>${summaryText}</summary>\n\n${bodyContent}\n\n</details>`;
  },
};
