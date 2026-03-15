import type MarkdownIt from 'markdown-it';
import type { JSONContent } from '@tiptap/core';
import type { TokenHandler, ParseContext } from './types';

export const htmlBlockHandler: TokenHandler = {
  canHandle(token: MarkdownIt.Token): boolean {
    return token.type === 'html_block';
  },

  handle(
    tokens: MarkdownIt.Token[],
    index: number,
    context: ParseContext,
    _depth?: number,
  ): { nodes: JSONContent[]; consumed: number } {
    const token = tokens[index];
    const currentDepth = _depth ?? 0;

    // Check for <details>/<summary> toggle pattern
    try {
      const detailsMatch = token.content.match(
        /^<details>\s*\n?<summary>(.*?)<\/summary>\s*\n?([\s\S]*?)\s*<\/details>\s*$/,
      );

      if (detailsMatch) {
        const summary = detailsMatch[1].trim();
        const detailsBody = detailsMatch[2].trim();
        // Parse the body as markdown, passing depth to prevent infinite recursion
        const bodyNodes = context.parseMarkdown(detailsBody, currentDepth + 1);
        return {
          nodes: [
            {
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
            },
          ],
          consumed: 1,
        };
      }
    } catch {
      // If regex or parsing fails for multi-token structures, fall through to raw HTML
    }

    // Preserve as raw HTML paragraph
    return {
      nodes: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: token.content.trim() }],
        },
      ],
      consumed: 1,
    };
  },
};
