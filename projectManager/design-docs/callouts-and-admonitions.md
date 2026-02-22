# Callouts and Admonitions Design Document

**Author:** Claude
**Status:** APPROVED
**Created:** 2026-02-21
**Last Updated:** 2026-02-22
**Reviewers:** Mathuran
**Backlog Item:** [callouts-and-admonitions](../backlog/callouts-and-admonitions.md)

---

## 1. Problem Statement

Technical writers, developers, and note-takers frequently need to visually emphasize blocks of content -- warnings, tips, notes, important callouts, and danger notices. Currently, Quartz renders all blockquotes as plain styled `<blockquote>` elements with no distinction between a regular quote and a callout. Users working with Obsidian-flavored markdown (`> [!note]`, `> [!warning]`, etc.) see their callouts rendered as plain blockquotes, losing the colored borders, icons, and semantic meaning that make callouts valuable.

The Obsidian callout syntax (`> [!type]`) is becoming a de facto standard across markdown tools. Without callout support, Quartz falls short for documentation and knowledge-base workflows -- the single most requested feature category across markdown editors.

## 2. Goals and Non-Goals

### Goals

- **P0: Parse `> [!type]` syntax into callout nodes** -- Detect Obsidian-style callout markers inside blockquote tokens and produce a dedicated `callout` node type in the TipTap document model
- **P0: Render callouts visually** -- Each of the 8 callout types (note, tip, warning, danger, info, example, quote, abstract) gets a distinct colored left border, background tint, and icon
- **P0: Serialize callouts back to `> [!type]` markdown** -- Round-trip fidelity: `parse(serialize(callout)) === callout` must hold
- **P0: Slash command `/callout`** -- Insert a callout block from the slash menu with a type picker
- **P1: Collapsible callouts** -- Support `> [!type]-` (collapsed by default) and `> [!type]+` (expanded by default) syntax with a toggle affordance in the rendered block
- **P1: Callout title support** -- Parse and render the optional title text after the type marker: `> [!note] Custom Title`

### Non-Goals

- Custom user-defined callout types (beyond the 8 built-in types)
- GitHub-flavored `> [!NOTE]` uppercase serialization output (parsing is already case-insensitive; we always serialize as lowercase Obsidian convention)
- Nested callouts within callouts
- Drag-and-drop reordering of callout blocks (handled by a separate drag-handle feature)
- Callout type auto-detection from content

## 3. Background and Context

### Current Blockquote Handling

**Parser (`src/markdown/handlers/blockquote.ts`):** The `blockquoteHandler` matches tokens where `token.type === 'blockquote_open'`, then delegates to `parseBlockquote()` which iterates inner tokens (paragraphs, lists, nested blockquotes) at depth tracking. It produces a TipTap `blockquote` node with child content nodes.

**Serializer (`src/markdown/serializers/blockquote.ts`):** The `blockquoteSerializer` handles the `blockquote` node type. It serializes child nodes, then prefixes every line with `> ` (or bare `>` for empty lines).

**Editor (`src/webview/Editor.tsx`):** The editor registers the standard TipTap `Blockquote` extension from `@tiptap/extension-blockquote`. No custom node view or styling beyond the default blockquote appearance.

### Obsidian Callout Syntax Specification

Obsidian callouts use blockquote syntax with a type marker on the first line:

```markdown
> [!note] Optional Title
> Content goes here.
> Can span multiple lines.
>
> Can include multiple paragraphs.
```

Key syntax rules:
- The type marker must be on the first line of the blockquote: `[!type]`
- Type is case-insensitive: `[!NOTE]`, `[!Note]`, and `[!note]` are equivalent
- An optional title follows the type marker on the same line
- Collapsible variants use `+` or `-` after the closing bracket:
  - `> [!note]+` -- expanded by default (default behavior, same as no suffix)
  - `> [!note]-` -- collapsed by default
- Content follows on subsequent `>` lines
- Standard 8 types: `note`, `tip`, `warning`, `danger`, `info`, `example`, `quote`, `abstract`

### How markdown-it Tokenizes Callouts

markdown-it does not natively understand callout syntax. A callout like:

