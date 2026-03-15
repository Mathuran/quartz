import type { JSONContent } from '@tiptap/core';
import type { NodeSerializer, SerializeContext } from './types';

export const calloutSerializer: NodeSerializer = {
  nodeTypes: ['callout'],
  serialize(node: JSONContent, _indent: number, context: SerializeContext): string {
    const attrs = node.attrs || {};
    const calloutType = (attrs.calloutType || 'note') as string;
    const title = (attrs.title || '') as string;
    const collapsed = attrs.collapsed as boolean;
    const foldable = attrs.foldable as boolean;

    // Build the marker line: [!type] + optional +/- + optional title
    let marker = `[!${calloutType.toLowerCase()}]`;
    if (foldable) {
      marker += collapsed ? '-' : '+';
    }
    if (title) {
      marker += ` ${title}`;
    }

    // Check if there's real content (not just a default empty paragraph)
    const hasRealContent =
      node.content &&
      node.content.length > 0 &&
      (node.content.length > 1 || node.content[0].content);

    if (!hasRealContent) {
      return `> ${marker}`;
    }

    // Serialize child content the same way blockquote does
    const inner = node
      .content!.map((child) => context.serializeNode(child, 0))
      .filter((s): s is string => s !== null)
      .join('\n\n');

    // Prefix every line with `> ` (or bare `>` for empty lines)
    const contentLines = inner
      .split('\n')
      .map((line) => (line ? `> ${line}` : '>'))
      .join('\n');

    return `> ${marker}\n${contentLines}`;
  },
};
