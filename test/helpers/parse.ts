import fs from 'fs';
import path from 'path';
import { parseMarkdown } from '../../src/markdown/parser';
import type { JSONContent } from '@tiptap/core';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

/**
 * Read a fixture file by name (without .md extension) and return its raw content.
 */
export function readFixture(name: string): string {
  const filePath = path.join(FIXTURES_DIR, `${name}.md`);
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Read a fixture file by name and parse it into TipTap JSONContent.
 */
export function parseFixture(name: string): JSONContent {
  const content = readFixture(name);
  return parseMarkdown(content);
}

/**
 * List all available fixture names (without .md extension).
 */
export function listFixtures(): string[] {
  return fs
    .readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}
