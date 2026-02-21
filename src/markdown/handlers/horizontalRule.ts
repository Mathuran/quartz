import type MarkdownIt from 'markdown-it';
import type { JSONContent } from '@tiptap/core';
import type { TokenHandler, ParseContext } from './types';

export const horizontalRuleHandler: TokenHandler = {
  canHandle(token: MarkdownIt.Token): boolean {
    return token.type === 'hr';
  },

  handle(
    _tokens: MarkdownIt.Token[],
    _index: number,
    _context: ParseContext,
  ): { nodes: JSONContent[]; consumed: number } {
    return {
      nodes: [{ type: 'horizontalRule' }],
      consumed: 1,
    };
  },
};
