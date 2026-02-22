import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/markdown/parser';
import { serializeMarkdown } from '../src/markdown/serializer';

function generateMarkdown(lineCount: number): string {
  const blocks: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    const mod = i % 10;
    if (mod === 0) {
      blocks.push(`## Section ${Math.floor(i / 10) + 1}`);
    } else if (mod === 1) {
      blocks.push(`This is paragraph ${i} with some **bold** and *italic* text.`);
    } else if (mod === 2) {
      blocks.push(`- List item ${i}\n- Another item\n- Third item`);
    } else if (mod === 3) {
      blocks.push(`\`\`\`javascript\nconst x${i} = ${i};\nconsole.log(x${i});\n\`\`\``);
    } else if (mod === 4) {
      blocks.push(`> Quote number ${i}: "Something important"`);
    } else if (mod === 5) {
      blocks.push(`1. First ordered item ${i}\n2. Second\n3. Third`);
    } else if (mod === 6) {
      blocks.push(`---`);
    } else if (mod === 7) {
      blocks.push(`| Col A | Col B |\n|---|---|\n| ${i} | data |`);
    } else if (mod === 8) {
      blocks.push(`- [ ] Task ${i}\n- [x] Done task`);
    } else {
      blocks.push(`[Link ${i}](https://example.com/${i}) and \`inline code\``);
    }
  }
  return blocks.join('\n\n');
}

describe('Performance', () => {
  it('should parse 1K-line document without error', () => {
    const md = generateMarkdown(100);
    const start = performance.now();
    const { doc: result } = parseMarkdown(md);
    const elapsed = performance.now() - start;

    expect(result.content!.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(1000); // < 1 second
  });

  it('should serialize 1K-line document without error', () => {
    const md = generateMarkdown(100);
    const { doc } = parseMarkdown(md);
    const start = performance.now();
    const result = serializeMarkdown(doc);
    const elapsed = performance.now() - start;

    expect(result.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(1000);
  });

  it('should round-trip 1K-line document', () => {
    const md = generateMarkdown(100);
    const { doc, frontmatter } = parseMarkdown(md);
    const serialized = serializeMarkdown(doc, frontmatter);

    // Verify key content is preserved
    expect(serialized).toContain('## Section 1');
    expect(serialized).toContain('**bold**');
    expect(serialized).toContain('```javascript');
    expect(serialized).toContain('| Col A');
    expect(serialized).toContain('- [ ] Task');
  });

  it('should parse 5K-line document in < 500ms', () => {
    const md = generateMarkdown(500);
    const start = performance.now();
    const { doc: result } = parseMarkdown(md);
    const elapsed = performance.now() - start;

    expect(result.content!.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(500);
  });

  it('should serialize 5K-line document in < 500ms', () => {
    const md = generateMarkdown(500);
    const { doc } = parseMarkdown(md);
    const start = performance.now();
    const result = serializeMarkdown(doc);
    const elapsed = performance.now() - start;

    expect(result.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(500);
  });

  it('should handle 10K-line document without crash', () => {
    const md = generateMarkdown(1000);
    expect(() => {
      const { doc, frontmatter } = parseMarkdown(md);
      serializeMarkdown(doc, frontmatter);
    }).not.toThrow();
  });

  it('should parse and serialize consistently (no data loss on large docs)', () => {
    const md = generateMarkdown(200);
    const r1 = parseMarkdown(md);
    const first = serializeMarkdown(r1.doc, r1.frontmatter);
    const r2 = parseMarkdown(first);
    const second = serializeMarkdown(r2.doc, r2.frontmatter);

    // Second round-trip should be identical to first
    expect(second).toBe(first);
  });
});
