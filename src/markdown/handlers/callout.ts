import type { JSONContent } from '@tiptap/core';

const CALLOUT_REGEX =
  /^\[!(note|tip|warning|danger|info|example|quote|abstract)\]([+-])?\s*(.*)?$/i;

interface CalloutMatch {
  calloutType: string;
  title: string;
  collapsed: boolean;
  foldable: boolean;
}

interface CalloutDetection {
  match: CalloutMatch;
  /** Remaining inline content from the first paragraph after removing the callout marker.
   *  If non-empty, this should become the first paragraph of the callout content. */
  remainingContent: JSONContent[] | null;
}

/**
 * Inspect the first paragraph of a blockquote to detect a callout marker.
 *
 * markdown-it may produce two layouts:
 * 1. `> [!note]\n>\n> Content` -- separate paragraphs; first paragraph is just the marker.
 * 2. `> [!note]\n> Content` -- single paragraph with softbreak; marker + content merged.
 *
 * In case (2), the inline children look like:
 *   [{ type: 'text', text: '[!note]' }, { type: 'softbreak' }, { type: 'text', text: 'Content' }]
 *
 * We need to check only the text before the first softbreak (or the entire text if no softbreak).
 */
export function detectCallout(firstParagraph: JSONContent): CalloutDetection | null {
  if (firstParagraph.type !== 'paragraph') return null;
  if (!firstParagraph.content || firstParagraph.content.length === 0) return null;

  // Get the text of the first text node only
  const firstNode = firstParagraph.content[0];
  if (!firstNode || firstNode.type !== 'text' || !firstNode.text) return null;

  // First node must have no marks (plain text)
  if (firstNode.marks && firstNode.marks.length > 0) return null;

  const firstText = firstNode.text;
  const regexMatch = CALLOUT_REGEX.exec(firstText);
  if (!regexMatch) return null;

  const calloutType = regexMatch[1].toLowerCase();
  const foldChar = regexMatch[2] as '+' | '-' | undefined;
  const title = (regexMatch[3] || '').trim();

  const match: CalloutMatch = {
    calloutType,
    title,
    collapsed: foldChar === '-',
    foldable: foldChar === '+' || foldChar === '-',
  };

  // Determine remaining content after the marker
  // If there are more nodes after the first text (e.g., softbreak + more text),
  // strip the marker text node and any immediately following softbreak
  const rest = firstParagraph.content.slice(1);
  let remainingContent: JSONContent[] | null = null;

  if (rest.length > 0) {
    // Skip leading softbreak/newline text node if present
    // After parseInline, softbreak becomes { type: 'text', text: '\n' }
    const isNewline =
      rest[0].type === 'softbreak' || (rest[0].type === 'text' && rest[0].text === '\n');
    const startIdx = isNewline ? 1 : 0;
    const afterSoftbreak = rest.slice(startIdx);
    if (afterSoftbreak.length > 0) {
      remainingContent = afterSoftbreak;
    }
  }

  return { match, remainingContent };
}
