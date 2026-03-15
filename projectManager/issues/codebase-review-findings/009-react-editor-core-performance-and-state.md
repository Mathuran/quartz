# [009] React Editor Core Performance and State Fixes

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** 010
- **Scope:** M
- **Design Doc:** [codebase-review-findings](../../design-docs/codebase-review-findings.md)

## Description

The core `Editor.tsx` and `App.tsx` components have several performance and state management issues. The most impactful is `safeParse` being called on every render (full markdown re-parse). Additionally, debounced updates are lost on unmount, the `dispatch` monkey-patching is fragile, and the `suppressUpdateRef` pattern has race conditions.

**Findings:** 4.1, 4.2, 4.3, 4.4, 4.8, 4.9, 4.21, 4.22, 4.25, 4.26, 4.27

## Acceptance Criteria

- [x] `safeParse` moved to `useState` initializer or `useMemo` — not called on every render
- [x] Debounce cleanup flushes pending serialization before clearing the timer on unmount
- [x] `dispatch` monkey-patching replaced with a ProseMirror transaction meta approach (use `editor.state.tr` with `setMeta('addToHistory', false)` directly in `setContent` options)
- [x] `suppressUpdateRef` race condition fixed — clear previous timeout before setting new one, or use counter-based approach
- [x] `computeDiff` in message handler runs asynchronously (via `requestIdleCallback` or `setTimeout(0)`)
- [x] Message handler validates `event.data` has expected `type` field before processing
- [x] Inline style object on `EditorContent` memoized with `useMemo`
- [x] Production `console.log` in `safeParse` gated behind debug flag or removed
- [x] `React.StrictMode` wrapper added to `index.tsx` (development only)

## Human Review Focus

- **Look at:** The `safeParse` memoization — ensure it correctly re-parses when content actually changes
- **Test:** Open a large markdown file, toggle table hints on/off — verify no re-parsing lag
- **Decide:** Whether to use `requestIdleCallback` or `setTimeout(0)` for async diff computation

## Agent Autonomy Notes

- **Agent can decide:** Memoization strategy, async scheduling approach, debug flag mechanism
- **Escalate to human:** If removing the dispatch monkey-patch requires changes to TipTap's `setContent` API usage

## Technical Notes

### Suggested Approach
1. **safeParse memoization:**
   ```typescript
   const [parsedContent] = useState(() => safeParse(initialContent));
   // Or for the external update path, use useMemo keyed on a version counter
   ```
2. **Debounce flush:** In cleanup, if timer is active, serialize immediately and call `onUpdate`
3. **Dispatch monkey-patch:** Use TipTap's built-in `emitUpdate: false` option or wrap the `setContent` call with a transaction that has `addToHistory: false` meta
4. **suppressUpdateRef:** Store the timeout ID in a ref, clear it before setting a new one
5. **Async diff:** `requestIdleCallback(() => { computeDiff(...); setDiffState(...); })`
6. **Message validation:** Add `if (!message || typeof message.type !== 'string') return;`
7. **Style memoization:** `useMemo(() => ({ fontFamily: ..., fontSize: ... }), [config.fontFamily, config.fontSize])`
8. **Console.log:** Remove or replace with conditional: `if (process.env.NODE_ENV !== 'production')`

### Files to Modify
- `src/webview/Editor.tsx` — safeParse, debounce flush, dispatch, style memoization, console.log
- `src/webview/App.tsx` — suppressUpdateRef, async diff, message validation
- `src/webview/index.tsx` — StrictMode wrapper

### Key Considerations
- The debounce flush on unmount needs access to the editor instance — use a ref to capture it
- `requestIdleCallback` is not available in all environments — provide a `setTimeout` fallback
- The `StrictMode` wrapper will cause double-rendering in development, which is the point — it catches effect cleanup issues

## Tests Required

### Unit Tests
- [ ] `safeParse` not called redundantly when component re-renders with same content
- [ ] Debounce cleanup flushes pending content on unmount

### Manual Testing
- [ ] Open large markdown file — initial load is fast, no visible delay
- [ ] Toggle formatting toolbar visibility — no markdown re-parse in console
- [ ] Make edit, immediately close editor — verify edit is persisted (not lost)
- [ ] Rapid external file changes (e.g., git checkout) — no content corruption

## Definition of Done

- [x] All acceptance criteria met
- [x] Unit tests written and passing
- [ ] Human review completed (see Human Review Focus above)
- [x] No regressions in editor behavior
