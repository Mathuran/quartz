# [015] Performance Optimization and Large File Handling

## Metadata
- **Status:** TODO
- **Depends On:** 005, 010
- **Blocks:** None
- **Scope:** M
- **Design Doc:** [notion-markdown-editor](../../design-docs/notion-markdown-editor.md)

## Description

Optimize the editor for large files and ensure performance meets the targets in design doc §7 (Performance Tests): <500ms initial render for 5K lines, <16ms keystroke latency (60fps), <200MB memory for 10K lines. Add virtual rendering for documents exceeding 1K blocks and debounced serialization to avoid blocking the UI.

## Acceptance Criteria

- [ ] Initial render of 5K-line document completes in <500ms
- [ ] Keystroke latency remains <16ms (60fps) during editing of 5K-line documents
- [ ] Memory usage stays <200MB for 10K-line documents
- [ ] Virtual rendering activates for documents with >1K blocks (only visible blocks are in the DOM)
- [ ] Serialization is debounced — rapid edits do not trigger per-keystroke markdown serialization
- [ ] Typing at 120 WPM produces no dropped characters or visual lag
- [ ] Save operation on large files (<10K lines) completes without blocking the UI

## Technical Notes

### Suggested Approach
1. **Profiling first:** Open large markdown files (generate test files: 1K, 5K, 10K lines) and profile with Chrome DevTools in the webview
2. **Virtual rendering:** Implement a custom ProseMirror plugin or use a library that only renders nodes visible in the viewport. TipTap doesn't support this natively — investigate `prosemirror-virtual-cursor` or custom viewport-based rendering
3. **Debounced sync:** Instead of sending every `onUpdate` to the extension host, debounce to 300ms. Batch changes.
4. **Lazy serialization:** Only serialize on save (Cmd+S), not on every edit. Keep the ProseMirror doc as the source of truth in-memory.
5. **Code splitting:** Lazy-load heavy dependencies (KaTeX, mermaid.js) only when needed
6. **Message batching:** Batch webview ↔ extension host messages to reduce overhead

### Files to Create/Modify
- `src/webview/extensions/virtualRendering.ts` — Virtual rendering plugin
- `src/webview/utils/debounce.ts` — Debounce utility
- `test/performance/` — Performance test scripts and fixture generators
- `src/QuartzEditorProvider.ts` — Optimize message handling

### Key Considerations
- Virtual rendering is the most impactful optimization but also the most complex. If full virtual rendering is too complex for v1, a simpler approach is to paginate the document and only render the current "page" section.
- Debouncing must not cause data loss — ensure the last edit is always flushed before save
- The dirty indicator should still update promptly (not wait for the debounce)
- Test on both fast and slow machines — CI performance tests should run on standardized hardware

## Tests Required

### Unit Tests
- [ ] Debounce utility fires after specified delay
- [ ] Debounce utility flushes on explicit call
- [ ] Virtual rendering only renders visible nodes

### Integration Tests (Performance)
- [ ] Open 1K-line file: measure render time (< 200ms)
- [ ] Open 5K-line file: measure render time (< 500ms)
- [ ] Open 10K-line file: measure memory usage (< 200MB)
- [ ] Type at 120 WPM in 5K-line file: measure keystroke latency (< 16ms)
- [ ] Save 10K-line file: verify no UI freeze
- [ ] Rapid editing (holding key down): no dropped characters

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Performance tests written and targets met
- [ ] Code reviewed
- [ ] No regressions in existing functionality
