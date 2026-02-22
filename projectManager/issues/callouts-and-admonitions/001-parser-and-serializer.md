# [001] Callout Parser and Serializer

## Metadata
- **Status:** DONE
- **Depends On:** -
- **Blocks:** 002, 003
- **Scope:** M
- **Design Doc:** [callouts-and-admonitions](../../design-docs/callouts-and-admonitions.md)

## Description

Implement callout detection in the blockquote parser handler and a dedicated callout serializer. When the first paragraph of a blockquote matches `[!type]`, produce a `callout` node instead of a `blockquote` node. The serializer converts `callout` nodes back to `> [!type]` syntax with round-trip fidelity.

Covers all 8 types (note, tip, warning, danger, info, example, quote, abstract), optional titles, and collapsible syntax (`+`/`-`).

## Acceptance Criteria

- [ ] `> [!note]\n> Content` parses to a `callout` node with `calloutType: 'note'`
- [ ] All 8 callout types are recognized (case-insensitive)
- [ ] Optional title parsed: `> [!warning] Be careful` → `title: 'Be careful'`
- [ ] Collapsible syntax: `> [!tip]-` → `collapsed: true, foldable: true`; `> [!tip]+` → `collapsed: false, foldable: true`
- [ ] Regular blockquotes (no `[!type]` marker) still produce `blockquote` nodes
- [ ] Callout serializer outputs `> [!type] Title\n> content` format
- [ ] Foldable callouts serialize with `+`/`-` suffix
- [ ] Always serialize type as lowercase (parse any case)
- [ ] Round-trip: `parse(serialize(parse(md))) === parse(md)` for all callout variants
- [ ] Callouts with multiple paragraphs, lists, and code blocks inside are handled
- [ ] Empty callout (marker only, no content) handled
- [ ] Unit tests pass

## Human Review Focus

- **Look at:** The callout detection regex and helper in `src/markdown/handlers/callout.ts`, the serializer in `src/markdown/serializers/callout.ts`
- **Test:** Run unit tests. Check that regular blockquotes are unaffected.
- **Decide:** Is the round-trip fidelity acceptable?

## Agent Autonomy Notes

- **Agent can decide:** Internal helper structure, how to extract text from the first paragraph node, test structure
- **Escalate to human:** If the regex needs to handle additional syntax variants not covered in the design doc

## Technical Notes

### Suggested Approach
1. Create `src/markdown/handlers/callout.ts` with `CALLOUT_REGEX` and `detectCallout()` helper
2. Modify `src/markdown/handlers/blockquote.ts` to call `detectCallout()` on the first paragraph — if matched, return a `callout` node instead of `blockquote`
3. Create `src/markdown/serializers/callout.ts` with the callout serializer
4. Register the serializer in `src/markdown/serializer.ts`

### Files to Create
- `src/markdown/handlers/callout.ts` — callout detection helper
- `src/markdown/serializers/callout.ts` — callout serializer
- `test/unit/handlers/callout.test.ts` — parser unit tests
- `test/unit/serializers/callout.test.ts` — serializer unit tests
- `test/unit/callout-roundtrip.test.ts` — round-trip tests

### Files to Modify
- `src/markdown/handlers/blockquote.ts` — add callout detection
- `src/markdown/serializer.ts` — register callout serializer

### Key Considerations
- The `CALLOUT_REGEX` is: `/^\[!(note|tip|warning|danger|info|example|quote|abstract)\]([+-])?\s*(.*)?$/i`
- The blockquote handler must check the first paragraph's text content AFTER parsing the inner tokens
- Callout content = all blockquote children minus the first paragraph's callout marker text

## Tests Required

### Unit Tests
- [ ] Parse all 8 callout types
- [ ] Parse case-insensitive: `[!NOTE]`, `[!Note]`, `[!note]`
- [ ] Parse with title, without title, empty title
- [ ] Parse collapsible: `+`, `-`, no suffix
- [ ] Parse callout with multiple paragraphs
- [ ] Parse callout with lists, code blocks inside
- [ ] Parse empty callout (marker only)
- [ ] Regular blockquote unchanged
- [ ] Serialize all variants back to correct markdown
- [ ] Round-trip fidelity for all variants

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Human review completed
- [ ] No regressions in existing blockquote parsing
