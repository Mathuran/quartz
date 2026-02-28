import type { Editor } from '@tiptap/react';

export interface HeadingItem {
  level: number;
  text: string;
  pos: number;
}

/**
 * Extract all headings from the TipTap editor document.
 */
export function extractHeadings(editor: Editor): HeadingItem[] {
  const headings: HeadingItem[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      headings.push({
        level: node.attrs.level as number,
        text: node.textContent,
        pos,
      });
    }
  });

  return headings;
}