```markdown
> [!warning] Be careful
> This is dangerous.
```

produces tokens:

```
blockquote_open
  paragraph_open
  inline: "[!warning] Be careful"
  paragraph_close
  paragraph_open
  inline: "This is dangerous."
  paragraph_close
blockquote_close
```

The `[!warning] Be careful` text appears as raw inline content of the first paragraph inside the blockquote. Our parser must inspect this first paragraph's text to detect the callout pattern.

## 4. Proposed Solution

### 4.1 Parser Changes: Callout Detection in Blockquote Handler

**File:** `src/markdown/handlers/blockquote.ts`

Modify the existing `blockquoteHandler` to inspect the first paragraph inside a blockquote for the callout pattern. If detected, produce a `callout` node instead of a `blockquote` node.

**Detection regex:**

```typescript
const CALLOUT_REGEX = /^\[!(note|tip|warning|danger|info|example|quote|abstract)\]([+-])?\s*(.*)?$/i;
```

**Logic change in `blockquoteHandler.handle()`:**

1. After calling `parseBlockquote()` to get the inner nodes, inspect the first child node
2. If the first child is a `paragraph` whose first text content matches `CALLOUT_REGEX`:
   - Extract `type` (lowercased), `foldable` (`+`, `-`, or `undefined`), and `title` from the regex match
   - Remove the callout marker text from the first paragraph (or remove the paragraph entirely if it only contained the marker)
   - Return a `callout` node instead of a `blockquote` node
3. If no match, return a regular `blockquote` node as before

**Produced node structure:**

```typescript
{
  type: 'callout',
  attrs: {
    calloutType: 'warning',      // one of the 8 types
    title: 'Be careful',          // optional title string, empty string if none
    collapsed: false,              // true if syntax was [!type]-
    foldable: true,                // true if + or - suffix was present
  },
  content: [
    // remaining blockquote content (paragraphs, lists, etc.)
    { type: 'paragraph', content: [{ type: 'text', text: 'This is dangerous.' }] }
  ]
}
```

**New file:** `src/markdown/handlers/callout.ts`

Extract callout detection logic into a helper that the blockquote handler calls. This keeps the callout-specific regex and node construction isolated.

```typescript
import type { JSONContent } from '@tiptap/core';

const CALLOUT_REGEX = /^\[!(note|tip|warning|danger|info|example|quote|abstract)\]([+-])?\s*(.*)?$/i;

export interface CalloutMatch {
  calloutType: string;
  title: string;
  collapsed: boolean;
  foldable: boolean;
}

/** Check if a paragraph node's text matches callout syntax. Returns match info or null. */
export function detectCallout(firstParagraph: JSONContent): CalloutMatch | null {
  const textContent = extractTextFromParagraph(firstParagraph);
  if (!textContent) return null;

  const match = textContent.match(CALLOUT_REGEX);
  if (!match) return null;

  return {
    calloutType: match[1].toLowerCase(),
    title: (match[3] || '').trim(),
    collapsed: match[2] === '-',
    foldable: match[2] === '+' || match[2] === '-',
  };
}
```

**Registration in `src/markdown/parser.ts`:** No new handler registration is needed -- the blockquote handler itself will produce `callout` nodes when the pattern is detected. This avoids token-ordering issues since markdown-it still emits `blockquote_open`/`blockquote_close`.

### 4.2 Custom TipTap Extension: `CalloutExtension`

**New file:** `src/webview/extensions/calloutExtension.ts`

Create a custom TipTap `Node` extension that defines the `callout` node type in the ProseMirror schema.

```typescript
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CalloutNodeView } from '../components/CalloutNodeView';

export interface CalloutOptions {
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { calloutType?: string; title?: string }) => ReturnType;
      toggleCallout: (attrs?: { calloutType?: string }) => ReturnType;
    };
  }
}

export const CalloutExtension = Node.create<CalloutOptions>({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return {
      types: ['note', 'tip', 'warning', 'danger', 'info', 'example', 'quote', 'abstract'],
    };
  },

  addAttributes() {
    return {
      calloutType: { default: 'note' },
      title: { default: '' },
      collapsed: { default: false },
      foldable: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attrs);
        },
      toggleCallout:
        (attrs) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attrs);
        },
    };
  },
});
```

