# Markdown Parsing & Editing Fixes (QA Round 2)

**Author:** Mathuran Sadagopan
**Status:** COMPLETED
**Created:** 2026-02-15
**Last Updated:** 2026-02-15
**Reviewers:** TBD
**Related Docs:** [notion-markdown-editor](./notion-markdown-editor.md), [comprehensive-test-suite](./comprehensive-test-suite.md)

---

## 1. Problem Statement

Manual QA testing of the Quartz markdown editor revealed 13 distinct bugs across markdown parsing, rendering, and editing operations. While the slash command menu and toolbar-based formatting work correctly, **manually typed markdown syntax fails to render properly for tables, links, lists, code blocks, blockquotes, and combined formatting**. Additionally, core editing operations like undo/redo and copy/paste have significant usability issues.

These bugs make the editor unreliable for users who type markdown directly (the majority use case). Users expect `**bold**` typed in the editor to render as **bold** immediately — not display literal asterisks. The gap between "slash command works, typed syntax doesn't" creates a confusing and inconsistent experience.

**Impact:** Users will abandon the editor after encountering 2-3 of these issues. The editor currently only works reliably when using the toolbar/slash commands, which defeats the purpose of a markdown-first workflow.

---

## 2. Goals and Non-Goals

### Goals

| Priority | Goal | Success Metric |
|----------|------|----------------|
| **P0** | Add table editing keyboard shortcuts (add/remove rows/columns) | All 4 shortcuts work; hint UI visible when cursor in table |
| **P0** | Remove drag handle; use Option+Arrow to move blocks | Option+↑/↓ moves current block or selection up/down |
| **P0** | Fix manually typed links `[text](url)` to create clickable links | Links become clickable immediately; clicking opens URL |
| **P0** | Fix list item rendering (no visible dashes/double numbers) | All list items render without markdown artifacts |
| **P0** | Fix code block closure to not break document structure | Multiple code blocks render independently; subsequent content unaffected |
| **P0** | Fix blockquote nesting to keep blocks independent | Consecutive blockquotes render as separate blocks |
| **P1** | Add link URL input dialog for toolbar link button | Dialog opens on click; accepts URL; creates working link |
| **P1** | Fix combined bold+italic (`***text***`) formatting | Renders as bold-italic without visible asterisks |
| **P1** | Fix horizontal rule rendering (`---`, `***`, `___`) | Visible horizontal line rendered |
| **P1** | Improve undo/redo granularity | Undo removes ≤1 word per operation (not entire blocks) |
| **P2** | Add task list support (`- [ ]`, `- [x]`) | Renders as interactive checkboxes |
| **P2** | Fix copy/paste functionality | Copied text pastes correctly with formatting preserved |
| **P2** | Fix nested formatting (`*italic with **bold** inside*`) | No trailing asterisks; correct nesting |

### Non-Goals

- **HTML tag rendering** — HTML tags will display as escaped text or be stripped. Supporting arbitrary HTML is out of scope.
- **Real-time collaborative editing** — Single-user undo/redo only.
- **WYSIWYG mode toggle** — No raw markdown view mode in this iteration.
- **Performance optimization** — Focus is correctness, not speed (unless rendering takes >1s).

---

## 3. Background and Context

### Current Architecture

The editor uses TipTap (ProseMirror-based) with a two-way markdown bridge:
- **Parser:** `markdown-it` → ProseMirror nodes (on file load)
- **Serializer:** ProseMirror nodes → markdown text (on save)
- **Input Rules:** TipTap extensions that detect typed markdown patterns and convert to blocks in real-time

### Why Slash Commands Work But Typing Doesn't

Slash commands directly insert pre-formed ProseMirror nodes (e.g., a table node with cells). Typed markdown relies on **input rules** — regex patterns that detect syntax like `|---|` and trigger node insertion.

