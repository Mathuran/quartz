const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

// Check if content between --- markers looks like YAML (has at least one key: value line)
const YAML_LINE_RE = /^[a-zA-Z_][a-zA-Z0-9_-]*\s*:/m;

export function extractFrontmatter(text: string): {
  frontmatter: string | null;
  body: string;
} {
  const match = text.match(FRONTMATTER_RE);
  if (match) {
    const content = match[1];
    // Only treat as frontmatter if the content looks like YAML (has key: value pairs).
    // This avoids false positives when --- is used as a horizontal rule.
    if (content.trim() && YAML_LINE_RE.test(content)) {
      return {
        frontmatter: content,
        body: text.slice(match[0].length),
      };
    }
  }
  return { frontmatter: null, body: text };
}

export function hasFrontmatter(text: string): boolean {
  return extractFrontmatter(text).frontmatter !== null;
}
