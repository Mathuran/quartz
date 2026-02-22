# [001] Frontmatter Parser/Serializer Roundtrip Fix

## Metadata
- **Status:** DONE
- **Depends On:** -
- **Blocks:** 002
- **Scope:** S
- **Design Doc:** [frontmatter-properties-editor](../../design-docs/frontmatter-properties-editor.md)

## Description

Fix the frontmatter roundtrip bug. Currently, frontmatter `---` fences are lost because the parser inserts YAML as a `codeBlock` node and the serializer outputs it as `` ```yaml ``` ``. Change `parseMarkdown()` to return frontmatter as a separate raw string (not part of the TipTap document), and change `serializeMarkdown()` to prepend `---\nfrontmatter\n---` when frontmatter is present.

This is the foundational fix that enables the visual banner in issue 002.

## Acceptance Criteria

- [ ] `parseMarkdown()` returns `ParseResult` with `{ doc, frontmatter }` where `frontmatter` is the raw YAML string (or `null`)
- [ ] Frontmatter is NOT included as a `codeBlock` node in the TipTap document
- [ ] `serializeMarkdown(doc, frontmatter)` prepends `---\n...\n---\n\n` when frontmatter is provided
- [ ] `serializeMarkdown(doc, null)` produces no frontmatter prefix
- [ ] Round-trip: file with `---` fences → parse → serialize → `---` fences preserved
- [ ] Files without frontmatter work unchanged
- [ ] Empty frontmatter (`---\n---`) returns `frontmatter: ''`
- [ ] All existing callers of `parseMarkdown()` updated for new return type
- [ ] Unit tests pass

## Human Review Focus

- **Look at:** The `ParseResult` type and changes to `parser.ts` and `serializer.ts`
- **Test:** Run unit tests. Verify the roundtrip test specifically — does `---\ntitle: Hello\n---` survive?
- **Decide:** Is the `ParseResult` type clean? Any concerns about the caller migration?

## Agent Autonomy Notes

- **Agent can decide:** How to structure `ParseResult`, how to update callers, test organization
- **Escalate to human:** If any callers are ambiguous about how to handle the new return type

## Technical Notes

### Suggested Approach
1. Modify `parseMarkdown()` in `src/markdown/parser.ts` to return `{ doc, frontmatter }` instead of `JSONContent`
2. Remove the code that inserts frontmatter as a `codeBlock` node
3. Modify `serializeMarkdown()` in `src/markdown/serializer.ts` to accept optional `frontmatter` string parameter
4. Update all callers: `Editor.tsx`, `App.tsx`, test files

### Files to Modify
- `src/markdown/parser.ts` — new `ParseResult` type, stop inserting frontmatter as codeBlock
- `src/markdown/serializer.ts` — accept frontmatter parameter, prepend `---` fences
- `src/webview/Editor.tsx` — destructure `ParseResult`, pass frontmatter to serializer
- `src/webview/App.tsx` — update content parsing
- Test files that call `parseMarkdown()`

### Key Considerations
- The existing `extractFrontmatter()` in `frontmatter.ts` is fine — it already returns `{ frontmatter, body }`. No changes needed there.
- Be careful with the blank line between `---` closing fence and body content
- Frontmatter with trailing newlines should be handled gracefully

## Tests Required

### Unit Tests
- [ ] `parseMarkdown()` separates frontmatter from doc
- [ ] Frontmatter NOT present as codeBlock in doc
- [ ] Files without frontmatter return `frontmatter: null`
- [ ] Empty frontmatter (`---\n---`) returns `frontmatter: ''`
- [ ] `serializeMarkdown(doc, 'title: Hello')` produces `---\ntitle: Hello\n---\n\n...`
- [ ] `serializeMarkdown(doc, null)` produces no frontmatter
- [ ] Round-trip: `---` fences preserved through parse → serialize cycle
- [ ] Frontmatter with complex YAML (arrays, nested) preserved as raw string

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Human review completed
- [ ] No regressions in existing tests
