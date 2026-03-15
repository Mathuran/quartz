# [008] Serializer Minor Fixes

## Metadata
- **Status:** DONE
- **Depends On:** 007
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [codebase-review-findings](../../design-docs/codebase-review-findings.md)

## Description

Lower-severity serializer issues: details serializer assumes fixed child positions, inconsistent blockquote/callout join patterns, module-level singleton coupling, callout empty content heuristic redundancy, unused parameters, silent content dropping for unknown inline types.

**Findings:** 3.7, 3.8, 3.9, 3.10, 3.13, 3.15, 3.17, 3.18

## Acceptance Criteria

- [ ] `detailsSerializer` finds children by type (`detailsSummary`, `detailsContent`) instead of index
- [ ] `detailsSerializer` does not emit empty body structure when body is empty (just `<details><summary>...</summary></details>`)
- [ ] Blockquote and callout serializers use consistent join pattern
- [ ] Callout `hasRealContent` heuristic simplified (remove redundant condition)
- [ ] `needsBlankLine` unused `_currentType` parameter removed or documented
- [ ] Unknown inline node types log a `console.debug` warning instead of silently returning `''`
- [ ] Three identical list branches in `listUtils.ts` consolidated

## Human Review Focus

- **Look at:** The details serializer changes — ensure `<details>` HTML output is still valid
- **Test:** Create a details/toggle block, verify it round-trips correctly
- **Decide:** N/A — these are straightforward cleanup fixes

## Agent Autonomy Notes

- **Agent can decide:** All implementation details — these are mechanical fixes
- **Escalate to human:** Nothing — all changes are low-risk

## Technical Notes

### Suggested Approach
1. Details: `node.content?.find(c => c.type === 'detailsSummary')` and `find(c => c.type === 'detailsContent')`
2. Details empty body: conditional `\n\n${bodyContent}` only when bodyContent is non-empty
3. Blockquote/callout: choose one pattern (the `\n\n` then wrap approach) and use consistently
4. Callout: simplify to `node.content.length > 1 || node.content[0].type !== 'paragraph' || node.content[0].content`
5. `needsBlankLine`: remove `_currentType` parameter
6. Unknown inline: add `console.debug('[Quartz] Unknown inline node type:', node.type)`
7. List branches: `['bulletList', 'orderedList', 'taskList'].includes(child.type!)` (note: this is supplementary to the fallback branch added in 007)

### Files to Modify
- `src/markdown/serializers/details.ts`
- `src/markdown/serializers/blockquote.ts`
- `src/markdown/serializers/callout.ts`
- `src/markdown/serializers/inline.ts`
- `src/markdown/serializers/listUtils.ts`
- `src/markdown/serializer.ts`

## Tests Required

### Unit Tests
- [ ] Details with children in unexpected order still serializes correctly
- [ ] Details with no body produces clean `<details><summary>...</summary></details>`
- [ ] Blockquote with multiple paragraphs has correct `>` prefix on all lines

### Roundtrip Tests
- [ ] Details block round-trips correctly after changes

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Human review completed (see Human Review Focus above)
- [ ] No regressions in serializer output
