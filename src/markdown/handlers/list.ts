import type MarkdownIt from 'markdown-it';
import type { JSONContent } from '@tiptap/core';
import type { TokenHandler, ParseContext } from './types';

export const bulletListHandler: TokenHandler = {
  canHandle(token: MarkdownIt.Token): boolean {
    return token.type === 'bullet_list_open';
  },

  handle(
    tokens: MarkdownIt.Token[],
    index: number,
    context: ParseContext,
  ): { nodes: JSONContent[]; consumed: number } {
    const listItems = parseListItems(tokens, index + 1, 'bullet_list_close', context);
    const isTaskList = listItems.items.some((item) => isTaskItem(item));

    const node: JSONContent = isTaskList
      ? {
          type: 'taskList',
          content: listItems.items.map((item) => convertToTaskItem(item)),
        }
      : {
          type: 'bulletList',
          content: listItems.items,
        };

    return {
      nodes: [node],
      consumed: listItems.endIndex - index + 1,
    };
  },
};

export const orderedListHandler: TokenHandler = {
  canHandle(token: MarkdownIt.Token): boolean {
    return token.type === 'ordered_list_open';
  },

  handle(
    tokens: MarkdownIt.Token[],
    index: number,
    context: ParseContext,
  ): { nodes: JSONContent[]; consumed: number } {
    const token = tokens[index];
    const attrs: Record<string, unknown> = {};
    if (token.attrGet('start')) {
      attrs.start = parseInt(token.attrGet('start')!, 10);
    }
    const listItems = parseListItems(tokens, index + 1, 'ordered_list_close', context);

    return {
      nodes: [
        {
          type: 'orderedList',
          attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
          content: listItems.items,
        },
      ],
      consumed: listItems.endIndex - index + 1,
    };
  },
};

export function parseListItems(
  tokens: MarkdownIt.Token[],
  startIndex: number,
  closeType: string,
  context: ParseContext,
): { items: JSONContent[]; endIndex: number } {
  const items: JSONContent[] = [];
  let i = startIndex;
  let depth = 1;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === closeType) {
      depth--;
      if (depth === 0) {
        return { items, endIndex: i };
      }
    }

    if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
      depth++;
    }

    if (token.type === 'list_item_open' && depth === 1) {
      const itemResult = parseListItem(tokens, i + 1, context);
      items.push(itemResult.node);
      i = itemResult.endIndex + 1;
    } else {
      i++;
    }
  }

  return { items, endIndex: i };
}

function parseListItem(
  tokens: MarkdownIt.Token[],
  startIndex: number,
  context: ParseContext,
): { node: JSONContent; endIndex: number } {
  const content: JSONContent[] = [];
  let i = startIndex;

  while (i < tokens.length && tokens[i].type !== 'list_item_close') {
    const token = tokens[i];

    if (token.type === 'paragraph_open') {
      const inlineToken = tokens[i + 1];
      const inlineContent = inlineToken ? context.parseInline(inlineToken.children || []) : [];
      content.push({
        type: 'paragraph',
        content: inlineContent.length > 0 ? inlineContent : undefined,
      });
      i += 3;
    } else if (token.type === 'bullet_list_open') {
      const nestedItems = parseListItems(tokens, i + 1, 'bullet_list_close', context);
      content.push({
        type: 'bulletList',
        content: nestedItems.items,
      });
      i = nestedItems.endIndex + 1;
    } else if (token.type === 'ordered_list_open') {
      const nestedItems = parseListItems(tokens, i + 1, 'ordered_list_close', context);
      content.push({
        type: 'orderedList',
        content: nestedItems.items,
      });
      i = nestedItems.endIndex + 1;
    } else {
      i++;
    }
  }

  return {
    node: {
      type: 'listItem',
      content: content.length > 0 ? content : [{ type: 'paragraph' }],
    },
    endIndex: i,
  };
}

export function isTaskItem(listItem: JSONContent): boolean {
  const firstParagraph = listItem.content?.[0];
  if (firstParagraph?.type !== 'paragraph') return false;
  const firstText = firstParagraph.content?.[0];
  if (firstText?.type !== 'text') return false;
  return /^\[[ xX]\]\s/.test(firstText.text || '');
}

export function convertToTaskItem(listItem: JSONContent): JSONContent {
  const content = [...(listItem.content || [])];
  const firstParagraph = content[0];
  if (firstParagraph?.type === 'paragraph' && firstParagraph.content) {
    const firstText = firstParagraph.content[0];
    if (firstText?.type === 'text' && firstText.text) {
      const match = firstText.text.match(/^\[([xX ])\]\s(.*)/);
      if (match) {
        const checked = match[1].toLowerCase() === 'x';
        const remainingText = match[2];
        const newContent = [...firstParagraph.content];
        if (remainingText) {
          newContent[0] = { ...firstText, text: remainingText };
        } else {
          newContent.shift();
        }
        content[0] = {
          type: 'paragraph',
          content: newContent.length > 0 ? newContent : undefined,
        };
        return {
          type: 'taskItem',
          attrs: { checked },
          content,
        };
      }
    }
  }
  return {
    type: 'taskItem',
    attrs: { checked: false },
    content,
  };
}
