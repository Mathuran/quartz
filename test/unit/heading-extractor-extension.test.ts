import { describe, it, expect } from 'vitest';
import { extractHeadingsFromMarkdown } from '../../src/utils/headingExtractor';

describe('extractHeadingsFromMarkdown (extension)', () => {
  it('should extract headings from markdown', () => {
    const md = `# Title

Some text

## Section

### Subsection`;

    const result = extractHeadingsFromMarkdown(md);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ level: 1, text: 'Title', line: 0 });
    expect(result[1]).toEqual({ level: 2, text: 'Section', line: 4 });
    expect(result[2]).toEqual({ level: 3, text: 'Subsection', line: 6 });
  });

  it('should handle all 6 heading levels', () => {
    const md = `# H1
## H2
### H3
#### H4
##### H5
###### H6`;

    const result = extractHeadingsFromMarkdown(md);
    expect(result).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      expect(result[i].level).toBe(i + 1);
      expect(result[i].text).toBe(`H${i + 1}`);
    }
  });

  it('should skip headings inside fenced code blocks', () => {
    const md = `# Real heading

\`\`\`
# Not a heading
## Also not a heading
\`\`\`

## Another real heading`;

    const result = extractHeadingsFromMarkdown(md);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Real heading');
    expect(result[1].text).toBe('Another real heading');
  });

  it('should skip headings inside tilde code blocks', () => {
    const md = `# Real

~~~
# Fake
~~~

## Real 2`;

    const result = extractHeadingsFromMarkdown(md);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Real');
    expect(result[1].text).toBe('Real 2');
  });

  it('should return empty array for empty document', () => {
    expect(extractHeadingsFromMarkdown('')).toHaveLength(0);
  });

  it('should return empty array for document without headings', () => {
    const md = `Just some text.

More text here.

- A list item`;

    expect(extractHeadingsFromMarkdown(md)).toHaveLength(0);
  });

  it('should not match lines with more than 6 hashes', () => {
    const md = `####### Not a heading
# Real heading`;

    const result = extractHeadingsFromMarkdown(md);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Real heading');
  });

  it('should require space after hashes', () => {
    const md = `#NoSpace
# With Space`;

    const result = extractHeadingsFromMarkdown(md);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('With Space');
  });

  it('should trim heading text', () => {
    const md = `# Heading with trailing spaces   `;

    const result = extractHeadingsFromMarkdown(md);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Heading with trailing spaces');
  });
});
