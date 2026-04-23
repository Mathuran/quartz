import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/markdown/parser';
import { serializeMarkdown } from '../../src/markdown/serializer';
import type { JSONContent } from '@tiptap/core';

function roundTrip(md: string): string {
  const { doc, frontmatter } = parseMarkdown(md);
  return serializeMarkdown(doc, frontmatter);
}

function assertRoundTrip(md: string): void {
  const firstPass = parseMarkdown(md);
  const serialized = serializeMarkdown(firstPass.doc, firstPass.frontmatter);
  const secondPass = parseMarkdown(serialized);
  // Structural equivalence: parse(serialize(parse(md))) === parse(md)
  expect(secondPass).toEqual(firstPass);
}

// -- Helpers for serializer tests --

function doc(...content: JSONContent[]): JSONContent {
  return { type: 'doc', content };
}

// -- Test data --

const flowchartMd = `\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Result 1]
    B -->|No| D[Result 2]
\`\`\`
`;

const flowchartContent = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Result 1]
    B -->|No| D[Result 2]`;

const sequenceDiagramMd = `\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello Bob
    Bob-->>Alice: Hi Alice
\`\`\`
`;

const sequenceDiagramContent = `sequenceDiagram
    Alice->>Bob: Hello Bob
    Bob-->>Alice: Hi Alice`;

describe('Mermaid Parser', () => {
  it('should parse mermaid flowchart as codeBlock with language "mermaid"', () => {
    const { doc: result } = parseMarkdown(flowchartMd);
    const codeBlock = result.content![0];
    expect(codeBlock.type).toBe('codeBlock');
    expect(codeBlock.attrs?.language).toBe('mermaid');
    expect(codeBlock.content![0].text).toBe(flowchartContent);
  });

  it('should parse mermaid sequence diagram as codeBlock with language "mermaid"', () => {
    const { doc: result } = parseMarkdown(sequenceDiagramMd);
    const codeBlock = result.content![0];
    expect(codeBlock.type).toBe('codeBlock');
    expect(codeBlock.attrs?.language).toBe('mermaid');
    expect(codeBlock.content![0].text).toBe(sequenceDiagramContent);
  });

  it('should preserve exact whitespace and indentation in mermaid content', () => {
    const md = `\`\`\`mermaid
graph LR
    A --> B
        B --> C
\`\`\`
`;
    const { doc: result } = parseMarkdown(md);
    const codeBlock = result.content![0];
    const text = codeBlock.content![0].text;
    expect(text).toContain('    A --> B');
    expect(text).toContain('        B --> C');
  });
});

describe('Mermaid Serializer', () => {
  it('should serialize codeBlock with language "mermaid" to fenced mermaid block', () => {
    const result = serializeMarkdown(
      doc({
        type: 'codeBlock',
        attrs: { language: 'mermaid' },
        content: [{ type: 'text', text: flowchartContent }],
      })
    );
    expect(result).toBe(flowchartMd);
  });

  it('should serialize mermaid sequence diagram content exactly', () => {
    const result = serializeMarkdown(
      doc({
        type: 'codeBlock',
        attrs: { language: 'mermaid' },
        content: [{ type: 'text', text: sequenceDiagramContent }],
      })
    );
    expect(result).toBe(sequenceDiagramMd);
  });

  it('should preserve indentation in serialized mermaid content', () => {
    const content = 'graph TD\n    A --> B\n    B --> C';
    const result = serializeMarkdown(
      doc({
        type: 'codeBlock',
        attrs: { language: 'mermaid' },
        content: [{ type: 'text', text: content }],
      })
    );
    expect(result).toBe(`\`\`\`mermaid\n${content}\n\`\`\`\n`);
  });
});

describe('Mermaid Round-trip', () => {
  it('should round-trip mermaid flowchart', () => {
    assertRoundTrip(flowchartMd);
    expect(roundTrip(flowchartMd)).toBe(flowchartMd);
  });

  it('should round-trip mermaid sequence diagram', () => {
    assertRoundTrip(sequenceDiagramMd);
    expect(roundTrip(sequenceDiagramMd)).toBe(sequenceDiagramMd);
  });

  it('should round-trip empty mermaid block', () => {
    const md = '```mermaid\n\n```\n';
    assertRoundTrip(md);
  });

  it('should round-trip mermaid block mixed with other content', () => {
    const md = `# Architecture

Here is the system flow:

\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Result 1]
    B -->|No| D[Result 2]
\`\`\`

Some explanation text.

\`\`\`typescript
const x = 1;
\`\`\`
`;
    assertRoundTrip(md);
    const result = roundTrip(md);
    expect(result).toContain('# Architecture');
    expect(result).toContain('```mermaid');
    expect(result).toContain('graph TD');
    expect(result).toContain('A[Start] --> B{Decision}');
    expect(result).toContain('Some explanation text.');
    expect(result).toContain('```typescript');
    expect(result).toContain('const x = 1;');
  });

  it('should round-trip mermaid class diagram', () => {
    const md = `\`\`\`mermaid
classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal : +int age
    Animal : +String gender
\`\`\`
`;
    assertRoundTrip(md);
    expect(roundTrip(md)).toBe(md);
  });

  it('should round-trip mermaid pie chart', () => {
    const md = `\`\`\`mermaid
pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15
\`\`\`
`;
    assertRoundTrip(md);
    expect(roundTrip(md)).toBe(md);
  });
});
