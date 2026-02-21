import type MarkdownIt from 'markdown-it';
import type { JSONContent } from '@tiptap/core';
import type { TokenHandler, ParseContext } from './types';

export const codeBlockHandler: TokenHandler = {
  canHandle(token: MarkdownIt.Token): boolean {
    return token.type === 'code_block' || token.type === 'fence';
  },

  handle(
    tokens: MarkdownIt.Token[],
    index: number,
    _context: ParseContext,
  ): { nodes: JSONContent[]; consumed: number } {
    const token = tokens[index];
    const language = token.info ? token.info.trim().split(/\s+/)[0] : null;
    const text = token.content.replace(/\n$/, '');

    return {
      nodes: [
        {
          type: 'codeBlock',
          attrs: language ? { language } : undefined,
          content: text ? [{ type: 'text', text }] : undefined,
        },
      ],
      consumed: 1,
    };
  },
};
