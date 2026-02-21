import type MarkdownIt from 'markdown-it';
import type { JSONContent } from '@tiptap/core';
import type { TokenHandler, ParseContext } from './types';

export const tableHandler: TokenHandler = {
  canHandle(token: MarkdownIt.Token): boolean {
    return token.type === 'table_open';
  },

  handle(
    tokens: MarkdownIt.Token[],
    index: number,
    context: ParseContext,
  ): { nodes: JSONContent[]; consumed: number } {
    const tableResult = parseTable(tokens, index + 1, context);

    return {
      nodes: [tableResult.node],
      consumed: tableResult.endIndex - index + 1,
    };
  },
};

function parseTable(
  tokens: MarkdownIt.Token[],
  startIndex: number,
  context: ParseContext,
): { node: JSONContent; endIndex: number } {
  const rows: JSONContent[] = [];
  let i = startIndex;
  let isHeader = false;

  while (i < tokens.length && tokens[i].type !== 'table_close') {
    const token = tokens[i];

    if (token.type === 'thead_open') {
      isHeader = true;
      i++;
    } else if (token.type === 'thead_close') {
      isHeader = false;
      i++;
    } else if (token.type === 'tbody_open' || token.type === 'tbody_close') {
      i++;
    } else if (token.type === 'tr_open') {
      const rowResult = parseTableRow(tokens, i + 1, isHeader, context);
      rows.push(rowResult.node);
      i = rowResult.endIndex + 1;
    } else {
      i++;
    }
  }

  return {
    node: {
      type: 'table',
      content: rows,
    },
    endIndex: i,
  };
}

function parseTableRow(
  tokens: MarkdownIt.Token[],
  startIndex: number,
  isHeader: boolean,
  context: ParseContext,
): { node: JSONContent; endIndex: number } {
  const cells: JSONContent[] = [];
  let i = startIndex;

  while (i < tokens.length && tokens[i].type !== 'tr_close') {
    const token = tokens[i];

    if (token.type === 'th_open' || token.type === 'td_open') {
      if (i + 1 >= tokens.length) {
        i++;
        continue;
      }
      const cellType = isHeader ? 'tableHeader' : 'tableCell';
      const inlineToken = tokens[i + 1];
      const content =
        inlineToken && inlineToken.type === 'inline'
          ? context.parseInline(inlineToken.children || [])
          : [];

      cells.push({
        type: cellType,
        content: [
          {
            type: 'paragraph',
            content: content.length > 0 ? content : undefined,
          },
        ],
      });
      i += 3; // td/th_open, inline, td/th_close
    } else {
      i++;
    }
  }

  return {
    node: {
      type: 'tableRow',
      content: cells,
    },
    endIndex: i,
  };
}
