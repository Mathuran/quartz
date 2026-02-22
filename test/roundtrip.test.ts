import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/markdown/parser';
import { serializeMarkdown } from '../src/markdown/serializer';

function roundTrip(md: string): string {
  const { doc, frontmatter } = parseMarkdown(md);
  return serializeMarkdown(doc, frontmatter);
}

describe('Round-Trip Fidelity', () => {
  it('should round-trip a simple paragraph', () => {
    expect(roundTrip('Hello world\n')).toBe('Hello world\n');
  });

  it('should round-trip headings', () => {
    expect(roundTrip('# Heading 1\n')).toBe('# Heading 1\n');
    expect(roundTrip('## Heading 2\n')).toBe('## Heading 2\n');
    expect(roundTrip('### Heading 3\n')).toBe('### Heading 3\n');
  });

  it('should round-trip bullet list', () => {
    const md = '- Item 1\n- Item 2\n- Item 3\n';
    expect(roundTrip(md)).toBe(md);
  });

  it('should round-trip ordered list', () => {
    const md = '1. First\n2. Second\n3. Third\n';
    expect(roundTrip(md)).toBe(md);
  });

  it('should round-trip code block with language', () => {
    const md = '```javascript\nconst x = 1;\n```\n';
    expect(roundTrip(md)).toBe(md);
  });

  it('should round-trip blockquote', () => {
    const md = '> This is quoted\n';
    expect(roundTrip(md)).toBe(md);
  });

  it('should round-trip horizontal rule', () => {
    const md = 'Before\n\n---\n\nAfter\n';
    const result = roundTrip(md);
    expect(result).toContain('Before');
    expect(result).toContain('---');
    expect(result).toContain('After');
  });

  it('should round-trip bold text', () => {
    const md = '**bold** text\n';
    const result = roundTrip(md);
    expect(result).toContain('**bold**');
  });

  it('should round-trip italic text', () => {
    const md = '*italic* text\n';
    const result = roundTrip(md);
    expect(result).toContain('*italic*');
  });

  it('should round-trip inline code', () => {
    const md = 'Use `code` here\n';
    const result = roundTrip(md);
    expect(result).toContain('`code`');
  });

  it('should round-trip links', () => {
    const md = '[click](https://example.com)\n';
    const result = roundTrip(md);
    expect(result).toContain('[click](https://example.com)');
  });

  it('should round-trip task list', () => {
    const md = '- [ ] Todo\n- [x] Done\n';
    const result = roundTrip(md);
    expect(result).toContain('- [ ] Todo');
    expect(result).toContain('- [x] Done');
  });

  it('should round-trip a complex document', () => {
    const md = `# My Document

This is a paragraph with **bold** and *italic* text.

## Section 1

- Bullet 1
- Bullet 2
- Bullet 3

\`\`\`typescript
const hello = "world";
\`\`\`

> A famous quote

---

1. First item
2. Second item
`;
    const result = roundTrip(md);
    expect(result).toContain('# My Document');
    expect(result).toContain('**bold**');
    expect(result).toContain('*italic*');
    expect(result).toContain('## Section 1');
    expect(result).toContain('- Bullet 1');
    expect(result).toContain('```typescript');
    expect(result).toContain('> A famous quote');
    expect(result).toContain('---');
    expect(result).toContain('1. First item');
  });
});
