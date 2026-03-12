import type MarkdownIt from 'markdown-it';
import type { JSONContent } from '@tiptap/core';
import { isValidUrl } from '../../utils/urlValidator';

/**
 * Parse inline tokens (bold, italic, strikethrough, code, links, images, etc.)
 * into TipTap JSONContent nodes.
 */
export function parseInline(tokens: MarkdownIt.Token[]): JSONContent[] {
  const result: JSONContent[] = [];
  const markStack: Array<{ type: string; attrs?: Record<string, unknown> }> = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'text': {
        if (!token.content) break; // Skip empty text nodes (ProseMirror rejects them)
        const marks = markStack.length > 0 ? [...markStack] : undefined;
        result.push({
          type: 'text',
          text: token.content,
          marks,
        });
        break;
      }

      case 'code_inline': {
        const marks = [...markStack, { type: 'code' }];
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
        if (!isValidUrl(src)) break;
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
