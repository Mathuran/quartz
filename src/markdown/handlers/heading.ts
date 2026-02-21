import type MarkdownIt from 'markdown-it';
import type { JSONContent } from '@tiptap/core';
import type { TokenHandler, ParseContext } from './types';

export const headingHandler: TokenHandler = {
  canHandle(token: MarkdownIt.Token): boolean {
    return token.type === 'heading_open';
  },

  handle(
    tokens: MarkdownIt.Token[],
    index: number,
    context: ParseContext,
  ): { nodes: JSONContent[]; consumed: number } {
    const token = tokens[index];
    const level = parseInt(token.tag.slice(1), 10);
    const inlineToken = tokens[index + 1];
    const content = inlineToken ? context.parseInline(inlineToken.children || []) : [];

    return {
      nodes: [
        {
          type: 'heading',
          attrs: { level },
          content: content.length > 0 ? content : undefined,
        },
      ],
      consumed: 3, // heading_open, inline, heading_close
    };
  },
};
