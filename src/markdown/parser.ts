import MarkdownIt from 'markdown-it';
import type { JSONContent } from '@tiptap/core';
import { extractFrontmatter } from './frontmatter';

const md = new MarkdownIt('commonmark', {
  html: true,
  linkify: false,
  typographer: false,
});

// Enable GFM strikethrough
md.enable('strikethrough');
// Enable tables
md.enable('table');

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
    const token = tokens[i];

    switch (token.type) {
      case 'heading_open': {
        const level = parseInt(token.tag.slice(1), 10);
        const inlineToken = tokens[i + 1];
        const content = inlineToken ? parseInline(inlineToken.children || []) : [];
        nodes.push({
          type: 'heading',
          attrs: { level },
          content: content.length > 0 ? content : undefined,
        });
        i += 3; // heading_open, inline, heading_close
        break;
      }

      case 'paragraph_open': {
        const inlineToken = tokens[i + 1];
        // Check for task list items or callout syntax in inline
        const inlineContent = inlineToken ? parseInline(inlineToken.children || []) : [];

        // Check if this looks like a GFM alert inside a blockquote
        nodes.push({
          type: 'paragraph',
          content: inlineContent.length > 0 ? inlineContent : undefined,
        });
        i += 3; // paragraph_open, inline, paragraph_close
        break;
      }

      case 'bullet_list_open': {
        const listItems = parseListItems(tokens, i + 1, 'bullet_list_close');
        // Check if this is a task list
        const isTaskList = listItems.items.some((item) =>
          isTaskItem(item)
        );

        if (isTaskList) {
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
        break;
      }

      case 'ordered_list_open': {
        const attrs: Record<string, unknown> = {};
        if (token.attrGet('start')) {
          attrs.start = parseInt(token.attrGet('start')!, 10);
        }
        const listItems = parseListItems(tokens, i + 1, 'ordered_list_close');
        nodes.push({
          type: 'orderedList',
          attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
          content: listItems.items,
        });
        i = listItems.endIndex + 1;
        break;
      }

      case 'code_block':
      case 'fence': {
        const language = token.info ? token.info.trim().split(/\s+/)[0] : null;
        const text = token.content.replace(/\n$/, '');
        nodes.push({
          type: 'codeBlock',
          attrs: language ? { language } : undefined,
          content: text ? [{ type: 'text', text }] : undefined,
        });
        i++;
        break;
      }

      case 'blockquote_open': {
        const blockquoteContent = parseBlockquote(tokens, i + 1);
        nodes.push({
          type: 'blockquote',
          content: blockquoteContent.nodes,
        });
        i = blockquoteContent.endIndex + 1;
        break;
      }

      case 'hr': {
        nodes.push({ type: 'horizontalRule' });
        i++;
        break;
      }

      case 'html_block': {
        // Check for <details>/<summary> toggle pattern
        const detailsMatch = token.content.match(
          /^<details>\s*\n?<summary>(.*?)<\/summary>\s*\n?([\s\S]*?)\s*<\/details>\s*$/
        );
        if (detailsMatch) {
          const summary = detailsMatch[1].trim();
          const detailsBody = detailsMatch[2].trim();
          // Parse the body as markdown
          const bodyNodes = parseMarkdown(detailsBody);
          nodes.push({
            type: 'details',
            content: [
              {
                type: 'detailsSummary',
                content: [{ type: 'text', text: summary }],
              },
              {
                type: 'detailsContent',
                content: bodyNodes.content || [{ type: 'paragraph' }],
              },
            ],
          });
        } else {
          // Preserve as raw HTML paragraph
          nodes.push({
            type: 'paragraph',
            content: [{ type: 'text', text: token.content.trim() }],
          });
        }
        i++;
        break;
      }

      case 'table_open': {
        const tableResult = parseTable(tokens, i + 1);
        nodes.push(tableResult.node);
        i = tableResult.endIndex + 1;
        break;
      }

      default:
        // Skip unknown tokens
        i++;
        break;
    }
  }

  return nodes;
}

