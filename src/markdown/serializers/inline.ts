import type { JSONContent } from '@tiptap/core';
import { escapeMarkdown, escapeUrl, serializeImage } from './utils';

/**
 * Serialize an array of inline nodes (text, hardBreak, image) into a markdown string.
 */
export function serializeInline(nodes: JSONContent[]): string {
  return nodes.map(serializeInlineNode).join('');
}

function serializeInlineNode(node: JSONContent): string {
  if (node.type === 'text') {
    let text = node.text || '';
    // Determine whether a `code` mark is present — if so, skip markdown escaping
    const hasCodeMark = node.marks?.some((m) => m.type === 'code') ?? false;
    if (!hasCodeMark) {
      text = escapeMarkdown(text);
    }
    if (node.marks) {
      // Apply marks from innermost to outermost
      for (const mark of [...node.marks].reverse()) {
        text = applyMark(text, mark);
      }
    }
    return text;
  }

  if (node.type === 'hardBreak') {
    return '  \n';
  }

  if (node.type === 'image') {
    return serializeImage({
      src: node.attrs?.src as string | undefined,
      alt: node.attrs?.alt as string | undefined,
    });
  }

  console.debug('[Quartz] Unknown inline node type:', node.type);
  return '';
}

function applyMark(text: string, mark: { type: string; attrs?: Record<string, unknown> }): string {
  switch (mark.type) {
    case 'bold':
      return `**${text}**`;
    case 'italic':
      return `*${text}*`;
    case 'strike':
      return `~~${text}~~`;
    case 'code': {
      // If the content contains a single backtick, wrap with double backticks + space
      if (text.includes('`')) {
        return `\`\` ${text} \`\``;
      }
      return `\`${text}\``;
    }
    case 'link': {
      const href = (mark.attrs?.href as string) || '';
      // Note: ] in link text is already escaped by escapeMarkdown before applyMark is called
      return `[${text}](${escapeUrl(href)})`;
    }
    case 'highlight':
      return `==${text}==`;
    default:
      return text;
  }
}
