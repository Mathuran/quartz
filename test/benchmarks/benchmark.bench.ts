import { bench, describe } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseMarkdown } from '../../src/markdown/parser';
import { serializeMarkdown } from '../../src/markdown/serializer';

const referenceDoc = readFileSync(
  join(__dirname, 'reference-document.md'),
  'utf-8'
);

// Pre-parse for serialize benchmarks
const { doc: parsedDoc, frontmatter: parsedFrontmatter } = parseMarkdown(referenceDoc);

describe('Parser Benchmarks', () => {
  bench('parse reference document (~1000 lines)', () => {
    parseMarkdown(referenceDoc);
  });

  bench('parse small document (50 lines)', () => {
    const small = referenceDoc.split('\n').slice(0, 50).join('\n');
    parseMarkdown(small);
  });

  bench('parse medium document (300 lines)', () => {
    const medium = referenceDoc.split('\n').slice(0, 300).join('\n');
    parseMarkdown(medium);
  });
});

describe('Serializer Benchmarks', () => {
  bench('serialize reference document (~1000 lines)', () => {
    serializeMarkdown(parsedDoc, parsedFrontmatter);
  });
});

describe('Roundtrip Benchmarks', () => {
  bench('full roundtrip (parse + serialize)', () => {
    const { doc, frontmatter } = parseMarkdown(referenceDoc);
    serializeMarkdown(doc, frontmatter);
  });

  bench('double roundtrip (parse -> serialize -> parse -> serialize)', () => {
    const r1 = parseMarkdown(referenceDoc);
    const first = serializeMarkdown(r1.doc, r1.frontmatter);
    const r2 = parseMarkdown(first);
    serializeMarkdown(r2.doc, r2.frontmatter);
  });
});
