import type MarkdownIt from 'markdown-it';
import type { JSONContent } from '@tiptap/core';
import type { TokenHandler, ParseContext } from './types';

export const paragraphHandler: TokenHandler = {
  canHandle(token: MarkdownIt.Token): boolean {
    return token.type === 'paragraph_open';
  },

  handle(
    tokens: MarkdownIt.Token[],
    index: number,
    context: ParseContext,
  ): { nodes: JSONContent[]; consumed: number } {
    const inlineToken = tokens[index + 1];
    const inlineContent = inlineToken ? context.parseInline(inlineToken.children || []) : [];

    return {
      nodes: [
        {
          type: 'paragraph',
          content: inlineContent.length > 0 ? inlineContent : undefined,
        },
      ],
      consumed: 3, // paragraph_open, inline, paragraph_close
    };
  },
};
