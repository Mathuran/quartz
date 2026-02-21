# Slash Menu Edge Cases Design Document

**Author:** Claude
**Status:** COMPLETED
**Created:** 2026-02-20
**Last Updated:** 2026-02-20
**Reviewers:** TBD

---

## 1. Problem Statement

The Quartz slash command menu fails to open in certain contexts:

1. **After inline formatting:** When cursor is positioned after bold (`**text**`) or italic (`*text*`) formatted text, typing `/` does not open the slash menu
2. **Inconsistent trigger:** The slash menu works at the beginning of empty lines but fails in other valid positions

This breaks the user's workflow because slash commands are the primary way to insert block elements. Users expect to type `/` anywhere and get the command menu, similar to Notion or other block editors.

---

## 2. Goals and Non-Goals

### Goals

- **P0:** Slash menu opens when typing `/` after inline formatted text (bold, italic, code, strikethrough)
- **P0:** Slash menu opens when typing `/` at end of any paragraph content
- **P1:** Slash menu opens when typing `/` in all valid block contexts (paragraphs, list items, table cells)
- **P1:** Slash menu response time remains under 100ms regardless of context
- **P2:** Slash menu opens when typing `/` after images or other inline elements

### Non-Goals

- Opening slash menu inside code blocks (intentionally disabled)
- Opening slash menu while text is selected (would replace selection)
- Customizing slash command trigger character
- Mobile/touch support for slash menu

---

## 3. Background and Context

### Current Implementation

The slash command is implemented in `src/webview/extensions/slashCommandExtension.ts` using TipTap's Suggestion API:

```typescript
export const slashCommandExtension = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        char: '/',
        command: ({ editor, range, props }) => {
          // Execute the command
        },
        items: ({ query }) => {
          // Return filtered commands
        },
        render: () => ({
          // Menu rendering
        }),
      }),
    ];
  },
});
```

### Root Cause Hypotheses

1. **Mark boundaries:** Suggestion API might not trigger when cursor is at the end of a mark (bold/italic boundary)
2. **Inline decoration interference:** The formatting marks might create a node boundary that breaks the trigger detection
3. **Text content detection:** The `char: '/'` detection might fail when preceded by certain characters
4. **ProseMirror selection state:** The resolved position might be in an unexpected state after marks

### Related Files

- `src/webview/extensions/slashCommandExtension.ts` - Slash command implementation
- `src/webview/components/SlashMenu.tsx` - Menu UI component
- `@tiptap/suggestion` - TipTap suggestion plugin

---

## 4. Proposed Solution

### Overview

The fix requires understanding why the Suggestion plugin's character detection fails after formatted text. The solution will likely involve:

1. Custom `allow` function to check context
2. Adjusting trigger detection logic
3. Ensuring mark boundaries don't interfere

### Detailed Investigation

#### Step 1: Reproduce and Log

Add logging to the suggestion configuration:

```typescript
Suggestion({
  char: '/',
  allow: ({ state, range }) => {
    console.log('[Slash] allow check:', {
      range,
      parentType: state.selection.$from.parent.type.name,
      marks: state.selection.$from.marks().map(m => m.type.name),
    });
    // Current logic
  },
  onStart: () => {
    console.log('[Slash] onStart triggered');
  },
  // ...
});
```

#### Step 2: Check Suggestion Configuration

The Suggestion plugin has several options that might help:

```typescript
Suggestion({
  char: '/',

  // Might need to adjust these:
  allowSpaces: false,
  startOfLine: false, // Should be false to allow anywhere

  // Custom allow function
  allow: ({ state, range }) => {
    const { $from } = state.selection;

    // Allow in paragraphs, list items, etc.
    const allowedParents = ['paragraph', 'listItem', 'taskItem', 'tableCell'];
    const parentType = $from.parent.type.name;

    if (!allowedParents.includes(parentType)) {
      // Explicitly block code blocks
      return parentType !== 'codeBlock';
    }

    return true;
  },
});
```

### Likely Fix

Following Notion's behavior, require a space before the slash trigger. This also fixes the mark boundary issue:

