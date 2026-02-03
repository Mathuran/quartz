# [004] Round-Trip Fidelity and Format Preservation

## Metadata
- **Status:** TODO
- **Depends On:** 002, 003
- **Blocks:** None
- **Scope:** M
- **Design Doc:** [notion-markdown-editor](../../design-docs/notion-markdown-editor.md)

## Description

Ensure the Markdown Bridge (parser + serializer) achieves byte-identical round-trip fidelity. Opening a file and immediately saving it must produce identical output. This is the highest-priority correctness requirement from the design doc (§4, Round-trip fidelity rules).

This issue adds format-preservation logic (tracking original formatting choices like `*bold*` vs `**bold**`, ATX vs setext headings, `-` vs `*` for list markers) and a comprehensive round-trip test suite using real-world markdown fixtures.

## Acceptance Criteria

- [ ] Parse-then-serialize produces byte-identical output for all test fixtures
- [ ] Original formatting choices preserved: bold marker style, list marker style, heading style, code fence character
- [ ] Frontmatter round-trips exactly (including whitespace within YAML)
- [ ] HTML blocks round-trip as opaque raw blocks
- [ ] Trailing newlines preserved exactly (single trailing newline convention)
- [ ] Round-trip validation function: `validateRoundTrip(original: string): boolean` returns true if parse→serialize equals original
- [ ] At least 50 test fixtures covering: CommonMark spec examples, GFM spec examples, real-world documents

## Technical Notes

### Suggested Approach
1. Extend the parser to capture original formatting metadata on nodes (e.g., `listMarker: "-"`, `boldMarker: "**"`)
2. Extend the serializer to read formatting metadata and use it when emitting
3. Create `src/markdown/roundtrip.ts` with `validateRoundTrip()` function
4. Collect fixture files in `test/fixtures/` — pull from CommonMark spec, GFM spec, and real READMEs
5. Write a test runner that loads each fixture, runs round-trip, and asserts byte equality
6. For fixtures that don't round-trip, categorize as: fixable (format preservation bug) vs acceptable (normalized formatting)

### Files to Create/Modify
- `src/markdown/parser.ts` — Add format metadata capture
- `src/markdown/serializer.ts` — Read format metadata
- `src/markdown/roundtrip.ts` — Validation function
- `test/fixtures/` — Markdown test fixture files
- `test/roundtrip.test.ts` — Round-trip test suite

### Key Considerations
- Some formatting normalization is acceptable (e.g., normalizing mixed list markers), but it should be documented
- The `preserveFormatting` config setting controls whether original style is maintained
- Property-based tests can generate random ProseMirror docs and verify structural equality after round-trip
- Test edge cases: empty files, files with only frontmatter, files with only whitespace, very long lines

## Tests Required

### Unit Tests
- [ ] Bold marker style preserved (`*` vs `**`)
- [ ] List marker style preserved (`-` vs `*` vs `+`)
- [ ] Heading style preserved (ATX `#` vs setext `===`)
- [ ] Code fence preserved (`` ` `` vs `~`)
- [ ] Trailing newline handling (single trailing newline)
- [ ] Empty file round-trips to empty file

### Integration Tests
- [ ] 50+ fixture files round-trip with byte equality
- [ ] CommonMark spec examples (supported subset) round-trip
- [ ] GFM spec examples (supported subset) round-trip
- [ ] Real-world README files from 5+ popular repos round-trip

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
