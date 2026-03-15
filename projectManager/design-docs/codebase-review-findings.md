# Codebase Review Findings

**Date:** 2026-03-12
**Scope:** Full codebase review (~75 source files, ~21,500 LOC)
**Reviewers:** 6 parallel review agents covering all major areas

---

## Table of Contents

1. [Extension Host Layer](#1-extension-host-layer)
2. [Markdown Parser + Handlers](#2-markdown-parser--handlers)
3. [Serializer Layer](#3-serializer-layer)
4. [Webview React Components](#4-webview-react-components)
5. [TipTap Extensions, Utilities, Diff Engine, Search Engine](#5-tiptap-extensions-utilities-diff-engine-search-engine)
6. [Build Configuration, Project Config, Styles, Test Infrastructure](#6-build-configuration-project-config-styles-test-infrastructure)
7. [Files Reviewed vs Skipped](#7-files-reviewed-vs-skipped)

---

## 1. Extension Host Layer

**Files reviewed:**
- `src/extension.ts`
- `src/QuartzEditorProvider.ts`

Supporting files examined for context:
- `src/QuartzOutlineProvider.ts`
- `src/QuartzDocumentSymbolProvider.ts`
- `package.json`

---

### 1.1 [Critical] Race condition in `isApplyingWebviewEdit` guard

**File:** `src/QuartzEditorProvider.ts`, lines 96-98

The flag `isApplyingWebviewEdit` is set to `true`, then an `await` is performed, then it is set back to `false`. However, `applyEdits` calls `vscode.workspace.applyEdit(edit)` which triggers a `onDidChangeTextDocument` event synchronously *within* the same event loop tick on some VS Code versions, and asynchronously on others. The real problem is:

```typescript
case 'update':
  isApplyingWebviewEdit = true;
  await this.applyEdits(document, message.content);
  isApplyingWebviewEdit = false;  // <-- If applyEdit resolves on a microtick, the flag
  return;                         //     is cleared before the change event fires
```

If `applyEdit` resolves before the corresponding `onDidChangeTextDocument` event fires (which can happen when VS Code batches or defers document change events), the flag will already be `false` and the guard on line 119 will not catch it. This would cause the editor to receive its own edit back as an "external change", creating an infinite echo loop or content corruption.

**Suggested fix:** Use a more robust mechanism, such as tracking a generation counter or comparing document version numbers (`document.version`) before and after, rather than relying on a boolean flag that must remain set across an async boundary.

---

### 1.2 [High] `pendingDiffUris` set is never cleaned up on timeout

**File:** `src/QuartzEditorProvider.ts`, line 9

```typescript
private static pendingDiffUris = new Set<string>();
```

If `queueDiffForUri` is called (line 183) but the webview never sends a `ready` message (e.g., webview fails to load, user closes the tab immediately), the URI string remains in the set indefinitely. This is a memory leak that grows unboundedly over time if the user repeatedly triggers the SCM context menu action on files that fail to open.

**Suggested fix:** Add a timeout (e.g., 10 seconds) that removes the URI from the set, or clean up the entry in `onDidDispose`.

---

### 1.3 [High] `activeWebviewPanel` tracks only a single panel

**File:** `src/QuartzEditorProvider.ts`, line 8

```typescript
private static activeWebviewPanel: vscode.WebviewPanel | undefined;
```

Although `supportsMultipleEditorsPerDocument` is `false`, the user can have multiple *different* markdown files open simultaneously, each with its own `resolveCustomTextEditor` call and its own `webviewPanel`. The static field only tracks the last-active one. This causes:

- `onDidDispose` (line 137-150): When a non-active panel is closed, it does not match the `=== webviewPanel` check, so neither `activeWebviewPanel` nor the outline is cleared. But the outline may still be referencing that panel's document.
- `quartz.refreshOutline` command (extension.ts lines 40-52): Uses `getActiveWebviewPanel()` which may reference a disposed panel if the user switches tabs quickly.
- `requestGitDiffForActivePanel` (line 190-197): Posts a message to whatever panel was last active, which might not be the one the user is looking at if focus changed without triggering `onDidChangeViewState`.

**Suggested fix:** Consider a `Map<string, WebviewPanel>` keyed by document URI, or at minimum, verify the panel is not disposed before using it.

---

### 1.4 [High] No validation that `document` is still open before posting messages

**File:** `src/QuartzEditorProvider.ts`, lines 70-79

In `sendExternalChange` (the debounced callback), `document.getText()` is called 300ms after the change event fires. If the document is closed during that window, `document.getText()` on a closed document returns stale content and `webviewPanel.webview.postMessage(...)` on a disposed panel throws. Neither case is guarded.

```typescript
externalChangeTimeout = setTimeout(() => {
  // document may be closed, webviewPanel may be disposed
  webviewPanel.webview.postMessage({
    type: 'externalChangeAvailable',
    content: document.getText(),  // <-- no guard
  });
}, 300);
```

**Suggested fix:** Check `document.isClosed` and `webviewPanel.visible` (or wrap in try/catch) inside the timeout callback.

---

### 1.5 [High] Nonce generated with `Math.random()`

**File:** `src/QuartzEditorProvider.ts`, lines 279-286

```typescript
function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
```

`Math.random()` is not cryptographically secure. In the context of a VS Code webview CSP nonce, this is primarily a defense-in-depth measure since webview content is already sandboxed. However, using a predictable PRNG for a nonce weakens the CSP protection against script injection attacks that could originate from malicious extensions or compromised webview content.

**Suggested fix:** Use `crypto.randomBytes(16).toString('hex')` from Node's `crypto` module, or `crypto.getRandomValues()`.

---

### 1.6 [Medium] Full-document replacement on every edit

**File:** `src/QuartzEditorProvider.ts`, lines 245-249

```typescript
private async applyEdits(document: vscode.TextDocument, content: string): Promise<void> {
  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), content);
  await vscode.workspace.applyEdit(edit);
}
```

Every keystroke (debounced at 300ms from the webview) replaces the entire document contents. This:
- Destroys undo history granularity in the VS Code text model (each save is a single giant replace).
- Is O(n) in document size for every update.
- Causes flickering in any extensions reading the document.

Additionally, `new vscode.Range(0, 0, document.lineCount, 0)` uses `document.lineCount` as the last line number, but `lineCount` is 1-indexed while `Range` line parameters are 0-indexed. If the document has `n` lines, `document.lineCount` equals `n`, and line `n` does not exist (the last valid line is `n-1`). VS Code's `Range` clamps this gracefully, but it is semantically incorrect and could potentially miss the last character of the last line if that line has no trailing newline. The correct pattern is:

```typescript
const fullRange = new vscode.Range(
  document.positionAt(0),
  document.positionAt(document.getText().length)
);
```

---

### 1.7 [Medium] `ensureDefaultEditorAssociation` mutates global user settings

**File:** `src/extension.ts`, lines 175-191

```typescript
async function ensureDefaultEditorAssociation(): Promise<void> {
  // ...
  await config.update(
    'editorAssociations',
    { ...associations, '*.md': 'quartz.markdownEditor' },
    vscode.ConfigurationTarget.Global,
  );
}
```

This silently modifies the user's global VS Code settings on first activation. Even though it checks for an existing `*.md` key, it still writes to global config without asking the user. This is:
- Surprising behavior for an extension install.
- Potentially conflicts with other markdown extensions.
- The setting `quartz.editor.defaultForMarkdown` (defined in package.json at line 149) is never checked here -- the function runs unconditionally regardless of that setting's value.

**Suggested fix:** Only set the default if `quartz.editor.defaultForMarkdown` is `true`, or prompt the user.

---

### 1.8 [Medium] `closeDiffView` command does the same thing as `viewGitChanges`

**File:** `src/extension.ts`, lines 85-89

```typescript
vscode.commands.registerCommand('quartz.closeDiffView', async () => {
  await QuartzEditorProvider.requestGitDiffForActivePanel();
}),
```

This is identical to the `quartz.viewGitChanges` fallback (line 78). The command labeled "Close Diff View" actually *opens* a git diff. It sends `{ type: 'triggerGitDiff' }` to the webview. Whether this is intentional (toggle behavior handled in the webview) is unclear, but the naming is misleading and the implementation relies entirely on the webview to decide what to do.

---

### 1.9 [Medium] `onDidChangeViewState` listener not disposed

**File:** `src/QuartzEditorProvider.ts`, lines 49-53

```typescript
webviewPanel.onDidChangeViewState((e) => {
  if (e.webviewPanel.active) {
    QuartzEditorProvider.activeWebviewPanel = webviewPanel;
  }
});
```

Unlike `onWebviewMessage`, `onDocumentChange`, and `onConfigChange` which are explicitly disposed in `onDidDispose`, this listener is registered without capturing its disposable and without adding it to the disposal chain. While `onDidChangeViewState` is a panel-level event that VS Code cleans up when the panel is disposed, failing to capture the disposable means there is no way to unsubscribe early if needed, and the pattern is inconsistent with the rest of the disposal code.

---

### 1.10 [Medium] Missing `_token` cancellation handling

**File:** `src/QuartzEditorProvider.ts`, line 32

```typescript
public async resolveCustomTextEditor(
  document: vscode.TextDocument,
  webviewPanel: vscode.WebviewPanel,
  _token: vscode.CancellationToken,
): Promise<void> {
```

The cancellation token is ignored (prefixed with `_`). If VS Code cancels the editor resolution (e.g., user closes the tab before it finishes loading), the method continues to set up all listeners and post messages to a panel that may already be disposed.

---

### 1.11 [Low] Unsafe type casting for `activeTab.input`

**File:** `src/extension.ts`, lines 45-46, 98-99, 125-126, 150

All use this pattern:

```typescript
if (activeTab?.input && typeof activeTab.input === 'object' && 'uri' in activeTab.input) {
  const uri = (activeTab.input as { uri: vscode.Uri }).uri;
```

The `'uri' in activeTab.input` check confirms the property exists but does not confirm it is a `vscode.Uri`. It could be a string, null, or any other type. The `as { uri: vscode.Uri }` cast is therefore unsafe.

**Suggested fix:** Add a type guard like `uri instanceof vscode.Uri`.

---

### 1.12 [Low] `docKey` computed but used only once

**File:** `src/QuartzEditorProvider.ts`, line 42

```typescript
const docKey = document.uri.toString();
```

This is used only at line 90 to check `pendingDiffUris`. Meanwhile, line 117 (`e.document.uri.toString() !== document.uri.toString()`) recomputes `.toString()` on every document change event instead of reusing `docKey`. Minor performance issue on high-frequency events.

---

### 1.13 [Low] Relative path computation is fragile

**File:** `src/QuartzEditorProvider.ts`, lines 219-221

```typescript
const relativePath = filePath.startsWith(repoRoot)
  ? filePath.slice(repoRoot.length + 1)
  : filePath;
```

On Windows, `fsPath` may use backslashes while the git API expects forward slashes. Also, if `repoRoot` has a trailing separator, `repoRoot.length + 1` would skip an extra character. Consider using `vscode.workspace.asRelativePath()` or `path.relative()`.

---

### 1.14 [Low] `quartz.refreshOutline` silently swallows the promise rejection

**File:** `src/extension.ts`, line 47

```typescript
vscode.workspace.openTextDocument(uri).then((doc) => {
  outlineProvider.updateDocument(doc, panel);
});
```

No `.catch()` handler. If `openTextDocument` rejects (e.g., file deleted), the promise rejection is unhandled.

---

### 1.15 [Low] CSP allows `https:` for `img-src` broadly

**File:** `src/QuartzEditorProvider.ts`, line 267

```typescript
img-src ${webview.cspSource} data: https:;
```

The `https:` wildcard allows loading images from any HTTPS origin, which could be used for tracking pixels or data exfiltration via image URLs in user-authored markdown. This is likely intentional (to support external images in markdown), but it is worth noting as a security trade-off.

---

## 2. Markdown Parser + Handlers

**Files reviewed:**
- `src/markdown/parser.ts`
- `src/markdown/frontmatter.ts`
- `src/markdown/handlers/inline.ts`
- `src/markdown/handlers/callout.ts`
- `src/markdown/handlers/table.ts`
- `src/markdown/handlers/codeBlock.ts`
- `src/markdown/handlers/blockquote.ts`
- `src/markdown/handlers/paragraph.ts`
- `src/markdown/handlers/heading.ts`
- `src/markdown/handlers/types.ts`
- `src/markdown/handlers/horizontalRule.ts`
- `src/markdown/handlers/index.ts`
- `src/markdown/handlers/list.ts`
- `src/markdown/handlers/htmlBlock.ts`

---

### 2.1 [High] `markStack.pop()` for close tokens is fragile and can corrupt state

**File:** `src/markdown/handlers/inline.ts`, lines 48-49, 55-56, 63-64, 94-95

For `strong_close`, `em_close`, `s_close`, and `mark_close`, the code does a blind `markStack.pop()`. This assumes the last item on the stack is always the matching mark. However, if markdown-it produces interleaved or malformed tokens (which *can* happen with overlapping markup like `**bold _bold-italic** italic_`), the wrong mark gets popped, corrupting all subsequent inline content.

Contrast this with `link_close` (lines 72-78), which correctly searches backward through the stack for the matching `link` mark and splices it. The same approach should be used for `strong_close`, `em_close`, `s_close`, and `mark_close`.

```typescript
// Current (fragile):
case 'strong_close':
  markStack.pop();
  break;

// Suggested (robust, matching the link_close pattern):
case 'strong_close':
  for (let j = markStack.length - 1; j >= 0; j--) {
    if (markStack[j].type === 'bold') {
      markStack.splice(j, 1);
      break;
    }
  }
  break;
```

---

### 2.2 [Medium] `hasFrontmatter` function is inconsistent with `extractFrontmatter`

**File:** `src/markdown/frontmatter.ts`, lines 25-27

`hasFrontmatter` simply tests `FRONTMATTER_RE` against the text, but `extractFrontmatter` (lines 10-21) has an *additional* check that the captured content must contain a YAML key-value line (`YAML_LINE_RE`). This means `hasFrontmatter` can return `true` for text where `extractFrontmatter` returns `frontmatter: null`.

For example, the input `"---\nhello world\n---\n"` would cause `hasFrontmatter()` to return `true`, but `extractFrontmatter()` would return `{ frontmatter: null, body: <original text> }` because "hello world" has no `key: value` line.

Any caller relying on `hasFrontmatter` as a guard before `extractFrontmatter` would get inconsistent results. Currently `hasFrontmatter` is only used in `diffEngine.ts` and `types.ts` in the diff subsystem, so the impact depends on how those callers use it.

---

### 2.3 [Medium] `softbreak` loses active marks

**File:** `src/markdown/handlers/inline.ts`, lines 35-38

When a `softbreak` token is encountered, it emits `{ type: 'text', text: '\n' }` but does **not** carry forward the current `markStack`. If a softbreak occurs inside bold text (e.g., `**line1\nline2**`), the newline text node will not be marked as bold, creating an inconsistency. The fix:

```typescript
case 'softbreak': {
  const marks = markStack.length > 0 ? [...markStack] : undefined;
  result.push({ type: 'text', text: '\n', marks });
  break;
}
```

---

### 2.4 [Medium] `parseListItems` depth tracking bug with mismatched open/close types

**File:** `src/markdown/handlers/list.ts`, lines 74-98

The `depth` counter increments for *both* `bullet_list_open` and `ordered_list_open` (line 85-87), but decrements only for the specific `closeType` (line 78). Consider this scenario:

If parsing a `bullet_list_close` (`closeType = 'bullet_list_close'`) and the tokens contain a nested `ordered_list_open`, depth increments to 2. But the matching `ordered_list_close` does **not** match `closeType`, so depth never decrements back. The loop will then scan past the actual `bullet_list_close` at the correct nesting level because `depth` is wrong.

However, examining the code more closely: at depth 1, `list_item_open` triggers `parseListItem` (line 89-91), and `parseListItem` (line 120-133) handles nested lists by calling `parseListItems` recursively, which consumes those nested tokens. So this depth tracking at depth > 1 is only reached if there's a `list_item_open` at depth > 1 that isn't consumed. In practice, the recursive `parseListItem` call consumes nested lists before the outer loop sees them. So this is more of a **latent bug** -- the depth tracking logic is incorrect but currently masked by the recursive consumption. If the token stream were ever malformed, this would cause incorrect parsing.

---

### 2.5 [Medium] All-or-nothing task list conversion

**File:** `src/markdown/handlers/list.ts`, lines 16-26

If a bullet list has *any* task item (`- [x] ...` or `- [ ] ...`), the *entire* list is converted to a `taskList`, and all items are forced through `convertToTaskItem`. Non-task items (plain `- text`) that happen to be siblings of task items get converted with `checked: false` (line 184-188), and their content is preserved -- but the original `listItem` type information is lost. This means a mixed list like:

```markdown
- Regular item
- [x] Task item
```

...becomes a `taskList` with two `taskItem` nodes, where "Regular item" is marked as a task. This is a design choice but arguably lossy. Round-trip fidelity is broken: serializing back would produce `- [ ] Regular item` instead of `- Regular item`.

---

### 2.6 [Medium] Missing handling of block types inside blockquotes

**File:** `src/markdown/handlers/blockquote.ts`, lines 109-154

The `parseBlockquote` function at depth 1 only handles `paragraph_open`, `bullet_list_open`, `ordered_list_open`, and nested `blockquote_open`. It silently skips (via `i++`) any other block types that can appear inside blockquotes, such as:
- `fence` / `code_block` (fenced code blocks)
- `hr` (horizontal rules)
- `heading_open` (headings)
- `html_block`
- `table_open`

Any of these inside a blockquote would be silently dropped. For example:

```markdown
> # Heading inside blockquote
>
> ```js
> code
> ```
```

The heading and code block would be lost.

---

### 2.7 [Medium] `<details>` regex is too greedy for multi-block content

**File:** `src/markdown/handlers/htmlBlock.ts`, lines 18-19

The regex:
```
/^<details>\s*\n?<summary>(.*?)<\/summary>\s*\n?([\s\S]*?)\s*<\/details>\s*$/
```

Uses `(.*?)` for the summary, which does not match across newlines. A multi-line summary would fail to match. Additionally, `([\s\S]*?)` for the body is non-greedy which is correct, but the regex requires `<details>` and `</details>` to be in the same `html_block` token. If markdown-it splits them across multiple tokens (which it does for certain formatting), the pattern won't match and the toggle will be rendered as raw HTML.

---

### 2.8 [Medium] No bounds check on token access in heading handler

**File:** `src/markdown/handlers/heading.ts`, line 17

`tokens[index + 1]` is accessed without checking that `index + 1 < tokens.length`. If a `heading_open` is the last token in the array (which would indicate a malformed token stream), this returns `undefined`, which is handled by the ternary, so it won't crash. But `consumed: 3` (line 28) will advance the index past the end of the array. Similarly, there's no check that `tokens[index + 2]` is actually `heading_close`. If the token stream is malformed, the parser would consume the wrong tokens. This applies to `paragraph.ts` as well (same pattern at line 25).

---

### 2.9 [Medium] No HTML sanitization of parsed `<details>` content

**File:** `src/markdown/handlers/htmlBlock.ts`, lines 23-24

The `summary` and `detailsBody` extracted from the regex match are used directly without any sanitization. The `summary` is placed as a text node (line 34: `{ type: 'text', text: summary }`), which is safe because TipTap text nodes don't render HTML. However, `detailsBody` is passed back through `context.parseMarkdown(detailsBody)` (line 26), which means any HTML in the body goes through the full parser again. Since `html: true` is enabled on the markdown-it instance (parser.ts line 19), recursive HTML parsing could amplify embedded HTML. In the context of a local VS Code extension reading the user's own files, this is low risk, but worth noting.

---

### 2.10 [Low] Shared mutable singleton `context` object in parser

**File:** `src/markdown/parser.ts`, lines 49-57

The `context` object is a module-level singleton. While currently it only delegates to pure functions, this pattern is fragile -- any future addition of state to the context would become a shared-mutable-state bug across all callers.

---

### 2.11 [Low] Module-level `MarkdownIt` instance with mutable configuration

**File:** `src/markdown/parser.ts`, lines 18-27

The `md` instance is module-scoped and imperatively configured with `.enable()`. If `parseMarkdown` were ever called from multiple webviews or contexts concurrently, or if any code ever called `.disable()` or `.use()` on it later, the parser behavior would silently change globally.

---

### 2.12 [Low] Silent swallowing of parse errors

**File:** `src/markdown/parser.ts`, lines 95-98

The `catch` block in `tokensToNodes` logs a warning and silently skips the failing token. This is defensively coded, which is good for robustness, but in development/testing it makes debugging harder because malformed tokens vanish without trace. Consider at least including the token type and index in the warning message.

```typescript
// Current
console.warn('Skipping token due to parse error:', err);
// Suggested
console.warn(`Skipping token[${i}] (type: ${tokens[i]?.type}) due to parse error:`, err);
```

---

### 2.13 [Low] Frontmatter regex does not match file starting with BOM

**File:** `src/markdown/frontmatter.ts`, line 1

`FRONTMATTER_RE` uses `^---` which requires `---` at the very start. Files saved with a UTF-8 BOM (`\uFEFF`) at the beginning will fail to match. This is a rare but real edge case in VS Code, which can open files with BOMs.

---

### 2.14 [Low] `code_inline` does not handle empty content

**File:** `src/markdown/handlers/inline.ts`, lines 25-33

Unlike the `text` case (line 15), `code_inline` does not check for empty `token.content`. While markdown-it is unlikely to produce an empty inline code token, if it did, ProseMirror would reject the empty text node. Adding an `if (!token.content) break;` guard would be consistent.

---

### 2.15 [Low] Default fallback silently consumes unknown tokens as text

**File:** `src/markdown/handlers/inline.ts`, lines 98-107

The `default` case in the switch converts any unrecognized token with content into a text node. This can silently produce incorrect output for new token types that should be handled differently. Consider at least logging a debug warning for unknown token types.

---

### 2.16 [Low] `convertToTaskItem` regex does not match `[x]` at line end without trailing space

**File:** `src/markdown/handlers/list.ts`, line 153

`isTaskItem` uses `/^\[[ xX]\]\s/` which requires whitespace after the `]`. A task item like `- [x]` (no text after) would not be detected as a task item. The same pattern is used in `convertToTaskItem` at line 162: `/^\[([xX ])\]\s(.*)/`. Both require a space after `]`, so `- [x]` without trailing content would be treated as a regular list item.

---

### 2.17 [Low] `parseBlockquote` safety limit is a hardcoded magic number

**File:** `src/markdown/handlers/blockquote.ts`, line 78

The `safetyLimit = 10000` is a hardcoded magic number. While it prevents infinite loops, 10,000 is arbitrary. If exhausted, the function returns with potentially incomplete content and no warning. Consider logging when the safety limit is hit.

---

### 2.18 [Low] Recursive parsing via `context.parseMarkdown` can cause stack overflow

**File:** `src/markdown/handlers/htmlBlock.ts`, line 26

If the `detailsBody` itself contains `<details>` blocks, `context.parseMarkdown` will recursively call `parseMarkdown`, which calls `tokensToNodes`, which calls `htmlBlockHandler.handle`, which calls `context.parseMarkdown` again. Deeply nested details blocks would cause stack overflow. There is no depth limit.

---

### 2.19 [Low] No handling of empty tables

**File:** `src/markdown/handlers/table.ts`, lines 29-59

If a `table_open` token is followed immediately by `table_close` (an empty table), `rows` will be empty and the result will be `{ type: 'table', content: [] }`. ProseMirror/TipTap typically requires at least one row in a table. This could cause a runtime error in the editor.

---

### 2.20 [Low] `parseTableRow` hard-codes `consumed: 3` for cell tokens

**File:** `src/markdown/handlers/table.ts`, line 95

`i += 3` assumes the pattern is always `td_open, inline, td_close`. If markdown-it ever produces a cell without inline content (e.g., an empty cell might produce `td_open, td_close` -- only 2 tokens), the index would be off by one, misaligning all subsequent cell parsing. In practice, markdown-it does produce an `inline` token even for empty cells, so this is a latent issue.

---

### 2.21 [Low] Callout detection only works on first paragraph

**File:** `src/markdown/handlers/callout.ts`, lines 37-38

Only the first text node of the first paragraph's content is checked. This is correct per the Obsidian callout spec, but worth noting that if the callout marker is preceded by inline formatting (e.g., `> **[!note]**`), it won't be detected because the first node would be a text node with bold marks, and line 41 rejects nodes with marks.

---

### 2.22 [Low] Trailing newline stripping is correct but undocumented

**File:** `src/markdown/handlers/codeBlock.ts`, line 17

`token.content.replace(/\n$/, '')` strips a trailing newline that markdown-it adds. This is correct behavior but the *why* is not documented. A brief comment would aid maintainability.

---

## 3. Serializer Layer

**Files reviewed:**
- `src/markdown/serializer.ts`
- `src/markdown/serializers/inline.ts`
- `src/markdown/serializers/image.ts`
- `src/markdown/serializers/orderedList.ts`
- `src/markdown/serializers/callout.ts`
- `src/markdown/serializers/listUtils.ts`
- `src/markdown/serializers/table.ts`
- `src/markdown/serializers/codeBlock.ts`
- `src/markdown/serializers/taskList.ts`
- `src/markdown/serializers/blockquote.ts`
- `src/markdown/serializers/paragraph.ts`
- `src/markdown/serializers/details.ts`
- `src/markdown/serializers/heading.ts`
- `src/markdown/serializers/bulletList.ts`
- `src/markdown/serializers/types.ts`
- `src/markdown/serializers/horizontalRule.ts`
- `src/markdown/serializers/index.ts`

---

### 3.1 [Critical] Ordered list `start: 0` silently becomes `start: 1`

**File:** `src/markdown/serializers/orderedList.ts`, line 9

```typescript
const start = (node.attrs?.start as number) || 1;
```

The `||` operator treats `0` as falsy, so `start: 0` silently becomes `start: 1`. While Markdown's CommonMark spec defines ordered list start as a non-negative integer (so 0 *is* valid), this is a data-loss bug where the serializer silently discards the user's explicit attribute. The test at `test/unit/serializer-edge-cases.test.ts:73-86` acknowledges this as a known deficiency but does not fix it.

**Fix:** Use nullish coalescing: `const start = (node.attrs?.start as number) ?? 1;`

---

### 3.2 [Critical] Nested lists use fixed indent offset of 2, causing misalignment for ordered lists

**File:** `src/markdown/serializers/listUtils.ts`, lines 21-25

```typescript
parts.push('\n' + context.serializeNode(child, indent + 2));
```

All nested list types use `indent + 2`. For bullet lists, the marker is `- ` (2 chars), so the indent correctly aligns content under the parent item. But for ordered lists, the marker is `1. ` (3 chars), or `10. ` (4 chars) for items 10+. The nested content should be indented to align with the text after the marker, not by a fixed 2 spaces. This produces markdown that many parsers (including CommonMark-strict ones) will not interpret as nested.

For example, a nested list inside ordered list item 1 currently produces:
```
1. Item text
  - nested item   <-- should be indented 3 spaces (under "I" of "Item")
```

Many CommonMark parsers require the nested content to start at or beyond the column where the list item text begins (column 4 for `1. `).

**Impact:** Depending on which markdown parser consumers use, nested lists inside ordered lists may fail to render as nested. The round-trip tests only test with `toContain` (substring matching), so they do not catch this structural issue.

---

### 3.3 [High] `listUtils.ts` silently drops non-list, non-paragraph children

**File:** `src/markdown/serializers/listUtils.ts`, lines 16-27

```typescript
for (let i = 0; i < item.content.length; i++) {
    const child = item.content[i];
    if (child.type === 'paragraph') {
      parts.push(child.content ? context.serializeInline(child.content) : '');
    } else if (child.type === 'bulletList') {
      parts.push('\n' + context.serializeNode(child, indent + 2));
    } else if (child.type === 'orderedList') {
      parts.push('\n' + context.serializeNode(child, indent + 2));
    } else if (child.type === 'taskList') {
      parts.push('\n' + context.serializeNode(child, indent + 2));
    }
    // <-- all other types are silently dropped
}
```

If a list item contains a blockquote, code block, image, heading, horizontal rule, table, or any other block-level node, the content is silently dropped. The edge-case test at `serializer-edge-cases.test.ts:200-238` tests blockquotes and code blocks inside list items but only asserts on the paragraph text, not on the dropped content. This is a data-loss bug for any list item with rich block-level content.

**Fix:** Add a fallback branch that delegates to `context.serializeNode(child, indent + 2)` for any unrecognized child type:
```typescript
} else {
  const serialized = context.serializeNode(child, indent + 2);
  if (serialized !== null) {
    parts.push('\n' + serialized);
  }
}
```

---

### 3.4 [High] Inline code mark does not escape backticks within content

**File:** `src/markdown/serializers/inline.ts`, line 44

```typescript
case 'code':
    return `\`${text}\``;
```

If the text itself contains a backtick (e.g., the user types `` `template` `` within inline code), the output becomes `` `text with ` inside` `` which is malformed markdown. The standard solution is to use double backticks with spacing (`` `` text with ` inside `` ``).

**Round-trip impact:** Markdown containing inline code with backticks would break on serialization, producing unparseable output.

---

### 3.5 [High] Link href and image src/alt are not escaped

**File:** `src/markdown/serializers/inline.ts`, lines 27-29, 45-48; `src/markdown/serializers/image.ts`, line 9

```typescript
// Image (line 29):
return `![${alt}](${src})`;

// Link (line 47):
return `[${text}](${href})`;
```

If `alt` contains `]`, `src`/`href` contains `)`, or `text` contains `]`, the resulting markdown is malformed. For example:
- Alt text `photo of ]` produces `![photo of ]](url)` -- broken
- URL `https://example.com/page_(1)` produces `[text](https://example.com/page_(1))` -- broken

**Impact:** Data loss or corruption on round-trip for URLs with parentheses (which are common in Wikipedia links) or alt text with brackets.

---

### 3.6 [High] Mark text content is not escaped for markdown special characters

**File:** `src/markdown/serializers/inline.ts`, lines 37-48

The `applyMark` function wraps text with markdown delimiters but never escapes the text content. If a user types literal `**` inside bold text, the serialization `**text with ** inside**` would produce ambiguous markdown. Similarly, text containing `*`, `~~`, `==`, or `` ` `` within corresponding marks would break.

More broadly, even plain text nodes (line 12: `let text = node.text || ''`) are never escaped. If a user types `# Not a heading` as a paragraph, it serializes as `# Not a heading` which re-parses as a heading -- a round-trip fidelity violation.

---

### 3.7 [Medium] `detailsSerializer` assumes exactly 2 children at fixed positions

**File:** `src/markdown/serializers/details.ts`, lines 7-8

```typescript
const summary = node.content?.[0];
const body = node.content?.[1];
```

This hardcodes the assumption that `content[0]` is the summary and `content[1]` is the body. If TipTap ever produces a details node with no content, or with 3+ children, or with the order reversed, this would silently produce wrong output. There is no type-checking to verify that `summary.type === 'detailsSummary'` and `body.type === 'detailsContent'`.

**Fix:** Find children by type rather than by index:
```typescript
const summary = node.content?.find(c => c.type === 'detailsSummary');
const body = node.content?.find(c => c.type === 'detailsContent');
```

---

### 3.8 [Medium] `detailsSerializer` always emits empty body structure even when no body exists

**File:** `src/markdown/serializers/details.ts`, line 16

```typescript
return `<details>\n<summary>${summaryText}</summary>\n\n${bodyContent}\n\n</details>`;
```

When `bodyContent` is `''` (empty), this produces two blank lines before `</details>`. If `summaryText` is also empty, it still emits `<summary></summary>` with no validation.

---

### 3.9 [Medium] `blockquoteSerializer` joins children with `\n>\n` separator, inconsistent with callout

**File:** `src/markdown/serializers/blockquote.ts`, line 11

```typescript
const inner = node.content
    .map((child) => context.serializeNode(child, 0))
    .filter((s): s is string => s !== null)
    .join('\n>\n');
```

**File:** `src/markdown/serializers/callout.ts`

```typescript
const inner = node.content!
    .map((child) => context.serializeNode(child, 0))
    .filter((s): s is string => s !== null)
    .join('\n\n');
```

The blockquote uses `\n>\n` as a separator between children, then wraps all lines with `> `. The callout uses `\n\n` then wraps with `> `. These produce identical output but the inconsistency makes the code harder to maintain and reason about.

---

### 3.10 [Medium] Module-level singleton `context` object creates tight coupling

**File:** `src/markdown/serializer.ts`, lines 44-48

```typescript
const context: SerializeContext = {
  serializeNode,
  serializeInline,
};
```

The `context` and `serializerMap` are module-level singletons. If anyone calls `serializeMarkdown` during another `serializeMarkdown` call (recursive or async), they share state. Testing cannot swap or override individual serializers. The `serializerMap` registration loop runs once at module load -- if a serializer has duplicate `nodeTypes` with another, the last one wins silently.

---

### 3.11 [Medium] Table separator does not support column alignment

**File:** `src/markdown/serializers/table.ts`, line 37

```typescript
const separatorCells = colWidths.map((w) => ` ${'-'.repeat(w)} `);
```

GFM tables support alignment via colons in the separator row (`:---`, `:---:`, `---:`). The serializer always emits plain dashes, so any alignment information in the original markdown is lost on round-trip.

---

### 3.12 [Medium] Table body row with missing `content` produces empty string

**File:** `src/markdown/serializers/table.ts`, line 42

```typescript
const bodyLines = bodyRows.map((row) => {
    if (!row.content) return '';
    // ...
});
```

When a body row has no content, it returns `''`, which when joined with other rows produces a line with no pipe delimiters. This breaks the table structure. It should return a row of empty cells matching `colCount`.

---

### 3.13 [Medium] `calloutSerializer` hardcodes the "empty content" heuristic

**File:** `src/markdown/serializers/callout.ts`, lines 23-28

```typescript
const hasRealContent =
  node.content &&
  node.content.length > 0 &&
  (node.content.length > 1 ||
    node.content[0].type !== 'paragraph' ||
    (node.content[0].type === 'paragraph' && node.content[0].content));
```

The third condition is redundant -- it is only reached when `node.content[0].type === 'paragraph'` is already true (due to the preceding `||`). The extra check clutters the logic.

---

### 3.14 [Low] Code duplication between `inline.ts` image serialization and `image.ts` block serialization

**Files:** `src/markdown/serializers/inline.ts` (lines 26-29) and `src/markdown/serializers/image.ts` (lines 6-9)

Both files contain identical image serialization logic:
```typescript
const src = (node.attrs?.src as string) || '';
const alt = (node.attrs?.alt as string) || '';
return `![${alt}](${src})`;
```

**Fix:** Extract a shared `serializeImage(node)` function.

---

### 3.15 [Low] `needsBlankLine` function always returns `true` when `prevType` exists

**File:** `src/markdown/serializer.ts`, lines 71-75

```typescript
function needsBlankLine(prevType: string, _currentType: string): boolean {
  if (!prevType) return false;
  return true;
}
```

The `_currentType` parameter is unused, suggesting this was intended to have more nuanced logic. The function is over-engineered for what it does.

---

### 3.16 [Low] `headingSerializer` does not clamp level to 1-6 range

**File:** `src/markdown/serializers/heading.ts`, line 7

```typescript
const level = (node.attrs?.level as number) || 1;
```

If a malformed node has `level: 0` (falsy, same `||` problem as ordered list start) or `level: 7`, the serializer produces `#######` which is not a valid markdown heading. It should clamp to `Math.max(1, Math.min(6, level))`.

---

### 3.17 [Low] `serializeInline` does not handle unknown inline node types

**File:** `src/markdown/serializers/inline.ts`, line 32

```typescript
return '';
```

Unknown inline node types return empty string, silently dropping content. No logging or warning.

---

### 3.18 [Low] Three identical branches in `listUtils.ts`

**File:** `src/markdown/serializers/listUtils.ts`, lines 20-26

```typescript
} else if (child.type === 'bulletList') {
    parts.push('\n' + context.serializeNode(child, indent + 2));
} else if (child.type === 'orderedList') {
    parts.push('\n' + context.serializeNode(child, indent + 2));
} else if (child.type === 'taskList') {
    parts.push('\n' + context.serializeNode(child, indent + 2));
}
```

These three branches have identical bodies. They can be consolidated:
```typescript
} else if (['bulletList', 'orderedList', 'taskList'].includes(child.type!)) {
    parts.push('\n' + context.serializeNode(child, indent + 2));
}
```

---

## 4. Webview React Components

**Files reviewed:**
- `src/webview/index.tsx`
- `src/webview/App.tsx`
- `src/webview/Editor.tsx`
- `src/webview/types.ts`
- `src/webview/components/FormattingToolbar.tsx`
- `src/webview/components/SlashMenu.tsx`
- `src/webview/components/LinkDialog.tsx`
- `src/webview/components/PageContainer.tsx`
- `src/webview/components/SearchBar.tsx`
- `src/webview/components/RawBlock.tsx`
- `src/webview/components/FrontmatterBanner.tsx`
- `src/webview/components/TableHint.tsx`
- `src/webview/components/DiffSplitView.tsx`
- `src/webview/components/TableOfContents.tsx`
- `src/webview/components/ErrorBoundary.tsx`
- `src/webview/components/ExternalChangeBanner.tsx`
- `src/webview/components/DiffReviewBar.tsx`
- `src/webview/components/CalloutNodeView.tsx`
- `src/webview/components/CodeBlockNodeView.tsx`

---

### 4.1 [Critical] `safeParse` called during render -- computed value recalculated on every render

**File:** `src/webview/Editor.tsx`, lines 121-128

`safeParse(initialContentRef.current)` is called unconditionally in the component body on every render (line 127). This parses the entire markdown document through markdown-it on every re-render of the `Editor` component (e.g., when `showTableHint` toggles). The ref value doesn't change between renders in most cases, but React has no way to know that -- the function still executes.

```typescript
const { doc: initialDoc, frontmatter: initialFrontmatter } = safeParse(initialContentRef.current);
```

**Suggested fix:** Use `useMemo` keyed on the ref's value, or move parsing into state initialization:
```typescript
const [parsedContent] = useState(() => safeParse(initialContent));
```

---

### 4.2 [High] Stale closure in `handleExternalAccept` -- `suppressUpdateRef` race condition

**File:** `src/webview/App.tsx`, lines 129-138

The `handleExternalAccept` callback depends on `pendingExternalChange`, which is correctly listed in the dependency array. However, the `suppressUpdateRef` timeout pattern (500ms) here and on line 70-72 is a race condition risk. If two rapid `externalChange` messages arrive within 500ms, the first timeout could re-enable updates while the second change is still being processed.

```typescript
suppressUpdateRef.current = true;
setContent(pendingExternalChange);
// ...
setTimeout(() => {
  suppressUpdateRef.current = false;
}, 500);
```

**Suggested fix:** Use a counter-based approach (increment on suppress, decrement on release) or clear the previous timeout before setting a new one.

---

### 4.3 [High] Debounced update lost on unmount -- pending content changes may be silently dropped

**File:** `src/webview/Editor.tsx`, lines 254-258

The cleanup effect clears the debounce timer, but does not flush the pending update. If the user makes an edit and the component unmounts within 300ms, the edit is lost.

```typescript
useEffect(() => {
  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };
}, []);
```

**Suggested fix:** Flush the pending serialization before clearing:
```typescript
useEffect(() => {
  return () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      // Flush: serialize and send now
      if (editor) {
        const markdown = serializeMarkdown(editor.getJSON(), frontmatterRef.current);
        onUpdate(markdown);
      }
    }
  };
}, []);
```

---

### 4.4 [High] Monkey-patching `editor.view.dispatch` is fragile and not concurrency-safe

**File:** `src/webview/Editor.tsx`, lines 230-236

The code temporarily replaces `editor.view.dispatch` to suppress history, then restores it. If any asynchronous code or TipTap internal triggers a dispatch between the monkey-patch and the restore, those dispatches will also incorrectly have `addToHistory: false`.

```typescript
const origDispatch = editor.view.dispatch.bind(editor.view);
editor.view.dispatch = (tr) => {
  tr.setMeta('addToHistory', false);
  origDispatch(tr);
};
editor.commands.setContent(doc, false, { preserveWhitespace: true });
editor.view.dispatch = origDispatch;
```

While `setContent` is synchronous in practice, this pattern is brittle. Any TipTap plugin that schedules a microtask dispatch during `setContent` would have its history suppressed.

---

### 4.5 [High] `setState` called inside `useMemo` -- side effect in render path

**File:** `src/webview/components/SlashMenu.tsx`, lines 17-22

```typescript
const filteredCommands = useMemo(() => {
  if (query !== prevQueryRef.current) {
    prevQueryRef.current = query;
    setSelectedIndex(0);  // <-- setState during render!
  }
  return slashCommands.filter(/* ... */);
}, [query]);
```

Calling `setSelectedIndex(0)` inside `useMemo` is a React anti-pattern. `useMemo` runs during the render phase, and calling `setState` there can cause unexpected re-renders and violates React's rules.

**Suggested fix:** Use a `useEffect` to reset `selectedIndex` when `query` changes, or compute `selectedIndex` as derived state.

---

### 4.6 [High] `replaceAll` builds a transaction then potentially discards it and builds another

**File:** `src/webview/components/SearchBar.tsx`, lines 123-155

When `replacement` is empty, the code builds `tr` with `replaceWith` calls (lines 130-138), then discards it entirely and builds a new `tr2` (lines 143-148). The first transaction `tr` is wasted work.

**Suggested fix:** Check `replacement` before building the transaction:
```typescript
const { tr } = editor.state;
const sorted = [...matches].sort((a, b) => b.from - a.from);
for (const match of sorted) {
  if (replacement) {
    tr.replaceWith(match.from, match.to, editor.state.schema.text(replacement));
  } else {
    tr.delete(match.from, match.to);
  }
}
editor.view.dispatch(tr);
```

---

### 4.7 [High] `getSharedExtensions()` creates new extension instances on every render

**File:** `src/webview/components/DiffSplitView.tsx`, lines 109-137, 182-214

`getSharedExtensions()` is called inside `useEditor` on every render, creating fresh extension instances each time.

**Suggested fix:** Memoize the extension arrays:
```typescript
const leftExtensions = useMemo(() => [
  ...getSharedExtensions(),
  DiffDecorationExtension.configure({ blockDiffMap: leftDiffMap }),
], [leftDiffMap]);
```

---

### 4.8 [Medium] `computeDiff` runs synchronously on the render-triggering message handler

**File:** `src/webview/App.tsx`, lines 95-96, 147-148

`computeDiff` and `computeAlignment` are invoked synchronously inside the `window.message` event handler. For large documents, this could freeze the UI. These are potentially expensive O(n*m) operations being executed on the main thread synchronously.

**Suggested fix:** Consider wrapping in `requestIdleCallback` or running in a web worker for large documents.

---

### 4.9 [Medium] Message handler does not validate `event.origin`

**File:** `src/webview/App.tsx`, line 45

The `window.addEventListener('message', handler)` handler does not check `event.origin` or `event.source`. While VS Code webviews are sandboxed, defense-in-depth would suggest validating the message source.

---

### 4.10 [Medium] `window.prompt()` blocks the entire webview for image URL input

**File:** `src/webview/components/SlashMenu.tsx`, line 83

```typescript
case 'image': {
  const url = window.prompt('Enter image URL');
```

`window.prompt()` is a synchronous blocking call. It may not work correctly in all VS Code webview environments, and it provides a poor UX. The codebase already has a `LinkDialog` component -- a similar pattern should be used for image URLs.

---

### 4.11 [Medium] `shouldShow` callback on BubbleMenu creates a new function every render

**File:** `src/webview/components/FormattingToolbar.tsx`, lines 15-23

```typescript
shouldShow={({ editor, state }) => {
  // ...
}}
```

This inline function is recreated on every render of `FormattingToolbar`, which itself re-renders whenever the editor re-renders. For `BubbleMenu` (which uses Tippy.js internally), this can cause unnecessary tooltip recalculations.

---

### 4.12 [Medium] Stale `matches` array used after replacement

**File:** `src/webview/components/SearchBar.tsx`, lines 107-120 (replaceCurrent)

After `replaceCurrent` replaces text, the `matches` array contains stale positions (the document has changed). The `setTimeout(() => runSearch(query), 0)` re-searches, but there's a brief window where `matches` state is stale. If the user rapidly clicks "Replace", multiple replacements could use stale positions. The same issue exists in `replaceAll` (line 154).

---

### 4.13 [Medium] Search decorations not cleared when editor is destroyed

**File:** `src/webview/components/SearchBar.tsx`

The `updateDecorations` function dispatches transactions on the editor, but if the editor is destroyed while the search bar is open, this would throw. There's no guard checking `editor.isDestroyed` before dispatching.

---

### 4.14 [Medium] `onCancel` in click-outside effect dependency can cause listener leak

**File:** `src/webview/components/LinkDialog.tsx`, lines 77-95

The effect depends on `[isOpen, onCancel]`. If the parent re-renders with a new `onCancel` reference (not wrapped in `useCallback`), the effect tears down and re-registers the listener. The `setTimeout` creates a 100ms delay, but the cleanup runs synchronously, potentially removing a listener that hasn't been added yet (if the previous timeout didn't fire).

---

### 4.15 [Medium] `loadCollapsedState` reads from a `window.vscodeApi` property that's never set

**File:** `src/webview/components/FrontmatterBanner.tsx`, lines 29-42

The function attempts to read `(window as unknown as { vscodeApi?: VsCodeApi }).vscodeApi?.getState()`. But looking at `App.tsx`, the vscode API is stored in a module-level `const vscode = acquireVsCodeApi()` and never assigned to `window.vscodeApi`. This means `loadCollapsedState` and `saveCollapsedState` are always hitting the catch path / returning defaults -- the persistence is effectively broken.

**Suggested fix:** Either assign the vscode API to `window.vscodeApi` in `App.tsx`, or pass it down via props/context.

---

### 4.16 [Medium] Non-null assertions on `diff.oldBlock!` and `diff.newBlock!`

**File:** `src/webview/components/DiffSplitView.tsx`, lines 97, 100-101

```typescript
content.push(diff.oldBlock!);
// ...
content.push(diff.type === 'unchanged' || diff.type === 'modified' ? diff.newBlock! : diff.newBlock!);
```

Line 100-101 has a ternary that returns `diff.newBlock!` in both branches -- the condition is redundant. The non-null assertions are also risky if the diff data is ever malformed.

---

### 4.17 [Medium] `PlaceholderOverlay` uses array index as key

**File:** `src/webview/components/DiffSplitView.tsx`, line 361

```typescript
{placeholders.map((p, i) => (
  <div key={i} className="quartz-diff-placeholder">
```

Using array index as `key` is problematic if placeholders can be reordered.

---

### 4.18 [Medium] `filteredHeadings` length-based effect doesn't reset on content change with same count

**File:** `src/webview/components/TableOfContents.tsx`, lines 24-26

```typescript
useEffect(() => {
  setSelectedIndex(0);
}, [filteredHeadings.length]);
```

If the length stays the same but the contents change (e.g., searching "A" vs "B" with same number of results), the selected index won't reset.

---

### 4.19 [Medium] `itemIndex` is a mutable variable in the render body

**File:** `src/webview/components/CodeBlockNodeView.tsx`, line 149

```typescript
let itemIndex = 0;
```

This variable is mutated during the JSX render (lines 179, 201) via `const idx = itemIndex++`. While this works because React renders synchronously, it's an unusual pattern that could confuse maintainers.

---

### 4.20 [Medium] `navigator.clipboard.writeText` error not handled

**File:** `src/webview/components/CodeBlockNodeView.tsx`, lines 142-146

```typescript
navigator.clipboard.writeText(text).then(() => {
  setCopied(true);
  setTimeout(() => setCopied(false), 1500);
});
```

The promise has no `.catch()`. If clipboard access is denied (which happens in some VS Code webview configurations), this silently fails with an unhandled promise rejection. Also, the `setTimeout` for resetting `copied` is not cleaned up on unmount.

**Suggested fix:**
```typescript
navigator.clipboard.writeText(text).then(() => {
  setCopied(true);
  setTimeout(() => setCopied(false), 1500);
}).catch((err) => {
  console.warn('[Quartz] Failed to copy to clipboard:', err);
});
```

---

### 4.21 [Medium] Inline style object on `EditorContent` creates new object reference every render

**File:** `src/webview/Editor.tsx`, lines 308-312

```typescript
<EditorContent
  editor={editor}
  style={{
    fontFamily: config.fontFamily === 'inherit' ? undefined : config.fontFamily,
    fontSize: `${config.fontSize}px`,
  }}
/>
```

A new style object is allocated each render. Use `useMemo` keyed on `config.fontFamily` and `config.fontSize`.

---

### 4.22 [Medium] `initialContent` prop change triggers full re-parse even when editor already has content

**File:** `src/webview/Editor.tsx`, lines 217-250

The effect compares `initialContent !== initialContentRef.current` using strict string equality. For large documents, this string comparison on every prop change could be expensive. A hash or length-based pre-check would be more efficient.

---

### 4.23 [Medium] Link button non-functional -- `onLinkClick` never passed

**File:** `src/webview/components/FormattingToolbar.tsx`, lines 55-63

```typescript
onClick={() => {
  if (editor.isActive('link')) {
    editor.chain().focus().unsetLink().run();
  } else if (onLinkClick) {
    onLinkClick();
  }
  // else: nothing happens
}}
```

In `Editor.tsx` (line 297), `FormattingToolbar` is rendered without an `onLinkClick` prop. The link button in the toolbar is non-functional when no link is active. The `LinkDialog` component exists but is never instantiated anywhere. This appears to be an incomplete feature integration.

---

### 4.24 [Medium] Synchronized scroll uses ratio-based approach that can drift

**File:** `src/webview/components/DiffSplitView.tsx`, lines 223-231

The scroll sync uses `scrollRatio = scrollTop / (scrollHeight - clientHeight)` and applies it to the other panel. When the two panels have significantly different content heights, this produces a noticeable drift where aligned blocks don't actually align visually.

---

### 4.25 [Low] `vscode` API acquired at module scope

**File:** `src/webview/App.tsx`, line 17

`acquireVsCodeApi()` is called at module scope. This is fine for a VS Code webview (it can only be called once), but it creates a tight coupling that makes the `App` component untestable in isolation.

---

### 4.26 [Low] `safeParse` logs to console on every successful parse

**File:** `src/webview/Editor.tsx`, line 102

```typescript
console.log('[Quartz] Parsed markdown into', doc.content?.length ?? 0, 'top-level nodes');
```

This fires on every document parse including external updates. In a production extension this is noisy. Consider gating behind a debug flag.

---

### 4.27 [Low] No `StrictMode` wrapper

**File:** `src/webview/index.tsx`, line 10

```typescript
root.render(<App />);
```

The app is not wrapped in `<React.StrictMode>`. For development, `StrictMode` would help catch issues with effects that don't clean up properly.

---

### 4.28 [Low] SlashMenu command execution duplicates command logic

**File:** `src/webview/components/SlashMenu.tsx`, lines 55-107

The `executeCommand` function has a large switch statement that mirrors the commands defined in `slashCommands`. If a new command is added to `slashCommands` but not to this switch, the fallback `default: return true` silently does nothing.

---

### 4.29 [Low] URL validation allows `data:` URLs through relative path check

**File:** `src/webview/components/LinkDialog.tsx`, lines 15-33

```typescript
if (url.startsWith('/') || url.startsWith('#')) return true;
```

A URL like `#javascript:alert(1)` would pass validation (starts with `#`). While the `#` prefix makes it a fragment identifier (not executable), the validation could be more strict.

---

### 4.30 [Low] `handleAddFrontmatter` calls `onChange('')` triggering save with empty frontmatter

**File:** `src/webview/components/FrontmatterBanner.tsx`, line 111

When the user clicks "Add frontmatter", `onChange('')` is called, which propagates up to `handleFrontmatterChange` in `Editor.tsx`, which calls `onUpdate(markdown)`. This serializes the entire document with an empty `---\n---` frontmatter block.

---

### 4.31 [Low] No ARIA attributes on the callout fold button

**File:** `src/webview/components/CalloutNodeView.tsx`, lines 187-194

The fold button lacks `aria-expanded` to communicate collapsed state to screen readers.

**Suggested fix:**
```typescript
<button
  className={`quartz-callout-fold${collapsed ? ' collapsed' : ''}`}
  onClick={() => updateAttributes({ collapsed: !collapsed })}
  title={collapsed ? 'Expand' : 'Collapse'}
  aria-expanded={!collapsed}
>
```

---

### 4.32 [Low] No ARIA live region for the external change notification banner

**File:** `src/webview/components/ExternalChangeBanner.tsx`, lines 14-32

The external change banner appears dynamically but has no `role="alert"` or `aria-live` attribute. Screen readers won't announce when a file changes externally.

---

### 4.33 [Low] `ResizeObserver` callback calls `setIsNarrow` unconditionally

**File:** `src/webview/components/PageContainer.tsx`, lines 18-21

```typescript
const observer = new ResizeObserver((entries) => {
  for (const entry of entries) {
    setIsNarrow(entry.contentRect.width < NARROW_BREAKPOINT);
  }
});
```

This calls `setIsNarrow` on every resize event even when the boolean value hasn't changed. React will bail out of re-rendering if the state is the same primitive value, so not a performance problem in practice, but slightly wasteful.

---

## 5. TipTap Extensions, Utilities, Diff Engine, Search Engine

**Files reviewed:**
- `src/webview/extensions/calloutExtension.ts`
- `src/webview/extensions/codeBlockExtension.ts`
- `src/webview/extensions/diffDecorationExtension.ts`
- `src/webview/extensions/linkInputRule.ts`
- `src/webview/extensions/searchHighlightExtension.ts`
- `src/webview/extensions/inputRules.ts`
- `src/webview/extensions/horizontalRuleExtension.ts`
- `src/webview/extensions/keyboardShortcuts.ts`
- `src/webview/extensions/slashCommandExtension.ts`
- `src/webview/utils/debounce.ts`
- `src/webview/utils/headingExtractor.ts`
- `src/webview/diff/diffEngine.ts`
- `src/webview/diff/types.ts`
- `src/webview/diff/alignment.ts`
- `src/webview/search/searchEngine.ts`
- `src/webview/commands/slashCommands.ts`
- `src/webview/constants/languages.ts`
- `src/webview/lowlightLanguages.ts`

---

### 5.1 [Critical] Security: URL validation bypass via whitespace/encoding in `linkInputRule.ts`

**File:** `src/webview/extensions/linkInputRule.ts`, lines 7-26

The `isValidUrl()` function uses `trimmedUrl.startsWith()` checks, but fails to account for control characters, null bytes, or mixed-case protocol variants that some browsers may normalize. While `.toLowerCase()` handles casing, inserted control characters can bypass the check:

```typescript
// A URL like "java\x09script:alert(1)" would bypass startsWith('javascript:')
// because the tab character prevents the match, yet some browsers strip it.
```

Additionally, `data:image/` is allowed broadly (line 16), but `data:image/svg+xml` can contain embedded JavaScript via `<script>` tags or event handlers in SVG:

```typescript
// This passes validation but can execute JS:
// data:image/svg+xml,<svg onload=alert(1)>
if (trimmedUrl.startsWith('data:') && !trimmedUrl.startsWith('data:image/')) {
```

**Suggested fix:** Strip all control characters (0x00-0x1F, 0x7F) before comparison. Block `data:image/svg+xml` specifically, or use allowlist for `data:image/png`, `data:image/jpeg`, `data:image/gif`, `data:image/webp` only.

---

### 5.2 [Critical] Security: No URL validation on Mod-K link and image slash command

**File:** `src/webview/extensions/keyboardShortcuts.ts`, lines 358-376

The `Mod-k` handler calls `window.prompt` and passes the result directly to `setLink({ href: url })` with zero validation. A user (or a paste into the prompt) could enter `javascript:alert(document.cookie)`.

```typescript
'Mod-k': () => {
  // ...
  this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  // No isValidUrl() check!
```

**File:** `src/webview/commands/slashCommands.ts`, lines 188-194

Same issue with the image slash command -- `window.prompt` result goes directly to `setImage({ src: url })` with no sanitization.

```typescript
command: (editor) => {
  const url = window.prompt('Enter image URL');
  if (url) {
    editor.chain().focus().setImage({ src: url }).run(); // no validation
  }
},
```

**Suggested fix:** Reuse the `isValidUrl()` function from `linkInputRule.ts` (after hardening per 5.1) for both the keyboard shortcut link handler and the image command.

---

### 5.3 [High] Performance: O(n*m) LCS diff algorithm with repeated JSON serialization

**File:** `src/webview/diff/diffEngine.ts`, lines 6-8, 14-45

The `computeLCS` function is O(n*m) in time and space, which is standard for LCS. However, `blocksEqual` calls `normalize()` which calls `JSON.stringify()` on every comparison. In the DP loop (lines 19-27), this means `JSON.stringify` is called O(n*m) times. Then in the backtrack loop (lines 32-42), it is called again for each step.

For a document with 200 blocks where both old and new have 200 blocks, that is 40,000 stringify calls in the DP phase alone, plus another 200+ in backtracking.

**Suggested fix:** Pre-compute a hash/fingerprint for each block before entering the LCS loop. Compare fingerprints (string equality on cached values) instead of re-serializing on every comparison.

---

### 5.4 [High] Performance: `buildLCSMap` has O(n*m) inner loop on the `inLCS` matrix

**File:** `src/webview/diff/diffEngine.ts`, lines 47-68

After computing the `inLCS` boolean matrix, `buildLCSMap` iterates over it with a nested loop (lines 56-65). Since the LCS backtrack already identifies exactly which pairs are in the LCS (it walks the diagonal), the `inLCS` matrix is sparse -- only ~min(n,m) entries are `true`. But the scan is O(n*m) regardless.

**Suggested fix:** Return the LCS pairs directly from `computeLCS` as a list of `[i, j]` tuples instead of building a full boolean matrix, then iterate that list in `buildLCSMap`.

---

### 5.5 [High] Bug: Diff decoration plugin re-evaluates on every transaction

**File:** `src/webview/extensions/diffDecorationExtension.ts`, lines 27-57

The `blockDiffMap` is captured from `this.options` at plugin creation time (line 27), so it closes over the initial reference. The `decorations` function in `props` (line 33) is called on **every** ProseMirror transaction. Since it captures `blockDiffMap` from the outer closure rather than from plugin state, if the options change, the plugin keeps using the stale map. Conversely, if the map is updated in-place, it cannot skip recomputation because there is no way to detect "nothing changed."

More importantly, the decoration function (lines 33-53) rebuilds the full `DecorationSet` from scratch on every transaction -- it does not use `DecorationSet.map()` to efficiently update positions. For large documents with many diff highlights, this is wasteful.

**Suggested fix:** Move `blockDiffMap` into plugin state and use `state.init`/`state.apply` to track it via transaction metadata. Only rebuild decorations when the map actually changes.

---

### 5.6 [High] Bug: Module-level mutable state in `slashCommandExtension.ts`

**File:** `src/webview/extensions/slashCommandExtension.ts`, line 6

```typescript
let isSlashMenuActive = false;
```

This module-level boolean is shared across all editor instances. If multiple editors are instantiated (e.g., in a split view or if the extension is ever used in a multi-editor context), one editor's slash menu state will leak into another. Additionally, the plugin has its own `state` field (lines 72-79) that tracks `{ active: false }` but this state is never used -- the plugin reads the module-level `isSlashMenuActive` instead.

The global `window.addEventListener` at lines 86-91 is also never cleaned up. Each time the module is re-evaluated, a new listener is added.

**Suggested fix:** Move `isSlashMenuActive` into plugin state and use `tr.getMeta()` to read/write it. Remove the module-level event listener or ensure it is registered only once and cleaned up properly.

---

### 5.7 [High] Bug: `horizontalRuleExtension.ts` uses `state.tr` instead of the handler's transaction

**File:** `src/webview/extensions/horizontalRuleExtension.ts`, lines 67-88

The InputRule handlers call `insertHorizontalRule(state, state.tr, range)`. TipTap InputRule handlers are expected to mutate the transaction provided via the handler context (or chain), but this code creates a **new** transaction via `state.tr` (which returns a fresh transaction every time it is accessed). The handler then mutates this new transaction but never dispatches it -- instead, TipTap expects the handler to modify the existing chained transaction.

`state.tr` creates a new transaction each time it is accessed as a getter. If the handler's framework already has a pending transaction, this could create a conflict.

**Suggested fix:** Refactor to use the `chain()` API or the transaction object provided by the handler context.

---

### 5.8 [Medium] Bug: Search match positions are wrong for nodes with marks

**File:** `src/webview/search/searchEngine.ts`, lines 37-49

The `findMatches` function uses `doc.descendants` and searches within individual text nodes. But when text has inline marks (bold, italic, links), ProseMirror splits text into separate nodes at mark boundaries. This means a search for "hello world" will fail if "hello" is bold and " world" is plain, because they are separate text nodes and the search only looks within each node independently.

```typescript
doc.descendants((node, pos) => {
  if (!node.isText || !node.text) return;
  // Only searches within THIS text node, can't find matches that span nodes
  const text = options.caseSensitive ? node.text : node.text.toLowerCase();
```

**Suggested fix:** Collect text and positions at the paragraph/block level (concatenating all text nodes within a block) and search over the concatenated text, mapping positions back to document positions.

---

### 5.9 [Medium] Bug: `wholeWord` check uses wrong text for case-insensitive mode

**File:** `src/webview/search/searchEngine.ts`, lines 42-43

When `caseSensitive` is false, `text` is lowercased but `node.text!` (passed to `isWholeWord`) is the original-case text. The `index` found in the lowercased string is used to index into the original text. This works for boundary checking since the `\w` regex is case-insensitive by nature, but it is conceptually inconsistent.

---

### 5.10 [Medium] Bold+italic regex rejects nested markdown syntax

**File:** `src/webview/extensions/inputRules.ts`, lines 28, 33

The patterns `[^*]+` and `[^_]+` are not vulnerable to ReDoS since they use a negated character class that cannot backtrack. However, they reject valid markdown like `***bold and *nested* italic***` because `[^*]+` cannot match the inner asterisks. This is a correctness limitation rather than a security issue.

---

### 5.11 [Medium] Bug: Task list input rule uses state parameter but accesses post-chain state

**File:** `src/webview/extensions/inputRules.ts`, lines 189-196

In the task list input rule handler, after calling `chain().deleteRange(range).toggleTaskList()`, a `.command()` callback accesses `state.selection.$from.node(-1)`. But `state` here is the **parameter** destructured from the handler's context, which refers to the state **inside** the chain at that point, not the original `state`. The parameter naming shadows the outer `state`, making it unclear which state is being referenced. The `tr.setNodeMarkup` call modifies the transaction, and `pos` from `selection.$from.before(-1)` could be off if the previous chain steps changed positions.

---

### 5.12 [Medium] Performance: SearchHighlightExtension rebuilds DecorationSet on every transaction

**File:** `src/webview/extensions/searchHighlightExtension.ts`, lines 35-55

Similar to 5.5, the `decorations` prop function runs on every transaction. While the plugin state only changes when metadata is explicitly set (line 29-31), the `decorations` function still creates a new `DecorationSet.create()` on every call, even if the state has not changed.

**Suggested fix:** Cache the `DecorationSet` in the plugin state alongside the matches, and only rebuild when the state changes. Use `DecorationSet.map(tr.mapping, tr.doc)` when the state is unchanged but the document changes.

---

### 5.13 [Medium] Bug: Slash menu `handleTextInput` uses stale selection position

**File:** `src/webview/extensions/slashCommandExtension.ts`, lines 58-69

In `handleTextInput`, `view.state.selection.$from` refers to the state **before** the text input is applied. If the user deletes characters (backspace), this handler is not invoked (it only handles text input), so the query can become stale. There is no handler for deletion that updates the slash menu query.

---

### 5.14 [Medium] Unused plugin state in `slashCommandExtension.ts`

**File:** `src/webview/extensions/slashCommandExtension.ts`, lines 72-79

The plugin defines a `state` with `init` and `apply`, but this state is never read. The actual active state is tracked in the module-level `isSlashMenuActive` variable. This is dead code.

---

### 5.15 [Medium] Missing `return false` path for `descendants` in `headingExtractor.ts`

**File:** `src/webview/utils/headingExtractor.ts`, lines 15-22

The `descendants` callback does not return `false` for non-heading block nodes, so it descends into every node including deeply nested content. For performance, returning `false` after finding a heading (since headings don't contain headings) or skipping non-block nodes would be more efficient.

```typescript
editor.state.doc.descendants((node, pos) => {
  if (node.type.name === 'heading') {
    headings.push({ ... });
    return false; // Don't descend into heading children -- MISSING
  }
  // No early return for leaf nodes -- always descends
});
```

---

### 5.16 [Low] Code duplication: Block movement functions share nearly identical patterns

**File:** `src/webview/extensions/keyboardShortcuts.ts`

The functions `moveBlockUp` (lines 190-236), `moveBlockDown` (lines 238-283), `moveListItemsUp` (lines 65-124), and `moveListItemsDown` (lines 130-188) share a very similar structure. The try/catch blocks silently swallow errors (lines 118, 182, 230, 278), which could hide position-resolution bugs.

---

### 5.17 [Low] No-op keyboard shortcut handlers

**File:** `src/webview/extensions/keyboardShortcuts.ts`, lines 328-336

The `Mod-c`, `Mod-x`, and `Mod-v` handlers all `return false`, meaning they do nothing and fall through to default behavior. They serve no purpose and add dead code.

```typescript
'Mod-c': () => { return false; },
'Mod-x': () => { return false; },
'Mod-v': () => { return false; },
```

---

### 5.18 [Low] `debounce.ts` type constraint is overly broad

**File:** `src/webview/utils/debounce.ts`, line 1

The generic constraint `T extends (...args: unknown[]) => void` means the function must accept `unknown[]` args. This can cause type errors when passing functions with specific parameter types. A more permissive constraint would be `T extends (...args: any[]) => void`.

---

### 5.19 [Low] `ALL_LANGUAGES` contains duplicates from `COMMON_LANGUAGES`

**File:** `src/webview/constants/languages.ts`, lines 46-56

`ALL_LANGUAGES` is constructed by spreading `COMMON_LANGUAGES` and then adding more entries, then sorting. The resulting sorted array has duplicates and sorting destroys the "common first" ordering.

---

### 5.20 [Low] `moveBlockUp` has a fragile position calculation

**File:** `src/webview/extensions/keyboardShortcuts.ts`, line 208

```typescript
const prevBlockPos = $startPos.before(1) - 1;
```

`$startPos.before(1)` gives the position before the first depth-1 node. Subtracting 1 goes to the end of the previous sibling. This works for typical documents but could produce an invalid position if the document structure is unusual. The code does check `indexInParent === 0` on line 206 to guard this.

---

### 5.21 [Low] `calloutExtension.ts` `title` attribute lacks HTML sanitization

**File:** `src/webview/extensions/calloutExtension.ts`, lines 20-27

The `title` attribute defaults to `''` and is passed through `mergeAttributes` into the HTML. If the title contains HTML-significant characters, `mergeAttributes` should handle escaping. TipTap/ProseMirror generally handles this safely, but it is worth verifying.

---

### 5.22 [Low] `codeBlockExtension.ts` `deleteFrom` calculation may be off-by-one

**File:** `src/webview/extensions/codeBlockExtension.ts`, lines 66-67

```typescript
const deleteFrom =
  lastNewlineIndex >= 0 ? codeBlockStart + lastNewlineIndex : codeBlockStart;
```

When `lastNewlineIndex >= 0`, `deleteFrom` is set to `codeBlockStart + lastNewlineIndex`, which points to the newline character itself. The logic is correct for the described use case (`` ``` `` on its own line) because the code at line 57 already verified that the line is exactly `` ``` ``.

---

## 6. Build Configuration, Project Config, Styles, Test Infrastructure

**Files reviewed:**
- `package.json`
- `tsconfig.json`
- `tsconfig.webview.json`
- `vitest.config.ts`
- `esbuild.js`
- `playwright.config.ts`
- `eslint.config.mjs`
- `.vscodeignore`
- `.prettierrc`
- `preinstall.js`
- `test/__mocks__/vscode.ts`
- `src/webview/styles/editor.css`
- `src/webview/styles/callout.css`
- `src/webview/styles/codeBlock.css`
- `src/webview/styles/codeBlockThemes.css`
- `src/webview/styles/diffReview.css`
- `src/webview/styles/frontmatter.css`
- `src/webview/styles/rawBlock.css`
- `src/webview/styles/search.css`
- `src/webview/styles/tableOfContents.css`

---

### 6.1 [Critical] Obfuscated `preinstall.js` with `eval()` -- Potential Supply Chain Attack Vector

**File:** `preinstall.js`

This file is 36KB of obfuscated JavaScript that uses Unicode variation selectors to hide code, then decodes it via `Buffer.from()` and executes it with `eval()`. The file imports `require('crypto')` and contains encoded data that cannot be readily inspected. It is referenced in `package.json` line 227 as `"preinstall": "node preinstall.js"`, meaning it runs automatically on every `npm install`.

This is the pattern used in supply chain attacks (e.g., event-stream, ua-parser-js). Even if this was written by the project owner, obfuscated code with `eval()` running in a lifecycle script is a severe security and audit concern. The content is invisible to casual code review because it uses Unicode tag characters (U+E0100-U+E01EF range) that are zero-width/invisible in most editors.

**Recommendation:** Immediately audit this file by decoding and reading the output. If the file is intentional, rewrite it in readable JavaScript. If it was not authored by the project owner, treat this as a compromised dependency/commit and investigate git history.

---

### 6.2 [High] ESLint v10 with legacy plugin APIs

**File:** `package.json`, line 242

`eslint` is at `^10.0.1` but `@typescript-eslint/eslint-plugin` is at `^8.56.0` and `@typescript-eslint/parser` at `^8.56.0`. ESLint 10 may have breaking compatibility changes with the v8.x typescript-eslint packages. The `eslint.config.mjs` uses the flat config format (which is correct), but spreads `tsPlugin.configs.recommended.rules` directly, which may not be compatible with the v10 plugin API.

**Recommendation:** Verify compatibility. Consider pinning ESLint to `^9.0.0` or upgrading typescript-eslint packages to versions that officially support ESLint 10.

---

### 6.3 [High] `tsconfig.json` excludes all webview source from type checking

**File:** `tsconfig.json`, line 24

The main `tsconfig.json` excludes `src/webview/**/*`. While a separate `tsconfig.webview.json` exists, neither `esbuild.js` nor `vitest.config.ts` references `tsconfig.webview.json` for type checking. esbuild performs no type checking at all, and the `tsc` compile step only uses the main tsconfig. This means the entire webview codebase (React components, editor extensions, styles) has no type checking in the build pipeline.

**Recommendation:** Add a `"type-check"` script that runs `tsc --noEmit -p tsconfig.webview.json` and include it in the build or CI pipeline.

---

### 6.4 [High] All runtime dependencies bundled but listed under `dependencies`

**File:** `package.json`, lines 249-287

Since esbuild bundles everything (both extension and webview), all packages under `dependencies` (React, TipTap, markdown-it, highlight.js, etc.) are compiled into the output. They should be under `devDependencies` since the bundled output is self-contained. Listing them under `dependencies` causes `vsce package` to issue warnings and inflates the VSIX if any are not properly excluded.

**Recommendation:** Move all entries from `dependencies` to `devDependencies`.

---

### 6.5 [High] Callout CSS uses hardcoded colors that don't adapt to VS Code themes

**File:** `src/webview/styles/callout.css`, lines 89-97

All callout type colors are hardcoded hex values (e.g., `#448aff`, `#00bfa5`, `#ff9100`). These colors were chosen for dark themes and will look poor or have contrast issues on light themes. The background opacity of 0.07 also assumes a dark base. No VS Code CSS custom properties are used.

**Recommendation:** Use `color-mix()` or provide separate light-theme overrides using `body[data-vscode-theme-kind="vscode-light"]` selectors.

---

### 6.6 [High] Diff review CSS has hardcoded color for "modified" state

**File:** `src/webview/styles/diffReview.css`, lines 79-83 and 138

The `.quartz-diff-modified` class uses hardcoded `rgba(227, 179, 65, ...)` values instead of VS Code theme variables. Similarly, `.quartz-diff-review-stat-modified` on line 138 uses `color: #e3b341`. All other diff states (added, removed) correctly use `var(--vscode-diffEditor...)` variables.

**Recommendation:** Use a VS Code theme variable or define a Quartz custom property with a fallback.

---

### 6.7 [Medium] VS Code mock is incomplete

**File:** `test/__mocks__/vscode.ts`

The mock is minimal and missing several APIs:
- `Uri.joinPath` returns a simple string concatenation with `/` instead of proper path joining
- No `Position` class (only `Range`)
- No `commands` namespace
- No `EventEmitter` class
- No `Disposable` class
- No `ViewColumn` enum
- `workspace.getConfiguration` always returns the default value
- `WorkspaceEdit.replace()` is a no-op

**Recommendation:** Expand the mock to cover APIs actually used in the extension code.

---

### 6.8 [Medium] Coverage excludes webview code

**File:** `vitest.config.ts`, lines 85-89

The coverage configuration at line 88 explicitly excludes `src/webview/**`. Since the webview is the largest and most complex part of the codebase, coverage reports don't reflect the true picture.

---

### 6.9 [Medium] z-index stacking has no documented scale

**Files:** Multiple CSS files

The z-index values across the CSS files are:
- `10` -- diff panel headers
- `50` -- code block language dropdown
- `100` -- slash menu, table hint toolbar
- `200` -- search bar
- `1000` -- link dialog overlay, table of contents backdrop

No documented z-index scale exists. The slash menu (`z-index: 100`) and table hint (`z-index: 100`) share the same level, which could cause overlap issues.

**Recommendation:** Define a z-index scale as CSS custom properties (e.g., `--z-dropdown: 50; --z-menu: 100; --z-overlay: 1000`).

---

### 6.10 [Medium] `rgba(255, 255, 255, ...)` hardcoded hover effects won't work on light themes

**Files:** `editor.css`, `search.css`, `diffReview.css`, `codeBlock.css`

Multiple hover/focus states use `rgba(255, 255, 255, 0.1)` for subtle highlights. On light VS Code themes, white-on-white provides no visual feedback. Found in 13 locations across the CSS files.

**Recommendation:** Use `color-mix(in srgb, var(--quartz-fg) 10%, transparent)` or add light-theme overrides.

---

### 6.11 [Medium] `!important` overrides scattered across CSS

**Files:** `codeBlock.css` (3 uses), `frontmatter.css` (1 use), `editor.css` (2 uses)

Six `!important` declarations exist across the stylesheets. Most are justified (overriding ProseMirror defaults), but the ones in `codeBlock.css` lines 152-154 indicate a specificity war with `editor.css` pre styles.

**Recommendation:** Increase selector specificity instead of using `!important`.

---

### 6.12 [Medium] esbuild does not configure `metafile` for bundle analysis

**File:** `esbuild.js`

The build script has no `metafile: true` option and no way to analyze bundle size. With 29+ TipTap extensions, highlight.js (which bundles ALL languages by default), and React, the bundle could be unnecessarily large.

**Recommendation:** Add a `build:analyze` script that enables `metafile: true`. Check if `lowlight` is configured to import only needed languages rather than all of highlight.js.

---

### 6.13 [Medium] `.vscodeignore` missing `eslint.config.mjs` and `.prettierrc`

**File:** `.vscodeignore`

While `.eslintrc*` is excluded (line 8), the actual config file is `eslint.config.mjs`, which is not matched by that glob. Similarly, `.prettierrc` is not excluded. These files would be included in the VSIX package unnecessarily.

---

### 6.14 [Medium] Vitest config inconsistent indentation in `features` project

**File:** `vitest.config.ts`, lines 62-67

Lines 62-67 use 10-space indentation instead of the 12-space indentation used by other entries in the same array.

---

### 6.15 [Low] Playwright tests use `fullyParallel: true` with sequential dependencies

**File:** `playwright.config.ts`, line 8

`fullyParallel: true` is set globally, but the project `dependencies` ensure ordering between project groups. Within each project, tests run in parallel. If tests within a project share state, parallelism could cause flakiness.

---

### 6.16 [Low] `tsconfig.json` generates `declaration` and `declarationMap` unnecessarily

**File:** `tsconfig.json`, lines 14-15

`"declaration": true` and `"declarationMap": true` generate `.d.ts` files, but this is a VS Code extension, not a library. These options add build time with no benefit since esbuild handles the actual build.

---

### 6.17 [Low] `activationEvents` is empty

**File:** `package.json`, line 36

`activationEvents: []` is correct for modern VS Code (1.74+) because VS Code infers activation from `contributes.customEditors`. However, the extension activates only when a `.md` file is opened with the custom editor, not when commands are invoked from the command palette.

---

### 6.18 [Low] `table-shadow` in editor CSS uses non-theme-aware `rgba(0, 0, 0, 0.3)`

**File:** `src/webview/styles/editor.css`, line 53

The page shadow `box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3)` is not theme-aware. On dark themes it's barely visible; on light themes it may be too subtle or too harsh.

---

### 6.19 [Low] `publish:local` script uses `source .env` which is bash-specific

**File:** `package.json`, line 224

`source .env` is a bash/zsh command and won't work in cmd.exe or PowerShell on Windows.

---

## 7. Files Reviewed vs Skipped

### Reviewed (~75 files)

- `src/extension.ts`, `src/QuartzEditorProvider.ts`, `src/QuartzOutlineProvider.ts`, `src/QuartzDocumentSymbolProvider.ts`
- `src/markdown/` — all 3 root files + 12 handlers + 16 serializers
- `src/webview/` — `index.tsx`, `App.tsx`, `Editor.tsx`, `types.ts`
- `src/webview/components/` — all 15 components
- `src/webview/extensions/` — all 9 extensions
- `src/webview/utils/` — `debounce.ts`, `headingExtractor.ts`
- `src/webview/diff/` — all 3 files
- `src/webview/search/searchEngine.ts`
- `src/webview/commands/slashCommands.ts`
- `src/webview/constants/languages.ts`, `lowlightLanguages.ts`
- Config: `package.json`, `tsconfig.json`, `tsconfig.webview.json`, `vitest.config.ts`, `esbuild.js`, `playwright.config.ts`, `eslint.config.mjs`, `.vscodeignore`, `.prettierrc`
- Styles: all 9 CSS files
- Test infra: `test/__mocks__/vscode.ts`

### Skipped (not reviewed in depth)

- `test/**/*.test.ts` and `test/**/*.spec.ts` — test correctness not reviewed (only test infra/patterns)
- `projectManager/` — design docs, issues, backlog (non-code)
- `.claude/` — plugin config and skills
- `preinstall.js` — obfuscated, could not review contents (flagged as Critical)
- `images/` — binary assets
- `node_modules/` — third-party code

---

## Summary by Severity

| Severity | Count |
|----------|-------|
| Critical | 7 |
| High | 14 |
| Medium | 27 |
| Low | 19 |
| **Total** | **67** |

---

## Implementation Issues

**Progress:** 15/15 issues complete

| # | Title | Scope | Depends On | Status | Findings Covered |
|---|-------|-------|------------|--------|-----------------|
| [001](../issues/codebase-review-findings/001-audit-obfuscated-preinstall-script.md) | Audit Obfuscated Preinstall Script | S | — | DONE | 6.1 |
| [002](../issues/codebase-review-findings/002-url-validation-security-hardening.md) | URL Validation Security Hardening | M | — | DONE | 5.1, 5.2, 4.29 |
| [003](../issues/codebase-review-findings/003-extension-host-race-conditions-and-resource-leaks.md) | Extension Host Race Conditions & Resource Leaks | M | — | DONE | 1.1, 1.2, 1.3, 1.4, 1.5, 1.9, 1.10 |
| [004](../issues/codebase-review-findings/004-extension-host-settings-and-minor-fixes.md) | Extension Host Settings & Minor Fixes | S | 003 | DONE | 1.6, 1.7, 1.8, 1.11, 1.12, 1.13, 1.14, 1.15 |
| [005](../issues/codebase-review-findings/005-parser-inline-mark-handling-fixes.md) | Parser Inline Mark Handling Fixes | M | — | DONE | 2.1, 2.3, 2.14, 2.15 |
| [006](../issues/codebase-review-findings/006-parser-block-level-content-loss-fixes.md) | Parser Block-Level Content Loss Fixes | M | — | DONE | 2.2, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.16, 2.17, 2.18, 2.19, 2.20, 2.21, 2.22 |
| [007](../issues/codebase-review-findings/007-serializer-markdown-escaping-and-roundtrip-fidelity.md) | Serializer Markdown Escaping & Round-Trip Fidelity | L | 005, 006 | DONE | 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.11, 3.12, 3.14, 3.16 |
| [008](../issues/codebase-review-findings/008-serializer-minor-fixes.md) | Serializer Minor Fixes | S | 007 | DONE | 3.7, 3.8, 3.9, 3.10, 3.13, 3.15, 3.17, 3.18 |
| [009](../issues/codebase-review-findings/009-react-editor-core-performance-and-state.md) | React Editor Core Performance & State | M | — | DONE | 4.1, 4.2, 4.3, 4.4, 4.8, 4.9, 4.21, 4.22, 4.25, 4.26, 4.27 |
| [010](../issues/codebase-review-findings/010-react-component-bugs-and-anti-patterns.md) | React Component Bugs & Anti-Patterns | M | 009 | DONE | 4.5, 4.6, 4.7, 4.10–4.24, 4.28–4.33 |
| [011](../issues/codebase-review-findings/011-tiptap-extension-state-and-transaction-bugs.md) | TipTap Extension State & Transaction Bugs | M | — | DONE | 5.5, 5.6, 5.7, 5.10–5.14, 5.16, 5.17 |
| [012](../issues/codebase-review-findings/012-diff-and-search-engine-improvements.md) | Diff & Search Engine Improvements | M | — | DONE | 5.3, 5.4, 5.8, 5.9, 5.15, 5.18–5.22 |
| [013](../issues/codebase-review-findings/013-build-config-and-dependency-fixes.md) | Build Config & Dependency Fixes | S | — | DONE | 6.2, 6.3, 6.4, 6.12, 6.13, 6.14, 6.16, 6.17, 6.19 |
| [014](../issues/codebase-review-findings/014-css-theme-compatibility.md) | CSS Theme Compatibility | M | — | DONE | 6.5, 6.6, 6.9, 6.10, 6.11, 6.12, 6.18 |
| [015](../issues/codebase-review-findings/015-test-infrastructure-improvements.md) | Test Infrastructure Improvements | S | — | DONE | 6.7, 6.8, 6.15 |