The bugs indicate:
1. **Missing input rules** for tables, links, horizontal rules
2. **Incorrect input rules** for lists (not stripping the dash prefix)
3. **Parser bugs** for code blocks (not detecting closure correctly)
4. **Mark handling bugs** for combined bold+italic and nested marks

### Related Issues

- `projectManager/issues/notion-markdown-editor/002-markdown-to-prosemirror-parser.md` — Original parser implementation (needs fixes)
- `projectManager/issues/qa-round1-fixes/` — First round of QA fixes (CSS, drag handle, focus)

---

## 4. Proposed Solution

### Overview

We will fix each bug category through a combination of:
1. **Input rule additions/fixes** — For real-time typed markdown conversion
2. **Parser fixes** — For file load and paste operations
3. **Mark extension fixes** — For inline formatting combinations
4. **TipTap extension configuration** — For list rendering and blockquote behavior
5. **Undo history configuration** — For granularity improvements

### Detailed Fixes by Category

#### 4.1 Tables (P0)

**Decision:** Tables will **only** be created via the slash command (`/table`). Manually typed markdown table syntax will not be supported — this is intentional, as markdown table syntax is cumbersome to type.

**Problem:** Once a table exists, there's no efficient way to add/remove rows and columns.

**Solution:** Add 4 keyboard shortcuts for table manipulation, plus a subtle UI hint showing shortcuts when editing.

##### Keyboard Shortcuts