**Registration in `src/webview/Editor.tsx`:**

```typescript
import { CalloutExtension } from './extensions/calloutExtension';

// In the extensions array:
CalloutExtension.configure({
  types: ['note', 'tip', 'warning', 'danger', 'info', 'example', 'quote', 'abstract'],
}),
```

The `CalloutExtension` must be registered **before** the standard `Blockquote` extension to ensure the schema recognizes `callout` nodes. The standard `Blockquote` extension remains for regular blockquotes.

### 4.3 Callout Rendering: Node View Component

**New file:** `src/webview/components/CalloutNodeView.tsx`

A React component rendered via `ReactNodeViewRenderer` that provides the visual callout appearance.

```typescript
interface CalloutNodeViewProps {
  node: {
    attrs: {
      calloutType: string;
      title: string;
      collapsed: boolean;
      foldable: boolean;
    };
  };
  updateAttributes: (attrs: Record<string, unknown>) => void;
}
```

**Visual design per callout type:**

| Type       | Color (border/bg)    | Icon | Default Title |
|------------|---------------------|------|---------------|
| `note`     | Blue (#448aff)      | Pencil icon | Note |
| `tip`      | Cyan (#00bfa5)      | Flame icon | Tip |
| `warning`  | Orange (#ff9100)    | Alert triangle | Warning |
| `danger`   | Red (#ff1744)       | Zap/lightning | Danger |
| `info`     | Blue (#448aff)      | Info circle | Info |
| `example`  | Purple (#7c4dff)    | List icon | Example |
| `quote`    | Gray (#9e9e9e)      | Quote mark | Quote |
| `abstract` | Teal (#00b8d4)      | Clipboard | Abstract |

**Rendered HTML structure:**

```html
<div class="quartz-callout" data-callout-type="warning">
  <div class="quartz-callout-header">
    <span class="quartz-callout-icon"><!-- SVG icon --></span>
    <input class="quartz-callout-title" value="Be careful" /><!-- controlled input, stored as node attr -->
    <button class="quartz-callout-fold" aria-label="Toggle callout">
      <!-- chevron icon, rotated when collapsed -->
    </button>
  </div>
  <div class="quartz-callout-content" data-collapsed="false">
    <!-- TipTap node content hole -->
  </div>
</div>
```

**CSS (`src/webview/styles/callout.css`):**

```css
.quartz-callout {
  border-left: 4px solid var(--callout-color);
  background: var(--callout-bg);
  border-radius: 4px;
  padding: 12px 16px;
  margin: 8px 0;
}

.quartz-callout-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--callout-color);
  cursor: pointer;
}

.quartz-callout-content[data-collapsed="true"] {
  display: none;
}

/* Type-specific colors */
.quartz-callout[data-callout-type="note"]    { --callout-color: #448aff; --callout-bg: #448aff12; }
.quartz-callout[data-callout-type="tip"]     { --callout-color: #00bfa5; --callout-bg: #00bfa512; }
.quartz-callout[data-callout-type="warning"] { --callout-color: #ff9100; --callout-bg: #ff910012; }
.quartz-callout[data-callout-type="danger"]  { --callout-color: #ff1744; --callout-bg: #ff174412; }
.quartz-callout[data-callout-type="info"]    { --callout-color: #448aff; --callout-bg: #448aff12; }
.quartz-callout[data-callout-type="example"] { --callout-color: #7c4dff; --callout-bg: #7c4dff12; }
.quartz-callout[data-callout-type="quote"]   { --callout-color: #9e9e9e; --callout-bg: #9e9e9e12; }
.quartz-callout[data-callout-type="abstract"]{ --callout-color: #00b8d4; --callout-bg: #00b8d412; }
```

### 4.4 Serializer: Callout to `> [!type]` Markdown

**New file:** `src/markdown/serializers/callout.ts`

```typescript
import type { JSONContent } from '@tiptap/core';
import type { NodeSerializer, SerializeContext } from './types';

export const calloutSerializer: NodeSerializer = {
  nodeTypes: ['callout'],
  serialize(node: JSONContent, _indent: number, context: SerializeContext): string {
    const { calloutType, title, collapsed, foldable } = node.attrs || {};

    // Build the marker line: [!type]+/- Optional Title
    let marker = `[!${calloutType || 'note'}]`;
    if (foldable) {
      marker += collapsed ? '-' : '+';
    }
    if (title) {
      marker += ` ${title}`;
    }

    // Serialize child content
    const innerLines: string[] = [];
    if (node.content) {
      for (const child of node.content) {
        const serialized = context.serializeNode(child, 0);
        if (serialized !== null) {
          innerLines.push(serialized);
        }
      }
    }

    // Combine: first line is the marker, then content
    const allLines = [marker, ...innerLines.join('\n').split('\n')];

    // Prefix every line with >
    return allLines
      .map((line) => (line ? `> ${line}` : '>'))
      .join('\n');
  },
};
```

**Registration in `src/markdown/serializer.ts`:**

```typescript
import { calloutSerializer } from './serializers/callout';

const builtInSerializers: NodeSerializer[] = [
  // ... existing serializers
  calloutSerializer,
];
```

**Round-trip example:**

```
Input:                                    Parsed node:                          Serialized:
> [!warning] Be careful                  { type: 'callout',                   > [!warning] Be careful
> This is dangerous.                       attrs: { calloutType: 'warning',   > This is dangerous.
                                             title: 'Be careful', ... },
                                           content: [{ type: 'paragraph',
                                             content: [{ type: 'text',
                                               text: 'This is dangerous.' }]
                                           }]
                                         }
```

### 4.5 Slash Command: `/callout` with Type Picker

**Changes to `src/webview/commands/slashCommands.ts`:**

Add 8 callout slash commands (one per type) grouped under a "Callout" category, plus a generic `/callout` entry that defaults to `note`:

```typescript
{
  id: 'callout',
  label: 'Callout',
  description: 'Highlighted callout block',
  icon: '!',
  aliases: ['callout', 'admonition', 'alert'],
  command: (editor) => editor.chain().focus().setCallout({ calloutType: 'note' }).run(),
},
{
  id: 'callout-warning',
  label: 'Warning Callout',
  description: 'Warning admonition block',
  icon: '!',
  aliases: ['warning', 'caution'],
  command: (editor) => editor.chain().focus().setCallout({ calloutType: 'warning' }).run(),
},
// ... similar entries for tip, danger, info, example, quote, abstract
```

**Changes to `src/webview/components/SlashMenu.tsx`:**

The existing slash menu filtering already handles aliases. When the user types `/callout`, all 8 callout variants will appear since they share the `callout` alias. Typing `/warning` narrows it to the warning variant. No structural changes to the SlashMenu component are needed.

**Changes to `src/webview/components/SlashMenu.tsx` `executeCommand()`:**

Add callout cases to the `switch (cmd.id)` block:

```typescript
case 'callout':
  return commands.setCallout({ calloutType: 'note' });
case 'callout-warning':
  return commands.setCallout({ calloutType: 'warning' });
// ... etc.
```

### 4.6 Collapsible Callouts

**Syntax:** `> [!type]-` means collapsed by default; `> [!type]+` means foldable but expanded by default. No suffix means non-foldable (always expanded).

**Parser:** The `CALLOUT_REGEX` already captures the optional `+`/`-` suffix in capture group 2. The `foldable` and `collapsed` attrs are set accordingly.

**Node view:** The `CalloutNodeView` component renders a toggle chevron button in the header when `foldable` is true. Clicking toggles the `collapsed` attribute via `updateAttributes({ collapsed: !node.attrs.collapsed })`. The content area uses `display: none` when collapsed.

**Serializer:** The callout serializer checks `foldable` and `collapsed` to produce the correct suffix (`+` or `-`). When collapsed, the content is still serialized to markdown -- the collapsed state only affects visual rendering.

**Important:** Even when a callout is visually collapsed in the editor, all content is preserved in the document model and serialized to markdown. The `collapsed` attribute is purely a rendering hint.

## 5. Alternative Solutions Considered

### Alternative A: markdown-it Plugin for Callout Tokens

Instead of detecting callouts inside the blockquote handler, write a custom markdown-it plugin that emits dedicated `callout_open`/`callout_close` tokens before the blockquote handler ever sees them.

**Pros:** Cleaner separation -- the blockquote handler never needs to know about callouts. A dedicated `calloutHandler` in `src/markdown/handlers/` matches `callout_open` tokens.
**Cons:** Writing a markdown-it plugin that correctly intercepts blockquote tokens and re-emits them as callout tokens is fragile. markdown-it's token stream is not designed for this kind of token rewriting at the block rule level. Risk of breaking existing blockquote parsing.

**Why not chosen:** Detecting callouts in the blockquote handler is simpler, more maintainable, and less risky. The regex check on the first paragraph is a lightweight addition to existing proven logic.

### Alternative B: Extend the Existing Blockquote Node

Instead of creating a new `callout` node type, add `calloutType`, `title`, `collapsed` attributes to the existing `blockquote` node.

**Pros:** No new TipTap extension needed. Fewer schema changes.
**Cons:** Mixes two distinct concepts (plain quotes and semantic callouts) in one node type. The node view for blockquote would need conditional rendering logic. Serialization would need to check attributes to decide between `> text` and `> [!type] text`. Makes both blockquotes and callouts harder to maintain independently.

**Why not chosen:** A dedicated `callout` node type provides cleaner separation of concerns, simpler serialization logic, and independent evolution of both features.

### Alternative C: Use an Existing TipTap Community Extension

Several community TipTap extensions exist for callout/admonition blocks.

**Pros:** Faster to integrate. Community-tested.
**Cons:** Adds a dependency. May not match Obsidian syntax exactly. Custom node views would still be needed for styling. Serialization to `> [!type]` is our concern regardless.

**Why not chosen:** The extension is straightforward to build (~100 lines). Keeping it in-house avoids dependency management and ensures exact Obsidian compatibility.

## 6. Testing Strategy

### Unit Tests

**Parser tests (`test/unit/handlers/callout.test.ts`):**

- Parse `> [!note]\n> Content` produces `callout` node with `calloutType: 'note'`
- Parse `> [!warning] Title\n> Content` produces callout with title
- Parse `> [!tip]-\n> Content` produces callout with `collapsed: true`, `foldable: true`
- Parse `> [!danger]+\n> Content` produces callout with `collapsed: false`, `foldable: true`
- Parse all 8 types: note, tip, warning, danger, info, example, quote, abstract
- Parse case-insensitive: `> [!NOTE]`, `> [!Note]`, `> [!note]` all produce `calloutType: 'note'`
- Parse regular blockquote (no callout marker) still produces `blockquote` node
- Parse callout with multiple paragraphs
- Parse callout with lists inside
- Parse callout with code blocks inside
- Parse callout with no content (marker only)
- Parse callout with empty title (`> [!note] `)

**Serializer tests (`test/unit/serializers/callout.test.ts`):**

- Serialize callout node to `> [!type]\n> content`
- Serialize callout with title to `> [!type] Title\n> content`
- Serialize foldable collapsed callout to `> [!type]-\n> content`
- Serialize foldable expanded callout to `> [!type]+\n> content`
- Serialize callout with multi-paragraph content
- Serialize callout with no content

**Round-trip tests (`test/unit/callout-roundtrip.test.ts`):**

- `parse(serialize(parse(md))) === parse(md)` for all callout variants
- Round-trip preserves callout type, title, collapsed state, and content
- Regular blockquotes are not affected by callout changes

### E2E Tests

**New spec file (`test/e2e/specs/callout.spec.ts`):**

- Callout renders with correct color and icon for each type
- Slash command `/callout` inserts a note callout
- Slash command `/warning` inserts a warning callout
- Collapsible callout toggles open/closed on click
- Callout title is editable inline
- Typing `> [!tip] My Tip` followed by Enter creates a callout (if input rule is added)

### Integration Tests

- Open a markdown file containing callouts in VS Code -- verify they render as callout blocks
- Edit a callout, save, reopen -- verify round-trip fidelity
- Verify existing blockquote files are not affected

## 7. Rollout Plan

### Phase 1: Parser and Serializer (~1 session)
- Implement callout detection in `blockquoteHandler`
- Create `src/markdown/handlers/callout.ts` helper
- Create `src/markdown/serializers/callout.ts`
- Register callout serializer in `src/markdown/serializer.ts`
- Write unit tests for parsing and serialization
- Write round-trip tests
- **Gate:** All unit tests pass, round-trip fidelity holds, existing blockquote tests unaffected

### Phase 2: TipTap Extension and Rendering (~1 session)
- Create `src/webview/extensions/calloutExtension.ts`
- Create `src/webview/components/CalloutNodeView.tsx`
- Create `src/webview/styles/callout.css`
- Register extension in `src/webview/Editor.tsx`
- **Gate:** Callouts render visually in the editor with correct colors and icons

### Phase 3: Slash Commands, Type Dropdown, and Collapsible (~1 session)
- Add callout entries to `src/webview/commands/slashCommands.ts`
- Add callout cases to `SlashMenu.tsx` `executeCommand()` switch
- Add type-change dropdown in callout header (small `<select>` or custom picker to switch between the 8 types after creation)
- Implement collapsible toggle in `CalloutNodeView`
- Write E2E tests
- **Gate:** Slash commands work, type dropdown works, collapsible toggle works, E2E tests pass

### Phase 4: Polish and QA (~0.5 session)
- Test with real-world Obsidian markdown files
- Verify VS Code theme compatibility (light/dark)
- Manual QA checklist
- **Gate:** QA checklist passes, no visual regressions

## 8. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Callout detection regex is too greedy, matches non-callout blockquotes | High | Low | Regex requires exact `[!type]` pattern at the start of the first paragraph; extensive unit tests cover edge cases |
| ReactNodeViewRenderer causes performance issues with many callouts | Medium | Low | Profile with 50+ callout documents; consider switching to plain NodeView if React overhead is measurable |
| Collapsible state conflicts with undo/redo | Medium | Medium | Use TipTap `updateAttributes` which integrates with ProseMirror history; test undo/redo of collapse toggle |
| New `callout` node type breaks existing documents | High | Low | Parser only produces `callout` when regex matches; all other blockquotes remain `blockquote` nodes; schema includes both types |
| Title editing in node view is complex (contenteditable within contenteditable) | Medium | Low | **Resolved:** Title stored as a node attribute, edited via a controlled `<input>` element in the callout header — avoids nested contenteditable entirely |

## 9. Open Questions

*All resolved during review.*

**Resolved decisions:**

1. **GitHub `> [!NOTE]` uppercase variant:** Parse case-insensitively (regex already handles this). Always serialize as lowercase `> [!note]` (Obsidian convention). No special uppercase output mode.

2. **Callout type dropdown:** Included in Phase 3. A small type-change dropdown/picker in the callout header lets users switch types after creation without deleting and re-creating.

3. **Blockquote interaction:** `callout` and `blockquote` are separate TipTap node types. Parser only produces `callout` when `[!type]` pattern matches. `/quote` slash command continues to insert regular blockquotes. No conflict.

4. **Input rule for callouts:** Deferred to follow-up. Slash command is the primary creation method. Typing `> [!note]` + Enter conversion can be added later.

5. **Title editing approach:** Title stored as a node attribute, edited via a controlled `<input>` element in the callout header. No nested contenteditable. No inline formatting support in titles (plain text only).

## 10. Implementation Issues

| # | Title | Status | Scope |
|---|-------|--------|-------|
| [001](../issues/callouts-and-admonitions/001-parser-and-serializer.md) | Callout Parser and Serializer | DONE | M |
| [002](../issues/callouts-and-admonitions/002-tiptap-extension-and-rendering.md) | CalloutExtension and Visual Rendering | DONE | M |
| [003](../issues/callouts-and-admonitions/003-slash-commands-type-dropdown-and-e2e.md) | Slash Commands, Type Dropdown, and E2E Tests | DONE | M |

**Progress:** 3/3 issues complete (100%)
