import type { JSONContent } from '@tiptap/core';

/**
 * Serialize an array of inline nodes (text, hardBreak, image) into a markdown string.
 */
export function serializeInline(nodes: JSONContent[]): string {
  return nodes.map(serializeInlineNode).join('');
}

function serializeInlineNode(node: JSONContent): string {
  if (node.type === 'text') {
    let text = node.text || '';
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
    const src = (node.attrs?.src as string) || '';
    const alt = (node.attrs?.alt as string) || '';
    return `![${alt}](${src})`;
  }

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
    case 'code':
      return `\`${text}\``;
    case 'link': {
      const href = (mark.attrs?.href as string) || '';
      return `[${text}](${href})`;
    }
    case 'highlight':
      return `==${text}==`;
    default:
      return text;
  }
}
