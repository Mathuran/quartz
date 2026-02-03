const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export function extractFrontmatter(text: string): {
  frontmatter: string | null;
  body: string;
} {
  const match = text.match(FRONTMATTER_RE);
  if (match) {
    return {
      frontmatter: match[1],
      body: text.slice(match[0].length),
    };
  }
  return { frontmatter: null, body: text };
}

export function hasFrontmatter(text: string): boolean {
  return FRONTMATTER_RE.test(text);
}
