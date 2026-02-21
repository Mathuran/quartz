import { parseMarkdown } from '../../src/markdown/parser';
import { serializeMarkdown } from '../../src/markdown/serializer';

/**
 * Parse markdown, serialize it back, then parse again.
 * Asserts that the two parsed results are structurally identical,
 * verifying round-trip fidelity: parse(serialize(parse(md))) === parse(md).
 */
export function assertRoundtrip(markdown: string): void {
  const firstParse = parseMarkdown(markdown);
  const serialized = serializeMarkdown(firstParse);
  const secondParse = parseMarkdown(serialized);

  // Compare the two parsed JSON structures
  expect(secondParse).toEqual(firstParse);
}

/**
 * Perform a single round-trip: parse then serialize.
 * Returns the serialized markdown string.
 */
export function roundTrip(markdown: string): string {
  const parsed = parseMarkdown(markdown);
  return serializeMarkdown(parsed);
}