function parseInline(tokens: MarkdownIt.Token[]): JSONContent[] {
  const result: JSONContent[] = [];
  const markStack: Array<{ type: string; attrs?: Record<string, unknown> }> = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'text': {
        const marks = markStack.length > 0 ? [...markStack] : undefined;
        result.push({
          type: 'text',
          text: token.content,
          marks,
        });
        break;
      }

      case 'code_inline': {
        const marks = [
          ...markStack,
          { type: 'code' },
        ];
        result.push({
          type: 'text',
          text: token.content,
          marks,
        });
        break;
      }

      case 'softbreak': {
        result.push({ type: 'text', text: '\n' });
        break;
      }

      case 'hardbreak': {
        result.push({ type: 'hardBreak' });
        break;
      }

      case 'strong_open':
        markStack.push({ type: 'bold' });
        break;
      case 'strong_close':
        markStack.pop();
        break;

      case 'em_open':
        markStack.push({ type: 'italic' });
        break;
      case 'em_close':
        markStack.pop();
        break;

      case 's_open':
        markStack.push({ type: 'strike' });
        break;
      case 's_close':
        markStack.pop();
        break;

      case 'link_open': {
        const href = token.attrGet('href') || '';
        markStack.push({ type: 'link', attrs: { href } });
        break;
      }
      case 'link_close':
        // Remove the last link mark
        for (let j = markStack.length - 1; j >= 0; j--) {
          if (markStack[j].type === 'link') {
            markStack.splice(j, 1);
            break;
          }
        }
        break;

      case 'image': {
        const src = token.attrGet('src') || '';
        const alt = token.attrGet('alt') || token.content || '';
        result.push({
          type: 'image',
          attrs: { src, alt },
        });
        break;
      }

      case 'mark_open':
        markStack.push({ type: 'highlight' });
        break;
      case 'mark_close':
        markStack.pop();
        break;

      default:
        // Fallback: if token has content, add as text
        if (token.content) {
          const marks = markStack.length > 0 ? [...markStack] : undefined;
          result.push({
            type: 'text',
            text: token.content,
            marks,
          });
        }
        break;
    }
  }

  return result;
}

function parseListItems(
  tokens: MarkdownIt.Token[],
  startIndex: number,
  closeType: string
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
      const itemResult = parseListItem(tokens, i + 1);
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
  startIndex: number
): { node: JSONContent; endIndex: number } {
  const content: JSONContent[] = [];
  let i = startIndex;

  while (i < tokens.length && tokens[i].type !== 'list_item_close') {
    const token = tokens[i];

    if (token.type === 'paragraph_open') {
      const inlineToken = tokens[i + 1];
      const inlineContent = inlineToken ? parseInline(inlineToken.children || []) : [];
      content.push({
        type: 'paragraph',
        content: inlineContent.length > 0 ? inlineContent : undefined,
      });
      i += 3;
    } else if (token.type === 'bullet_list_open') {
      const nestedItems = parseListItems(tokens, i + 1, 'bullet_list_close');
      content.push({
        type: 'bulletList',
        content: nestedItems.items,
      });
      i = nestedItems.endIndex + 1;
    } else if (token.type === 'ordered_list_open') {
      const nestedItems = parseListItems(tokens, i + 1, 'ordered_list_close');
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

function parseBlockquote(
  tokens: MarkdownIt.Token[],
  startIndex: number
): { nodes: JSONContent[]; endIndex: number } {
  const nodes: JSONContent[] = [];
  let i = startIndex;
  let depth = 1;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === 'blockquote_close') {
      depth--;
      if (depth === 0) {
        return { nodes, endIndex: i };
      }
    }
    if (token.type === 'blockquote_open') {
      depth++;
    }

    if (depth === 1) {
      if (token.type === 'paragraph_open') {
        const inlineToken = tokens[i + 1];
        const inlineContent = inlineToken ? parseInline(inlineToken.children || []) : [];
        nodes.push({
          type: 'paragraph',
          content: inlineContent.length > 0 ? inlineContent : undefined,
        });
        i += 3;
      } else if (token.type === 'blockquote_open') {
        const nested = parseBlockquote(tokens, i + 1);
        nodes.push({
          type: 'blockquote',
          content: nested.nodes,
        });
        i = nested.endIndex + 1;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return { nodes, endIndex: i };
}

function parseTable(
  tokens: MarkdownIt.Token[],
  startIndex: number
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
      const rowResult = parseTableRow(tokens, i + 1, isHeader);
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
  isHeader: boolean
): { node: JSONContent; endIndex: number } {
  const cells: JSONContent[] = [];
  let i = startIndex;

  while (i < tokens.length && tokens[i].type !== 'tr_close') {
    const token = tokens[i];

    if (token.type === 'th_open' || token.type === 'td_open') {
      const cellType = isHeader ? 'tableHeader' : 'tableCell';
      const inlineToken = tokens[i + 1];
      const content = inlineToken && inlineToken.type === 'inline'
        ? parseInline(inlineToken.children || [])
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

function isTaskItem(listItem: JSONContent): boolean {
  const firstParagraph = listItem.content?.[0];
  if (firstParagraph?.type !== 'paragraph') return false;
  const firstText = firstParagraph.content?.[0];
  if (firstText?.type !== 'text') return false;
  return /^\[[ xX]\]\s/.test(firstText.text || '');
}

function convertToTaskItem(listItem: JSONContent): JSONContent {
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
