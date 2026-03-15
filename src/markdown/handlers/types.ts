import type { JSONContent } from '@tiptap/core';
import type MarkdownIt from 'markdown-it';

export interface ParseContext {
  /** Parse inline tokens (bold, italic, code, links, images, etc.) into JSONContent nodes */
  parseInline(tokens: MarkdownIt.Token[]): JSONContent[];
  /** Recursively parse markdown text into a full document (used by html_block/details).
   *  @param depth - Current recursion depth for nested parsing (defaults to 0) */
  parseMarkdown(text: string, depth?: number): JSONContent;
}

export interface TokenHandler {
  /** Return true if this handler can process the given token */
  canHandle(token: MarkdownIt.Token): boolean;
  /** Process tokens starting at the given index, returning produced nodes and how many tokens were consumed */
  handle(
    tokens: MarkdownIt.Token[],
    index: number,
    context: ParseContext,
  ): { nodes: JSONContent[]; consumed: number };
}
