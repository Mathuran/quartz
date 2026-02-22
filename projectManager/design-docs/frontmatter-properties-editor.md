# Frontmatter Editor Design Document

**Author:** Claude
**Status:** APPROVED
**Created:** 2026-02-21
**Last Updated:** 2026-02-22
**Reviewers:** Mathuran

---

## 1. Problem Statement

Most markdown files in documentation systems (Hugo, Jekyll, Astro), static site generators, and knowledge bases (Obsidian) use YAML frontmatter for metadata -- title, date, tags, status, author, and more. Currently, Quartz handles frontmatter by extracting the YAML content between `---` fences and rendering it as a code block with `language: 'yaml'` inside the TipTap editor. This has two problems:

1. **Roundtrip fidelity is broken.** The serializer outputs frontmatter as a fenced code block (`` ```yaml ... ``` ``), losing the `---` delimiters entirely. Opening and saving a file corrupts the frontmatter.
2. **Poor visual distinction.** Frontmatter looks identical to any other code block in the document. There's no visual cue that it's metadata vs. content.

```
Current broken flow:
---                         codeBlock(yaml)              ```yaml
title: Hello    ──parse──►  "title: Hello\n..."  ──ser──► title: Hello
tags: [a, b]                                              tags: [a, b]
---                                                       ```
                            ^^^                           ^^^
                     frontmatter delimiters LOST    becomes code fence
```

---

## 2. Goals and Non-Goals

### Goals

- **P0: Fix frontmatter roundtrip fidelity** -- Frontmatter wrapped in `---` fences must survive the full parse → edit → serialize cycle without being converted to a fenced code block
- **P0: Styled YAML editor banner** -- Render frontmatter in a visually distinct collapsible banner at the top of the editor, with the raw YAML editable as text (syntax-highlighted)
- **P0: Two-way sync** -- Edits in the frontmatter banner sync to the file; external file changes update the banner
- **P1: Collapsible banner** -- The banner can be collapsed/expanded so it doesn't consume space when users are focused on content
- **P1: Add frontmatter to files without it** -- A subtle "+ Add frontmatter" link at the top of the editor initializes an empty `---\n---` block

### Non-Goals

- Parsing YAML into typed form fields (text inputs, date pickers, tag inputs, checkboxes) -- this is a potential follow-up
- Adding a YAML parsing library (`js-yaml`, `yaml`, etc.) -- not needed for raw text editing
- Property name autocomplete or workspace-wide inference
- Schema validation against a configuration file
- Dataview/database-style queries across files
- Nested object visualization or type inference

---

## 3. Background and Context

### Current Frontmatter Handling

1. **Extraction** (`src/markdown/frontmatter.ts`): The `extractFrontmatter()` function uses a regex (`/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/`) to detect YAML frontmatter at the start of a file. It validates that the content between `---` fences contains at least one `key: value` line to avoid false positives with horizontal rules. It returns `{ frontmatter: string | null, body: string }`.

2. **Parsing** (`src/markdown/parser.ts`): The `parseMarkdown()` function calls `extractFrontmatter()`, then inserts the raw YAML text as a TipTap `codeBlock` node with `attrs: { language: 'yaml' }` at the top of the document. The body is parsed separately through markdown-it.

3. **Serialization** (`src/markdown/serializer.ts` and `src/markdown/serializers/codeBlock.ts`): There is no special handling for frontmatter during serialization. The YAML code block is serialized as a regular fenced code block (`` ```yaml\n...\n``` ``), which means the `---` frontmatter delimiters are **lost on roundtrip**.

4. **Editor** (`src/webview/Editor.tsx`): The frontmatter code block appears as an editable code block at the top of the document, rendered like any other code block.

### Related Files

