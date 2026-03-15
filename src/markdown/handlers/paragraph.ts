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
    const inlineToken = index + 1 < tokens.length ? tokens[index + 1] : undefined;
    const inlineContent = inlineToken ? context.parseInline(inlineToken.children || []) : [];

    // Consume up to 3 tokens (paragraph_open, inline, paragraph_close), but don't go past end
    const consumed = Math.min(3, tokens.length - index);

    return {
      nodes: [
        {
          type: 'paragraph',
          content: inlineContent.length > 0 ? inlineContent : undefined,
        },
      ],
      consumed,
    };
  },
};
