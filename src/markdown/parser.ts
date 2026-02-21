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

/** Shared context passed to every handler */
const context: ParseContext = {
  parseInline(tokens: MarkdownIt.Token[]): JSONContent[] {
    return parseInline(tokens);
  },
  parseMarkdown(text: string): JSONContent {
    return parseMarkdown(text);
  },
};

export function parseMarkdown(text: string): JSONContent {
  if (!text || !text.trim()) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }

  const { frontmatter, body } = extractFrontmatter(text);
  const tokens = md.parse(body, {});
  const content: JSONContent[] = [];

  if (frontmatter !== null) {
    content.push({
      type: 'codeBlock',
      attrs: { language: 'yaml' },
      content: [{ type: 'text', text: frontmatter }],
    });
  }

  const docContent = tokensToNodes(tokens);
  content.push(...docContent);

  if (content.length === 0) {
    content.push({ type: 'paragraph' });
  }

  return { type: 'doc', content };
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