Based on research of [Confluence](https://community.atlassian.com/forums/Confluence-questions/Just-what-is-the-keyboard-shortcut-for-inserting-a-new-row-in-a/qaq-p/1079369), [Google Sheets](https://support.google.com/docs/answer/181110), and [Notion](https://www.notion.com/help/keyboard-shortcuts), the **Ctrl/Cmd + Alt + Arrow** pattern is the most established convention:

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Add row below | `⌘ + ⌥ + ↓` | `Ctrl + Alt + ↓` |
| Add column right | `⌘ + ⌥ + →` | `Ctrl + Alt + →` |
| Delete current row | `⌘ + ⌥ + Backspace` | `Ctrl + Alt + Backspace` |
| Delete current column | `⌘ + ⌥ + Shift + Backspace` | `Ctrl + Alt + Shift + Backspace` |

**Rationale:**
- **Arrow keys for add:** Intuitive direction (down = add below, right = add right)
- **Backspace for delete:** Consistent with text deletion; Shift modifier distinguishes row vs column
- **Ctrl/Cmd + Alt modifier:** Matches Confluence and avoids conflicts with OS shortcuts

**Alternative considered:** Using `+` and `-` keys (like some spreadsheets), but these conflict with zoom shortcuts and are less discoverable.

##### UI Hint

When the cursor is inside a table cell, show a subtle floating hint bar below the table:

```
┌─────────────────────────────────────────────────────────┐
│  ⌘⌥↓ Add row  ·  ⌘⌥→ Add column  ·  ⌘⌥⌫ Delete row    │
└─────────────────────────────────────────────────────────┘
```

**Hint behavior:**
- Appears 500ms after cursor enters table (debounced)
- Positioned below the table, left-aligned
- Semi-transparent (opacity: 0.6), small font (11px)
- Disappears when cursor leaves table
- Can be dismissed permanently via settings (`quartz.showTableHints: false`)

**Implementation:**
```typescript
// In tableShortcuts.ts
editor.addKeyboardShortcuts({
  'Mod-Alt-ArrowDown': () => editor.commands.addRowAfter(),
  'Mod-Alt-ArrowRight': () => editor.commands.addColumnAfter(),
  'Mod-Alt-Backspace': () => editor.commands.deleteRow(),
  'Mod-Alt-Shift-Backspace': () => editor.commands.deleteColumn(),
});
```

TipTap's Table extension already provides `addRowAfter()`, `addColumnAfter()`, `deleteRow()`, and `deleteColumn()` commands — we just need to bind them to shortcuts.

#### 4.2 Block Movement — Remove Drag Handle (P0)

**Decision:** Remove the 6-dot drag handle entirely. Replace with VS Code-style keyboard shortcuts for moving blocks.

**Problem:** The drag handle has persistent positioning bugs and adds visual clutter. Users familiar with VS Code expect `Option + ↑/↓` to move lines/blocks.

**Solution:**

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Move block/line up | `⌥ + ↑` | `Alt + ↑` |
| Move block/line down | `⌥ + ↓` | `Alt + ↓` |

**Behavior:**
- If cursor is in a block (paragraph, heading, list item, etc.), move the entire block
- If text is selected across multiple blocks, move the entire selection as a unit
- Works identically to VS Code's line movement

**Implementation:**
1. **Remove** `src/webview/extensions/dragHandle.ts` entirely
2. **Remove** `.quartz-drag-handle` CSS rules from `editor.css`
3. **Add** keyboard shortcuts to `keyboardShortcuts.ts`:

```typescript
editor.addKeyboardShortcuts({
  'Alt-ArrowUp': () => {
    // Get current block or selection, move up
    return editor.commands.moveNodeUp();
  },
  'Alt-ArrowDown': () => {
    return editor.commands.moveNodeDown();
  },
});
```

Note: TipTap doesn't have built-in `moveNodeUp`/`moveNodeDown` commands. We'll need to implement these using ProseMirror transactions:

```typescript
// Custom command to move current node up
const moveNodeUp = ({ state, dispatch }) => {
  const { selection } = state;
  const { $from } = selection;
  const blockStart = $from.start($from.depth);

  // Find previous sibling block
  // Swap positions via transaction
  // Return true if moved, false if at top
};
```

**Benefits:**
- Matches VS Code muscle memory
- No visual clutter (no handle to position/style)
- Works for all block types uniformly
- Simpler codebase (removes ~250 lines of drag handle code)

**Files to modify:**
- Delete: `src/webview/extensions/dragHandle.ts`
- Edit: `src/webview/styles/editor.css` (remove drag handle styles)
- Edit: `src/webview/Editor.tsx` (remove dragHandleExtension import)
- Edit: `src/webview/extensions/keyboardShortcuts.ts` (add move commands)

#### 4.3 Links (P0)

**Problem:** `[text](url)` displays literally instead of creating a link.

**Solution:**
- Add input rule for markdown link syntax
- Add URL input dialog when toolbar link button is clicked
- Ensure link mark stores `href` attribute correctly

**Input Rule:**
```typescript
const linkInputRule = markInputRule({
  find: /\[([^\]]+)\]\(([^)]+)\)$/,
  type: schema.marks.link,
  getAttrs: (match) => ({ href: match[2] }),
});
```

**Toolbar Dialog:**
- On link button click, show modal with URL input
- Validate URL format before applying
- Apply link mark to selected text

#### 4.4 Lists (P0)

**Problem:** List items show raw markdown (`- Item 2`, `2. 2. Second`).

**Root Cause:** The list item node is rendering its markdown prefix as text content.

**Solution:**
- Fix the BulletList and OrderedList extension `renderHTML` to not include prefix
- Ensure parser strips prefix from text content
- Review `listItem` node schema for content handling

#### 4.5 Code Blocks (P0)

**Problem:** Closing ``` doesn't close the block; content leaks.

**Solution:**
- Fix CodeBlock extension's input rule for detecting closure
- Ensure ``` on its own line exits the code block
- Handle language specifier correctly on opening

#### 4.6 Blockquotes (P0)

**Problem:** Multiple `>` lines incorrectly nest into each other.

**Solution:**
- Fix blockquote input rule to detect paragraph breaks as block boundaries
- Ensure blank line between quotes creates separate blockquote nodes
- Review ProseMirror's lift/wrap behavior for quotes

#### 4.7 Combined Formatting (P1)

**Problem:** `***bold italic***` shows literal asterisks.

**Solution:**
- Add input rule for `***text***` pattern
- Apply both bold and italic marks simultaneously
- Order matters: detect `***` before `**` and `*`

#### 4.8 Horizontal Rules (P1)

**Problem:** `---`, `***`, `___` don't render.

**Solution:**
- Verify HorizontalRule extension is loaded
- Add input rules for all three syntaxes
- Ensure rule triggers on newline after the dashes

#### 4.9 Undo/Redo (P1)

**Problem:** Undo removes entire blocks instead of per-character/word.

**Solution:**
- Configure TipTap's history extension with `newGroupDelay` setting
- Default is 500ms; reduce to 150ms for finer granularity
- Or use `depth` option to limit undo stack merging

```typescript
History.configure({
  newGroupDelay: 150, // Group changes within 150ms
})
```

#### 4.10 Task Lists (P2)

**Problem:** `- [ ]` and `- [x]` render as literal text.

**Solution:**
- Verify TaskList and TaskItem extensions are loaded
- Add input rules for `- [ ] ` and `- [x] `
- Ensure checkbox state toggles on click

#### 4.11 Copy/Paste (P2)

**Problem:** Copy/paste doesn't work.

**Solution:**
- Debug clipboard event handlers in TipTap
- Ensure `clipboardTextSerializer` is configured
- Test with `text/plain` and `text/html` MIME types

---

## 5. Alternative Solutions Considered

### Alternative A: Raw Markdown Mode Toggle

**Approach:** Instead of fixing input rules, add a toggle to switch between raw markdown view and rendered view.

**Pros:**
- Simpler implementation
- Users can fall back to raw mode for complex syntax

**Cons:**
- Doesn't solve the core problem
- Poor UX — defeats WYSIWYG purpose
- Users still expect typed markdown to "just work"

**Decision:** Rejected. Users expect typed markdown to render; a toggle is a workaround, not a fix.

### Alternative B: Abandon Input Rules, Require Slash Commands

**Approach:** Remove all markdown input rules; require slash commands for everything.

**Pros:**
- Consistent behavior
- Easier to maintain

**Cons:**
- Alien to markdown users
- Slower workflow
- Competitive disadvantage vs. Notion/Obsidian

**Decision:** Rejected. Input rules are core to the markdown editor value proposition.

### Alternative C: Use Milkdown Instead of TipTap

**Approach:** Replace TipTap with Milkdown, which has better markdown input rule support out of the box.

**Pros:**
- Milkdown designed specifically for markdown editing
- Many input rules work by default

**Cons:**
- Major refactor (2-3 weeks)
- Lose existing customizations
- Different plugin ecosystem

**Decision:** Rejected for now. TipTap's issues are fixable; refactoring is premature.

---

## 6. Security, Privacy, and Compliance

### Link Handling

- **URL Validation:** The link dialog will validate URLs to prevent `javascript:` protocol injection
- **XSS Prevention:** All link `href` values will be sanitized before rendering
- **Target Attribute:** External links will use `target="_blank"` with `rel="noopener noreferrer"`

### Clipboard

- **Paste Sanitization:** HTML pasted from external sources will be sanitized to strip scripts and styles
- **No Clipboard Sniffing:** Editor will not access clipboard without user-initiated paste action

### No New Data Storage

- These fixes do not introduce any new data storage or external communication
- All changes are local to the editor rendering logic

---

## 7. Testing Strategy

### Unit Tests

| Test | Description |
|------|-------------|
| `table.shortcuts.test.ts` | Table add/delete row/column shortcuts work |
| `block.move.test.ts` | Option+Arrow moves blocks up/down |
| `link.input-rule.test.ts` | `[text](url)` creates link mark with href |
| `list.render.test.ts` | List items render without markdown prefix |
| `codeblock.closure.test.ts` | Code block closes on ``` line |
| `blockquote.independence.test.ts` | Blank line separates blockquotes |
| `marks.combined.test.ts` | `***text***` applies bold+italic |
| `horizontal-rule.test.ts` | `---`, `***`, `___` create HR nodes |
| `undo.granularity.test.ts` | Undo removes ≤1 word |
| `tasklist.input-rule.test.ts` | `- [ ]` creates task item |
| `paste.formatting.test.ts` | Pasted content preserves formatting |

### E2E Tests (Playwright)

| Test | Description |
|------|-------------|
| `e2e/table-shortcuts.spec.ts` | Table keyboard shortcuts add/remove rows/columns |
| `e2e/block-move.spec.ts` | Option+Arrow moves blocks up/down |
| `e2e/typed-link.spec.ts` | Type link syntax, verify clickable |
| `e2e/list-formatting.spec.ts` | Verify no visible dashes/numbers |
| `e2e/codeblock-multi.spec.ts` | Multiple code blocks don't leak |
| `e2e/undo-redo.spec.ts` | Undo removes small chunks |

### Manual QA Checklist

- [ ] Insert table via `/table`, press `⌘⌥↓` — new row appears below
- [ ] In table, press `⌘⌥→` — new column appears to the right
- [ ] In table, press `⌘⌥⌫` — current row deleted
- [ ] In table, press `⌘⌥⇧⌫` — current column deleted
- [ ] Cursor in table — shortcut hint bar appears below table
- [ ] Place cursor in paragraph, press `⌥↑` — paragraph moves up
- [ ] Place cursor in paragraph, press `⌥↓` — paragraph moves down
- [ ] Select multiple blocks, press `⌥↓` — entire selection moves down
- [ ] Type `[Google](https://google.com)` — link clickable
- [ ] Type `- Item 1\n- Item 2` — no dashes visible
- [ ] Type `1. First\n2. Second` — no double numbers
- [ ] Type ``` js\nconsole.log('hi')\n``` — code block closes
- [ ] Type `> Quote 1\n\n> Quote 2` — separate blocks
- [ ] Type `***bold italic***` — renders styled
- [ ] Type `---` on new line — horizontal rule appears
- [ ] Cmd+Z multiple times — removes small chunks
- [ ] Type `- [ ] Task` — checkbox appears
- [ ] Copy text, paste elsewhere — works

---

## 8. Rollout Plan

### Phase 1: P0 Fixes (Critical)

**Timeline:** 3-4 days

1. Table editing shortcuts + hint UI
2. Remove drag handle; add Option+Arrow block movement
3. Links input rule + dialog
4. List rendering fix
5. Code block closure fix
6. Blockquote independence fix

**Validation:** Run full e2e test suite; manual QA on all 5 fixes.

### Phase 2: P1 Fixes (Important)

**Timeline:** 2-3 days

1. Combined bold+italic marks
2. Horizontal rule input rules
3. Undo/redo granularity config

**Validation:** Unit tests for each; manual QA.

### Phase 3: P2 Fixes (Nice to Have)

**Timeline:** 2 days

1. Task list support
2. Copy/paste debugging
3. Nested formatting edge cases

**Validation:** Unit tests; light manual QA.

### Monitoring

- No telemetry in extension; rely on user bug reports
- Add console warnings for unhandled markdown patterns (development only)

### Rollback

- Each fix is isolated to specific TipTap extensions
- Rollback = revert specific commits
- No database or state migration involved

---

## 9. Dependencies and Risks

### Dependencies

| Dependency | Owner | Status |
|------------|-------|--------|
| TipTap Table extension | TipTap maintainers | Stable (v2.x) |
| TipTap Link extension | TipTap maintainers | Stable |
| markdown-it parser | Project team | Implemented |
| E2E test harness | Project team | Implemented |

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Input rules conflict with existing extensions | High | Medium | Test each rule in isolation before combining |
| Performance regression from complex regexes | Medium | Low | Benchmark input rule execution time |
| Breaking existing working features | High | Medium | Run full regression suite after each fix |
| TipTap upgrade breaks customizations | Medium | Low | Pin TipTap version; test upgrades separately |

---

## 10. Open Questions

| Question | Owner | Status |
|----------|-------|--------|
| Should link dialog support relative paths? | @mathuran | Open |
| Should horizontal rule have visual variants? | @mathuran | Open |
| What's acceptable undo granularity? (word vs. character) | @mathuran | Open |
| Should we support GFM autolinks (`<https://url>`)? | @mathuran | Open |

---

## 11. Implementation Issues

| # | Title | Status | Scope | Priority |
|---|-------|--------|-------|----------|
| [001](../issues/markdown-parsing-fixes/001-remove-drag-handle.md) | Remove Drag Handle Extension | DONE | S | P0 |
| [002](../issues/markdown-parsing-fixes/002-block-movement-shortcuts.md) | Add Block Movement Keyboard Shortcuts | DONE | M | P0 |
| [003](../issues/markdown-parsing-fixes/003-table-editing-shortcuts.md) | Add Table Editing Keyboard Shortcuts | DONE | S | P0 |
| [004](../issues/markdown-parsing-fixes/004-table-shortcut-hint-ui.md) | Add Table Shortcut Hint UI | DONE | S | P0 |
| [005](../issues/markdown-parsing-fixes/005-fix-link-input-rule.md) | Fix Link Markdown Input Rule | DONE | M | P0 |
| [006](../issues/markdown-parsing-fixes/006-link-toolbar-dialog.md) | Add Link URL Dialog for Toolbar | DONE | M | P1 |
| [007](../issues/markdown-parsing-fixes/007-fix-list-rendering.md) | Fix List Item Rendering | DONE | M | P0 |
| [008](../issues/markdown-parsing-fixes/008-fix-code-block-closure.md) | Fix Code Block Closure | DONE | M | P0 |
| [009](../issues/markdown-parsing-fixes/009-fix-blockquote-nesting.md) | Fix Blockquote Nesting | DONE | S | P0 |
| [010](../issues/markdown-parsing-fixes/010-fix-combined-bold-italic.md) | Fix Combined Bold+Italic Formatting | DONE | S | P1 |
| [011](../issues/markdown-parsing-fixes/011-fix-horizontal-rule.md) | Fix Horizontal Rule Rendering | DONE | S | P1 |
| [012](../issues/markdown-parsing-fixes/012-improve-undo-redo-granularity.md) | Improve Undo/Redo Granularity | DONE | XS | P1 |
| [013](../issues/markdown-parsing-fixes/013-add-task-list-support.md) | Add Task List Input Rule | DONE | S | P2 |
| [014](../issues/markdown-parsing-fixes/014-fix-copy-paste.md) | Fix Copy/Paste Functionality | DONE | M | P2 |
| [015](../issues/markdown-parsing-fixes/015-cleanup-drag-handle-tests.md) | Clean Up Drag Handle Tests | DONE | XS | P0 |

**Progress:** 15/15 issues complete (100%)

---

## 12. Appendix

### A. Full Bug List from QA Round 2

**Critical (P0):**
1. ~~Tables typed manually don't render~~ → **Decision: Slash command only; add editing shortcuts instead**
2. Links `[text](url)` show as raw text
3. List items show dashes/double numbers
4. Code blocks break document structure
5. Blockquotes nest incorrectly

**Moderate (P1):**
6. Combined `***bold italic***` doesn't work
7. Horizontal rules don't render
8. Undo/redo too coarse

**Lower Priority (P2):**
9. Task lists not supported
10. Copy/paste may not work
11. HTML tags show literally
12. Hard to add content after tables
13. Nested formatting shows trailing asterisks

### B. Working Features (No Fix Needed)

- Slash command menu
- Tables via slash command
- Selection toolbar (B, I, S, Code, Heading)
- Toolbar formatting buttons
- All heading levels (H1-H6)
- Individual bold, italic, strikethrough
- Underscore variants for formatting
- Inline code
- Escaped characters
- Special characters
