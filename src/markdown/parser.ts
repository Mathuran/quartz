import MarkdownIt from 'markdown-it';
import type { JSONContent } from '@tiptap/core';
import { extractFrontmatter } from './frontmatter';
import type { TokenHandler, ParseContext } from './handlers/types';
import { parseInline } from './handlers/inline';
import {
  headingHandler,
  paragraphHandler,
  bulletListHandler,
  orderedListHandler,
  codeBlockHandler,
  blockquoteHandler,
  horizontalRuleHandler,
  htmlBlockHandler,
  tableHandler,
} from './handlers';

const md = new MarkdownIt('commonmark', {
  html: true,
  linkify: false,
  typographer: false,
});

// Enable GFM strikethrough
md.enable('strikethrough');
// Enable tables
md.enable('table');

/** Ordered list of token handlers -- first match wins */
const handlers: TokenHandler[] = [
  headingHandler,
  paragraphHandler,
  bulletListHandler,
  orderedListHandler,
  codeBlockHandler,
  blockquoteHandler,
  horizontalRuleHandler,
  htmlBlockHandler,
  tableHandler,
];

/** Result of parsing markdown, separating frontmatter from document content */
interface ParseResult {
  doc: JSONContent;
  frontmatter: string | null;
}

/** Maximum recursion depth for nested parseMarkdown calls (e.g. nested <details>) */
const MAX_PARSE_DEPTH = 10;

/** Shared context passed to every handler */
const context: ParseContext = {
  parseInline(tokens: MarkdownIt.Token[]): JSONContent[] {
    return parseInline(tokens);
  },
  parseMarkdown(text: string, depth: number = 0): JSONContent {
    if (depth >= MAX_PARSE_DEPTH) {
      console.warn(
        `parseMarkdown: max recursion depth (${MAX_PARSE_DEPTH}) reached — returning raw text`,
      );
      return {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: text.trim() || '(content too deeply nested)' }],
          },
        ],
      };
    }
    // Internal context always returns just the doc (used by handlers like htmlBlock)
    return parseMarkdownInternal(text, depth).doc;
  },
};

export function parseMarkdown(text: string): ParseResult {
  return parseMarkdownInternal(text, 0);
}

function parseMarkdownInternal(text: string, _depth: number): ParseResult {
  if (!text || !text.trim()) {
    return { doc: { type: 'doc', content: [{ type: 'paragraph' }] }, frontmatter: null };
  }

  const { frontmatter, body } = extractFrontmatter(text);
  const tokens = md.parse(body, {});
  const content: JSONContent[] = [];

  const docContent = tokensToNodes(tokens);
  content.push(...docContent);

  if (content.length === 0) {
    content.push({ type: 'paragraph' });
  }

  return { doc: { type: 'doc', content }, frontmatter };
}

function tokensToNodes(tokens: MarkdownIt.Token[]): JSONContent[] {
  const nodes: JSONContent[] = [];
  let i = 0;

  while (i < tokens.length) {
    try {
      const token = tokens[i];
      const handler = handlers.find((h) => h.canHandle(token));

      if (handler) {
        const result = handler.handle(tokens, i, context);
        nodes.push(...result.nodes);
        i += result.consumed;
      } else {
        // Skip unknown tokens
        i++;
      }
    } catch (err) {
      console.warn('Skipping token due to parse error:', err);
      i++;
    }
  }

  return nodes;
}
