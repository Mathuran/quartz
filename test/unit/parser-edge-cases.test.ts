import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/markdown/parser';

describe('Markdown Parser Edge Cases', () => {
  it('should parse deeply nested lists (4 levels: bullet -> ordered -> bullet -> ordered)', () => {
    const md = [
      '- Level 1 bullet',
      '  1. Level 2 ordered',
      '     - Level 3 bullet',
      '       1. Level 4 ordered',
    ].join('\n');
    const result = parseMarkdown(md);

    // Top level is a bullet list
    const bulletList = result.content![0];
    expect(bulletList.type).toBe('bulletList');

    // First item contains paragraph + nested ordered list
    const level1Item = bulletList.content![0];
    expect(level1Item.type).toBe('listItem');
    expect(level1Item.content!.length).toBeGreaterThanOrEqual(2);

    const orderedList = level1Item.content!.find((n) => n.type === 'orderedList');
    expect(orderedList).toBeDefined();

    // Inside ordered list, find nested bullet list
    const level2Item = orderedList!.content![0];
    expect(level2Item.type).toBe('listItem');
    const nestedBullet = level2Item.content!.find((n) => n.type === 'bulletList');
    expect(nestedBullet).toBeDefined();

    // Inside nested bullet, find deepest ordered list
    const level3Item = nestedBullet!.content![0];
    expect(level3Item.type).toBe('listItem');
    const deepestOrdered = level3Item.content!.find((n) => n.type === 'orderedList');
    expect(deepestOrdered).toBeDefined();
    expect(deepestOrdered!.content![0].type).toBe('listItem');
  });

  it('should parse a blockquote containing a code block', () => {
    const md = [
      '> Some text',
      '>',
      '> ```js',
      '> const x = 1;',
      '> ```',
    ].join('\n');
    const result = parseMarkdown(md);

    const blockquote = result.content![0];
    expect(blockquote.type).toBe('blockquote');
    expect(blockquote.content!.length).toBeGreaterThanOrEqual(1);

    // The blockquote should contain at least a paragraph
    const paragraph = blockquote.content!.find((n) => n.type === 'paragraph');
    expect(paragraph).toBeDefined();
  });

  it('should parse a table with pipes inside inline code in cells', () => {
    // markdown-it treats pipes inside backticks as column separators,
    // so we must escape the pipe with \| inside the code span.
    const md = '| Header1 | Header2 |\n|---------|----------|\n| `a\\|b` | normal |';
    const result = parseMarkdown(md);

    const table = result.content![0];
    expect(table.type).toBe('table');
    expect(table.content).toHaveLength(2); // header + body row

    // Body row should contain a cell with inline code
    const bodyRow = table.content![1];
    const cell = bodyRow.content![0];
    expect(cell.type).toBe('tableCell');

    const cellParagraph = cell.content![0];
    const codeNode = cellParagraph.content!.find(
      (n) => n.marks?.some((m) => m.type === 'code')
    );
    expect(codeNode).toBeDefined();
    expect(codeNode!.text).toBe('a|b');
  });

  it('should parse a table with 20+ columns', () => {
    const columnCount = 22;
    const headers = Array.from({ length: columnCount }, (_, i) => `H${i + 1}`).join(' | ');
    const separator = Array.from({ length: columnCount }, () => '---').join(' | ');
    const row = Array.from({ length: columnCount }, (_, i) => `C${i + 1}`).join(' | ');
    const md = `| ${headers} |\n| ${separator} |\n| ${row} |`;
    const result = parseMarkdown(md);

    const table = result.content![0];
    expect(table.type).toBe('table');

    // Header row should have 22 cells
    const headerRow = table.content![0];
    expect(headerRow.type).toBe('tableRow');
    expect(headerRow.content).toHaveLength(columnCount);
    expect(headerRow.content![0].type).toBe('tableHeader');

    // Body row should also have 22 cells
    const bodyRow = table.content![1];
    expect(bodyRow.content).toHaveLength(columnCount);
    expect(bodyRow.content![0].type).toBe('tableCell');
  });

  it('should parse an empty document (only whitespace)', () => {
    const result = parseMarkdown('   \n\t\n   ');
    expect(result.type).toBe('doc');
    expect(result.content).toHaveLength(1);
    expect(result.content![0].type).toBe('paragraph');
    expect(result.content![0].content).toBeUndefined();
  });

  it('should parse a document with only frontmatter and no body', () => {
    const md = '---\ntitle: Test\n---';
    const result = parseMarkdown(md);

    expect(result.type).toBe('doc');
    // Should have the frontmatter as a codeBlock
    const frontmatter = result.content![0];
    expect(frontmatter.type).toBe('codeBlock');
    expect(frontmatter.attrs?.language).toBe('yaml');
    expect(frontmatter.content![0].text).toContain('title: Test');

    // After frontmatter, body is empty so there should be a trailing paragraph
    // or just the frontmatter block (the parser adds an empty paragraph if content is empty)
    expect(result.content!.length).toBeGreaterThanOrEqual(1);
  });

  it('should parse frontmatter with special YAML characters', () => {
    const md = [
      '---',
      'title: "key: value"',
      'tags: [a, b, c]',
      'meta: {foo: bar}',
      'comment: "# not a heading"',
      '---',
      '',
      'Body text',
    ].join('\n');
    const result = parseMarkdown(md);

    const frontmatter = result.content![0];
    expect(frontmatter.type).toBe('codeBlock');
    expect(frontmatter.attrs?.language).toBe('yaml');

    const yamlText = frontmatter.content![0].text!;
    expect(yamlText).toContain('title: "key: value"');
    expect(yamlText).toContain('tags: [a, b, c]');
    expect(yamlText).toContain('meta: {foo: bar}');
    expect(yamlText).toContain('comment: "# not a heading"');

    // Body should still be parsed as paragraph
    const bodyNode = result.content!.find((n) => n.type === 'paragraph');
    expect(bodyNode).toBeDefined();
    expect(bodyNode!.content![0].text).toBe('Body text');
  });

  it('should parse consecutive horizontal rules', () => {
    // Use *** instead of --- to avoid triggering frontmatter detection.
    // The frontmatter regex matches ^---\n...\n--- which would consume the first two ---
    const md = '***\n\n***\n\n***';
    const result = parseMarkdown(md);

    const hrNodes = result.content!.filter((n) => n.type === 'horizontalRule');
    expect(hrNodes).toHaveLength(3);
  });

  it('should parse adjacent code blocks with different languages', () => {
    const md = [
      '```python',
      'print("hello")',
      '```',
      '',
      '```rust',
      'fn main() {}',
      '```',
    ].join('\n');
    const result = parseMarkdown(md);

    const codeBlocks = result.content!.filter((n) => n.type === 'codeBlock');
    expect(codeBlocks).toHaveLength(2);

    expect(codeBlocks[0].attrs?.language).toBe('python');
    expect(codeBlocks[0].content![0].text).toBe('print("hello")');

    expect(codeBlocks[1].attrs?.language).toBe('rust');
    expect(codeBlocks[1].content![0].text).toBe('fn main() {}');
  });

  it('should parse a link with title attribute', () => {
    const md = '[text](https://example.com "my title")';
    const result = parseMarkdown(md);

    const paragraph = result.content![0];
    expect(paragraph.type).toBe('paragraph');

    const linkNode = paragraph.content!.find(
      (n) => n.marks?.some((m) => m.type === 'link')
    );
    expect(linkNode).toBeDefined();
    expect(linkNode!.text).toBe('text');

    const linkMark = linkNode!.marks!.find((m) => m.type === 'link');
    expect(linkMark).toBeDefined();
    expect(linkMark!.attrs!.href).toBe('https://example.com');
  });

  it('should parse an image with empty alt text', () => {
    const md = '![](https://example.com/img.png)';
    const result = parseMarkdown(md);

    const paragraph = result.content![0];
    const image = paragraph.content!.find((n) => n.type === 'image');
    expect(image).toBeDefined();
    expect(image!.attrs?.src).toBe('https://example.com/img.png');
    // alt should be an empty string
    expect(image!.attrs?.alt).toBe('');
  });

  it('should parse nested inline marks (bold+italic with ***)', () => {
    const result = parseMarkdown('***bold italic***');
    const paragraph = result.content![0];
    expect(paragraph.content).toBeDefined();
    expect(paragraph.content!.length).toBeGreaterThanOrEqual(1);

    // Find a node that has both bold and italic marks
    const styledNode = paragraph.content!.find(
      (n) =>
        n.marks?.some((m) => m.type === 'bold') &&
        n.marks?.some((m) => m.type === 'italic')
    );
    expect(styledNode).toBeDefined();
    expect(styledNode!.text).toBe('bold italic');
  });

  it('should parse an HTML block that is not <details> as a paragraph with raw text', () => {
    const md = '<div>content</div>';
    const result = parseMarkdown(md);

    // Non-details HTML blocks should become paragraphs with text content
    const paragraph = result.content![0];
    expect(paragraph.type).toBe('paragraph');
    expect(paragraph.content![0].text).toContain('<div>content</div>');
  });

  it('should parse a paragraph with only inline code and no other text', () => {
    const md = '`justCode`';
    const result = parseMarkdown(md);

    const paragraph = result.content![0];
    expect(paragraph.type).toBe('paragraph');
    expect(paragraph.content).toHaveLength(1);

    const codeNode = paragraph.content![0];
    expect(codeNode.type).toBe('text');
    expect(codeNode.text).toBe('justCode');
    expect(codeNode.marks).toBeDefined();
    expect(codeNode.marks!.some((m) => m.type === 'code')).toBe(true);
  });

  it('should parse the QA test-all-blocks.md without throwing', () => {
    const content = `# H1: The Great Markdown Showcase

## H2: Subheadings and Structure

### H3: Deeper Levels

#### H4: And deeper still...

---

## 1. Text Formatting

* **Bold text** for emphasis.
* *Italic text* for a subtle touch.
* ***Bold and Italic*** for when you're feeling dramatic.
* ~~Strikethrough~~ for things that are no longer true.
* <u>Underlining</u> (Note: This uses HTML tags).

---

## 2. Lists

### Unordered (Bulleted)

* Top level item
* Sub-item A
* Sub-item B

### Ordered (Numbered)

1. First step
2. Second step
3. Third step

### Task Lists (Checklists)

* [x] Write the demo code
* [ ] Drink some coffee
* [ ] Conquer the world

---

## 3. Blockquotes

> "Markdown is intended to be as easy-to-read and easy-to-write as is feasible."
> — *John Gruber*

---

## 4. Code Blocks

\`\`\`javascript
function welcome() {
  console.log("Hello!");
}
\`\`\`

---

## 5. Tables

| Feature | Support | Rating |
| --- | --- | --- |
| Lists | Native | 10/10 |
| Tables | GFM | 8/10 |

---

## 6. Links and Images

Check out [Google](https://www.google.com).

![Alt text](image.png)

---

Here is a simple footnote[^1].`;

    expect(() => parseMarkdown(content)).not.toThrow();
    const result = parseMarkdown(content);
    expect(result.type).toBe('doc');
    expect(result.content!.length).toBeGreaterThan(10);
  });

  it('should handle an extremely long single line (10K+ characters)', () => {
    const longText = 'A'.repeat(10_500);
    const result = parseMarkdown(longText);

    expect(result.type).toBe('doc');
    expect(result.content!.length).toBeGreaterThanOrEqual(1);

    const paragraph = result.content![0];
    expect(paragraph.type).toBe('paragraph');
    expect(paragraph.content![0].text).toBe(longText);
    expect(paragraph.content![0].text!.length).toBe(10_500);
  });
});