```typescript
Suggestion({
  char: '/',
  allowSpaces: false,

  allow: ({ state, range }) => {
    const { $from } = state.selection;

    // Don't allow in code blocks
    if ($from.parent.type.name === 'codeBlock') {
      return false;
    }

    // Require space or start-of-block before slash (like Notion)
    const textBefore = $from.parent.textContent.slice(0, $from.parentOffset - 1);
    const charBefore = textBefore.slice(-1);

    // Allow at start of block or after whitespace
    return textBefore.length === 0 || charBefore === ' ' || charBefore === '\t';
  },
});
```

This approach:
1. Matches Notion behavior (user expectation)
2. Avoids triggering after formatted text without space
3. Prevents accidental triggers in URLs like `https://example.com`

---

## 5. Alternative Solutions Considered

### Alternative 1: Use Custom Plugin Instead of Suggestion

**Pros:**
- Full control over trigger detection
- Can handle all edge cases explicitly

**Cons:**
- Lose Suggestion plugin features (keyboard navigation, etc.)
- More code to maintain
- Might introduce new bugs

**Decision:** Rejected - fix the Suggestion configuration instead

### Alternative 2: Only Allow Slash at Start of Line

**Pros:**
- Simpler logic
- Matches some editors (Notion allows mid-paragraph too though)

**Cons:**
- Breaks user expectation
- Limits workflow flexibility

**Decision:** Rejected - should work anywhere

---

## 6. Security, Privacy, and Compliance

### Security Considerations

- Slash commands execute editor commands, not arbitrary code
- Commands are predefined and safe

### Privacy

- No data collection or transmission

### Compliance

- No compliance implications

---

## 7. Testing Strategy

### E2E Tests

```typescript
test('slash menu opens after bold text', async ({ page }) => {
  await loadMarkdown(page, '**bold** ');
  await page.waitForTimeout(300);

  await editorPage.prosemirror.click();
  await page.keyboard.press('End');
  await page.keyboard.type('/');
  await page.waitForTimeout(300);

  await expect(editorPage.slashMenu()).toBeVisible();
});

test('slash menu opens after italic text', async ({ page }) => {
  await loadMarkdown(page, '*italic* ');
  // ... similar
});
```

### Manual Testing

1. Type `**bold** /` - verify menu opens
2. Type `*italic* /` - verify menu opens
3. Type `text /` - verify menu opens
4. Type `/` on empty line - verify menu opens
5. Type `/` in code block - verify menu does NOT open

---

## 8. Rollout Plan

### Phase 1: Diagnosis

- **Agent delivers:** Debug logs, identification of why trigger fails
- **Human reviews:** Console output confirms hypothesis
- **Approved when:** Root cause documented

### Phase 2: Fix

- **Agent delivers:** Updated slashCommandExtension.ts, passing e2e test
- **Human reviews:** Slash menu works in all contexts
- **Approved when:** E2e test passes, manual verification passes

### Rollback Plan

Revert changes. Slash menu will work in original contexts.

---

## 9. Human Validation Plan

| Checkpoint | Agent Produces | Human Validates | Blocks |
|------------|----------------|-----------------|--------|
| Debug logs | Console output showing issue | Confirms root cause | Fix |
| Fix implemented | Code change | Manual test in editor | Release |
| Full test coverage | E2e tests | Coverage complete | Release |

---

## 10. Dependencies and Risks

### Dependencies

- TipTap Suggestion plugin API
- ProseMirror mark/selection model

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Fix causes slash to trigger too often | Medium | Medium | Add explicit blocklist (code blocks) |
| Suggestion API limitation | High | Low | Implement custom plugin as fallback |
| Performance regression | Low | Low | Profile trigger detection |

---

## 11. Open Questions

*Questions resolved:*

1. ~~**Trigger rules:**~~ **RESOLVED:** Require space before slash, matching Notion behavior. This also prevents accidental triggers in URLs.
2. ~~**Code block behavior:**~~ **RESOLVED:** Yes, slash menu should NOT open in code blocks.
3. ~~**Other inline elements:**~~ **RESOLVED:** Slash requires space, so it will work after `**bold** /` but not `**bold**/` - this is the desired behavior.