| File | Role |
|------|------|
| `src/markdown/frontmatter.ts` | Extracts raw YAML string from markdown |
| `src/markdown/parser.ts` | Converts frontmatter to `codeBlock` node |
| `src/markdown/serializer.ts` | Top-level serialization (no frontmatter awareness) |
| `src/markdown/serializers/codeBlock.ts` | Serializes code blocks (including frontmatter) |
| `src/webview/Editor.tsx` | Main editor component, renders TipTap editor |
| `src/webview/App.tsx` | Root component, manages content and config state |
| `src/webview/components/PageContainer.tsx` | Layout wrapper for the editor |

---

## 4. Proposed Solution

### Overview

Extract frontmatter from the TipTap document entirely. Instead of inserting it as a `codeBlock` node, pass the raw YAML string as a separate data channel to a `FrontmatterBanner` React component rendered above the TipTap editor. The banner displays the raw YAML in a styled, editable `<textarea>` with syntax highlighting via CSS. Edits in the banner sync back to the file through the existing message flow.

This approach:
- Fixes roundtrip fidelity (frontmatter is never part of the TipTap document, so it can't be corrupted by the code block serializer)
- Provides visual distinction (the banner has its own styling separate from document content)
- Requires no YAML parsing library (raw text in, raw text out)

### 1. Parser Changes

Modify `parseMarkdown()` to separate frontmatter from the TipTap document content. Instead of inserting a `codeBlock` node, return the raw YAML string alongside the document.

```typescript
// src/markdown/parser.ts (modified return type)
export interface ParseResult {
  doc: JSONContent;
  frontmatter: string | null; // raw YAML string (without --- fences), or null
}

export function parseMarkdown(text: string): ParseResult {
  const { frontmatter, body } = extractFrontmatter(text);
  const tokens = md.parse(body, {});
  const content = tokensToNodes(tokens);

  if (content.length === 0) {
    content.push({ type: 'paragraph' });
  }

  return {
    doc: { type: 'doc', content },
    frontmatter,  // raw YAML string or null
  };
}
```

**Migration note:** The existing `parseMarkdown()` returns `JSONContent`. All callers (Editor.tsx, App.tsx, tests) will be updated to destructure the new `ParseResult`. This is a small, contained change.

### 2. Serializer Changes

Update `serializeMarkdown()` to accept optional frontmatter and prepend it with `---` fences.

```typescript
// src/markdown/serializer.ts (modified)
export function serializeMarkdown(
  doc: JSONContent,
  frontmatter?: string | null
): string {
  let result = '';

  // Serialize frontmatter first
  if (frontmatter) {
    result += `---\n${frontmatter}\n---\n\n`;
  }

  // Serialize document body (existing logic)
  result += serializeNodes(doc);

  return result;
}
```

This is the core roundtrip fix: frontmatter goes in as `---\nyaml\n---` and comes out as `---\nyaml\n---`.

### 3. FrontmatterBanner React Component

**New file:** `src/webview/components/FrontmatterBanner.tsx`

A collapsible banner rendered above the `EditorContent` in `Editor.tsx`.

```
Expanded:
+------------------------------------------------------+
| Frontmatter                             [v] Collapse  |
|------------------------------------------------------|
| title: My Blog Post                                   |
| date: 2026-02-21                                      |
| tags: [react, typescript, vscode]                     |
| draft: true                                           |
+------------------------------------------------------+
|                                                       |
|  # My Blog Post                                       |
|  Content starts here...                               |
+------------------------------------------------------+

Collapsed:
+------------------------------------------------------+
| Frontmatter (4 properties)              [>] Expand    |
+------------------------------------------------------+
|                                                       |
|  # My Blog Post                                       |
+------------------------------------------------------+
```

**Props:**

```typescript
interface FrontmatterBannerProps {
  frontmatter: string | null;     // raw YAML string
  onChange: (yaml: string) => void; // called on edit (debounced)
  onRemove: () => void;            // remove frontmatter entirely
}
```

**Component behavior:**

- Renders a `<textarea>` with the raw YAML content
- Styled with a distinct background (subtle tint using VS Code theme variables), left border accent, and monospace font
- Header shows "Frontmatter" label + collapse toggle + property count
- Edits trigger `onChange` debounced at 300ms (matching editor debounce)
- No YAML parsing — the textarea content is the raw YAML string, passed through as-is
- Line count for the textarea auto-adjusts to fit content (no scrollbar for typical frontmatter)

**CSS:** `src/webview/styles/frontmatter.css`

```css
.quartz-frontmatter-banner {
  border-left: 3px solid var(--vscode-textLink-foreground);
  background: var(--vscode-editor-background);
  border-bottom: 1px solid var(--vscode-panel-border);
  padding: 0;
  margin-bottom: 16px;
  border-radius: 4px;
}

.quartz-frontmatter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  user-select: none;
}

.quartz-frontmatter-textarea {
  width: 100%;
  border: none;
  background: transparent;
  font-family: var(--vscode-editor-font-family);
  font-size: var(--vscode-editor-font-size);
  color: var(--vscode-editor-foreground);
  padding: 0 12px 12px;
  resize: none;
  outline: none;
  line-height: 1.5;
}

.quartz-frontmatter-banner[data-collapsed="true"] .quartz-frontmatter-textarea {
  display: none;
}
```

### 4. Editor Integration

**Changes to `src/webview/Editor.tsx`:**

```typescript
// Editor now manages frontmatter state separately from TipTap
const [frontmatter, setFrontmatter] = useState<string | null>(null);

// On initial content load:
const { doc, frontmatter: fm } = parseMarkdown(content);
setFrontmatter(fm);
editor.commands.setContent(doc);

// On frontmatter edit:
const handleFrontmatterChange = useCallback((yaml: string) => {
  setFrontmatter(yaml);
  // Trigger full document save with frontmatter prepended
  const docMarkdown = serializeMarkdown(editor.getJSON());
  const fullContent = yaml ? `---\n${yaml}\n---\n\n${docMarkdown}` : docMarkdown;
  onUpdate(fullContent);
}, [editor, onUpdate]);

// Render:
<FrontmatterBanner
  frontmatter={frontmatter}
  onChange={handleFrontmatterChange}
  onRemove={() => handleFrontmatterChange('')}
/>
<EditorContent editor={editor} />
```

**Changes to `src/webview/App.tsx`:**

Update the content parsing to use the new `ParseResult` return type. The external change handler re-parses frontmatter from incoming content.

### 5. Add Frontmatter to New Files

When a file has no frontmatter (`frontmatter === null`), show a subtle "+ Add frontmatter" link above the editor content. Clicking it:
1. Sets frontmatter to an empty string `""`
2. Opens the banner with an empty textarea focused
3. User types their YAML content
4. On save, the `---\n...\n---` fences are added

### 6. Collapse/Expand Behavior

- Chevron toggle: right-pointing when collapsed, down-pointing when expanded
- **Default state:** Expanded when frontmatter exists; hidden when no frontmatter
- **Collapsed state:** Shows only the header with property count (counted by line matching `/^\w+:/`)
- **Persistence:** Collapse state saved in VS Code webview state (`vscode.getState()` / `vscode.setState()`)

### 7. Two-Way Sync

**Banner → File:**
1. User edits YAML in the textarea
2. `onChange` fires (debounced 300ms)
3. Editor component serializes: `---\n${yaml}\n---\n\n${bodyMarkdown}`
4. Sent via `postMessage({ type: 'update', content })` → `WorkspaceEdit.replace()`

**External change → Banner:**
1. File change arrives via `externalChange` message
2. `parseMarkdown(newContent)` separates frontmatter and body
3. TipTap editor content updated with `doc`
4. `setFrontmatter(fm)` updates the banner
5. Use `suppressUpdateRef` pattern to prevent feedback loops (already used in App.tsx)

### 8. Edge Case Handling

| Edge Case | Handling |
|-----------|----------|
| No frontmatter in file | Banner hidden; "+ Add frontmatter" link shown |
| Empty frontmatter (`---\n---`) | Banner shown with empty textarea |
| Malformed YAML | Displayed as-is in the textarea — user can fix it manually |
| Very long frontmatter (50+ lines) | Textarea auto-grows; consider a max height with scroll after 20 lines |
| Frontmatter-only file (no body) | Banner shown; empty paragraph below |
| `---` typed in body | Not auto-detected as frontmatter — frontmatter is exclusively managed through the banner |
| File starts with `---` horizontal rule | `extractFrontmatter()` already validates for `key: value` lines to distinguish from horizontal rules |

---

## 5. Alternative Solutions Considered

### Alternative A: Full Properties Editor (Obsidian-style)

Parse YAML into structured key-value properties and render typed form fields (text inputs, checkboxes, date pickers, tag inputs).

**Pros:** Rich UX, users don't need to know YAML syntax.
**Cons:** Requires a YAML library (~30-80KB), complex type inference, many component types, significant implementation effort.

**Why not chosen:** The primary pain point is the broken roundtrip and poor visual distinction. A styled YAML text editor solves both with much less complexity. A full properties editor can be added as a follow-up if demand warrants it.

### Alternative B: Sidebar Panel (VS Code Side Panel)

Render frontmatter in a VS Code sidebar webview.

**Pros:** Doesn't consume vertical editor space.
**Cons:** Disconnected from the document, requires a second webview, users may not discover it.

**Why not chosen:** Inline banner matches user expectations for document metadata.

### Alternative C: Fix Code Block Serializer Only

Keep frontmatter as a code block in TipTap but add a special case to the serializer that detects the first `yaml` code block and wraps it in `---` fences instead of `` ``` ``.

**Pros:** Minimal change — only touches the serializer.
**Cons:** Fragile heuristic (what if the user has a regular yaml code block first?). No visual distinction for frontmatter. No collapsibility. Frontmatter is still editable as a code block.

**Why not chosen:** Solves the roundtrip bug but not the UX problem. The banner approach solves both.

---

## 6. Security, Privacy, and Compliance

- **No new dependencies:** No YAML parsing library needed. Raw YAML text is passed through as-is.
- **Input sanitization:** React's JSX escaping handles XSS for rendered text. No `dangerouslySetInnerHTML` used.
- **No new attack surface:** The banner operates within the existing webview sandbox. No new message types.
- **No telemetry:** No data collection from frontmatter content.

---

## 7. Testing Strategy

### Unit Tests

**Parser (`test/unit/parser-frontmatter.test.ts`):**
- `parseMarkdown()` returns `ParseResult` with separated `frontmatter` string and `doc`
- Files without frontmatter return `frontmatter: null`
- Frontmatter is NOT included as a `codeBlock` node in the doc
- Empty frontmatter (`---\n---`) returns `frontmatter: ''`
- Frontmatter with complex YAML (nested objects, arrays) preserved as raw string

**Serializer (`test/unit/serializer-frontmatter.test.ts`):**
- `serializeMarkdown(doc, frontmatter)` produces `---\n...\n---\n\n` prefix when frontmatter is provided
- `serializeMarkdown(doc, null)` produces no frontmatter prefix
- Round-trip: `parse(serialize(doc, fm)).frontmatter === fm` for various YAML content

**Round-trip fidelity (`test/unit/frontmatter-roundtrip.test.ts`):**
- Full cycle: file with frontmatter → parse → serialize → output matches input
- Frontmatter `---` fences are preserved (the core bug fix)
- Body content is unaffected by frontmatter changes

### E2E Tests

**Banner rendering (`test/e2e/specs/frontmatter-banner.spec.ts`):**
- Banner appears when file has frontmatter
- Banner is hidden when file has no frontmatter
- "+ Add frontmatter" link appears for files without frontmatter
- Collapse/expand toggle works
- Collapse state persists across reload

**Banner editing (`test/e2e/specs/frontmatter-editing.spec.ts`):**
- Edit YAML in the textarea and verify file output
- Add frontmatter to a file that didn't have it
- Remove all frontmatter content and verify `---` fences are removed
- External file change updates the banner content

---

## 8. Rollout Plan

### Phase 1: Parser/Serializer Roundtrip Fix (~0.5 session)
- Modify `parseMarkdown()` to return `ParseResult` with `frontmatter` string
- Modify `serializeMarkdown()` to accept and prepend frontmatter
- Update all callers (Editor.tsx, App.tsx, tests)
- Write unit tests for parse/serialize/roundtrip
- **Gate:** All unit tests pass, frontmatter `---` fences are preserved on roundtrip

### Phase 2: FrontmatterBanner Component (~1 session)
- Create `FrontmatterBanner.tsx` with textarea, header, collapse toggle
- Create `frontmatter.css` with VS Code theme-aware styling
- Integrate into `Editor.tsx` above `EditorContent`
- Wire up two-way sync (banner edits → file, external changes → banner)
- **Gate:** Banner renders, edits sync, visual distinction is clear in light/dark themes

### Phase 3: Polish and Edge Cases (~0.5 session)
- "+ Add frontmatter" link for files without frontmatter
- Collapse state persistence via webview state
- Auto-growing textarea
- E2E tests
- **Gate:** All tests pass, manual QA confirms no regressions

### Rollback Plan

- Phase 1 changes `parseMarkdown()` return type — if issues arise, revert to returning `JSONContent` with the frontmatter code block
- Phase 2+ can be reverted by removing `FrontmatterBanner` from `Editor.tsx`

### Feature Flag

Add `quartz.showFrontmatterBanner` setting (default: `true`). When disabled, falls back to the current code block behavior.

---

## 9. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Parser return type change breaks callers | Medium | Low | Update all callers in the same PR. Small, contained change. |
| Two-way sync causes edit loops | High | Low | Use `suppressUpdateRef` pattern (already proven in `App.tsx`) |
| Textarea doesn't feel like a proper code editor | Medium | Medium | Monospace font, auto-grow, line-height matching VS Code editor. Consider CodeMirror as a follow-up if users want syntax highlighting. |
| Collapse state lost on VS Code restart | Low | Low | Persist via `vscode.getState()` / `vscode.setState()` |
| `extractFrontmatter()` regex misidentifies horizontal rules as frontmatter | Low | Low | Already mitigated — regex requires `key: value` lines |

---

## 10. Open Questions

*All resolved during review.*

**Resolved decisions:**

1. **Panel position:** Collapsible banner at the top of the editor (not a permanent fixed panel).
2. **Complex YAML values:** Show raw YAML as-is in the textarea. No structured parsing or type-specific inputs.
3. **YAML library:** Not needed. Raw YAML string is passed through as text — no parsing library required.
4. **Property ordering:** Source order preserved (raw text, so ordering is inherent).
5. **Scope:** Styled YAML text editor, not a full properties editor. Focus on fixing the roundtrip bug and providing visual distinction.

---

## 11. Implementation Issues

| # | Title | Status | Scope |
|---|-------|--------|-------|
| [001](../issues/frontmatter-properties-editor/001-parser-serializer-roundtrip-fix.md) | Frontmatter Parser/Serializer Roundtrip Fix | DONE | S |
| [002](../issues/frontmatter-properties-editor/002-frontmatter-banner-component.md) | FrontmatterBanner Component and Two-Way Sync | TODO | M |
| [003](../issues/frontmatter-properties-editor/003-edge-cases-and-e2e.md) | Edge Cases, Polish, and E2E Tests | TODO | S |

**Progress:** 1/3 issues complete (33%)
