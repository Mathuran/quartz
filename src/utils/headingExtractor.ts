export interface ExtensionHeadingItem {
  level: number;
  text: string;
  line: number;
}

/**
 * Extract headings from raw markdown text using regex.
 * Skips headings inside fenced code blocks.
 */
export function extractHeadingsFromMarkdown(text: string): ExtensionHeadingItem[] {
  const lines = text.split('\n');
  const headings: ExtensionHeadingItem[] = [];
  let inCodeFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Toggle code fence state
    if (/^(`{3,}|~{3,})/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (inCodeFence) continue;

    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        line: i,
      });
    }
  }

  return headings;
}
