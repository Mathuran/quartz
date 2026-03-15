import type MarkdownIt from 'markdown-it';
import type { JSONContent } from '@tiptap/core';
import type { TokenHandler, ParseContext } from './types';
import { parseListItems, isTaskItem, convertToTaskItem } from './list';
import { detectCallout } from './callout';
import { codeBlockHandler } from './codeBlock';
import { horizontalRuleHandler } from './horizontalRule';
import { headingHandler } from './heading';
import { htmlBlockHandler } from './htmlBlock';
import { tableHandler } from './table';

export const blockquoteHandler: TokenHandler = {
  canHandle(token: MarkdownIt.Token): boolean {
    return token.type === 'blockquote_open';
  },

  handle(
    tokens: MarkdownIt.Token[],
    index: number,
    context: ParseContext,
  ): { nodes: JSONContent[]; consumed: number } {
    const blockquoteContent = parseBlockquote(tokens, index + 1, context);
    const nodes = blockquoteContent.nodes;
    const consumed = blockquoteContent.endIndex - index + 1;

    // Check if the first child is a callout marker paragraph
    if (nodes.length > 0 && nodes[0].type === 'paragraph') {
      const detection = detectCallout(nodes[0]);
      if (detection) {
        const { match, remainingContent } = detection;
        // Build callout content:
        // If the marker paragraph had remaining inline content (softbreak case),
        // create a new paragraph from it and prepend to the rest
        const calloutContent: JSONContent[] = [];

        if (remainingContent) {
          calloutContent.push({
            type: 'paragraph',
            content: remainingContent,
          });
        }
        // Add all nodes after the first (marker) paragraph
        calloutContent.push(...nodes.slice(1));

        return {
          nodes: [
            {
              type: 'callout',
              attrs: {
                calloutType: match.calloutType,
                title: match.title,
                collapsed: match.collapsed,
                foldable: match.foldable,
              },
              content: calloutContent.length > 0 ? calloutContent : [{ type: 'paragraph' }],
            },
          ],
          consumed,
        };
      }
    }

    return {
      nodes: [
        {
          type: 'blockquote',
          content: nodes,
        },
      ],
      consumed,
    };
  },
};

function parseBlockquote(
  tokens: MarkdownIt.Token[],
  startIndex: number,
  context: ParseContext,
): { nodes: JSONContent[]; endIndex: number } {
  const nodes: JSONContent[] = [];
  let i = startIndex;
  let depth = 1;
  let safetyLimit = 10000;

  while (i < tokens.length && safetyLimit-- > 0) {
    const token = tokens[i];

    if (token.type === 'blockquote_close') {
      depth--;
      if (depth === 0) {
        return { nodes, endIndex: i };
      }
      i++;
      continue;
    }

    // Handle nested blockquote BEFORE incrementing depth
    if (token.type === 'blockquote_open' && depth === 1) {
      const nested = parseBlockquote(tokens, i + 1, context);
      nodes.push({
        type: 'blockquote',
        content: nested.nodes.length > 0 ? nested.nodes : [{ type: 'paragraph' }],
      });
      i = nested.endIndex + 1;
      continue;
    }

    if (token.type === 'blockquote_open') {
      depth++;
      i++;
      continue;
    }

    if (depth === 1) {
      if (token.type === 'paragraph_open') {
        if (i + 1 >= tokens.length) {
          i++;
          continue;
        }
        const inlineToken = tokens[i + 1];
        const inlineContent = inlineToken ? context.parseInline(inlineToken.children || []) : [];
        nodes.push({
          type: 'paragraph',
          content: inlineContent.length > 0 ? inlineContent : undefined,
        });
        i += 3;
      } else if (token.type === 'bullet_list_open') {
        const listItems = parseListItems(tokens, i + 1, 'bullet_list_close', context);
        const isTask = listItems.items.some((item) => isTaskItem(item));
        if (isTask) {
          nodes.push({
            type: 'taskList',
            content: listItems.items.map((item) => convertToTaskItem(item)),
          });
        } else {
          nodes.push({
            type: 'bulletList',
            content: listItems.items,
          });
        }
        i = listItems.endIndex + 1;
      } else if (token.type === 'ordered_list_open') {
        const attrs: Record<string, unknown> = {};
        if (token.attrGet('start')) {
          attrs.start = parseInt(token.attrGet('start')!, 10);
        }
        const listItems = parseListItems(tokens, i + 1, 'ordered_list_close', context);
        nodes.push({
          type: 'orderedList',
          attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
          content: listItems.items,
        });
        i = listItems.endIndex + 1;
      } else if (token.type === 'fence' || token.type === 'code_block') {
        // Delegate to the code block handler
        const result = codeBlockHandler.handle(tokens, i, context);
        nodes.push(...result.nodes);
        i += result.consumed;
      } else if (token.type === 'hr') {
        // Delegate to the horizontal rule handler
        const result = horizontalRuleHandler.handle(tokens, i, context);
        nodes.push(...result.nodes);
        i += result.consumed;
      } else if (token.type === 'heading_open') {
        // Delegate to the heading handler
        const result = headingHandler.handle(tokens, i, context);
        nodes.push(...result.nodes);
        i += result.consumed;
      } else if (token.type === 'html_block') {
        // Delegate to the HTML block handler
        const result = htmlBlockHandler.handle(tokens, i, context);
        nodes.push(...result.nodes);
        i += result.consumed;
      } else if (token.type === 'table_open') {
        // Delegate to the table handler
        const result = tableHandler.handle(tokens, i, context);
        nodes.push(...result.nodes);
        i += result.consumed;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  if (safetyLimit <= 0) {
    console.warn(
      'parseBlockquote: safety limit exhausted — blockquote may be incomplete',
    );
  }

  return { nodes, endIndex: i };
}
