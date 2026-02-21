# Keyboard Shortcut Fixes Design Document

**Author:** Claude
**Status:** COMPLETED
**Created:** 2026-02-20
**Last Updated:** 2026-02-20
**Reviewers:** TBD

---

## 1. Problem Statement

**Root Cause Identified:** This is a **test bug**, not a code bug.

The e2e test for strikethrough was using the wrong key combination. The test helper `toggleStrikethrough()` in `editor.page.ts` sends `Cmd+Shift+X`, but the actual shortcut defined in `keyboardShortcuts.ts` is `Cmd+Shift+S` (via `Mod-Shift-s`).

**Note on "Mod":** In TipTap/ProseMirror, `Mod` is a cross-platform alias:
- **Mac:** Command (⌘)
- **Windows/Linux:** Control (Ctrl)

So the strikethrough shortcut is **⌘+Shift+S** on Mac.

---

## 2. Goals and Non-Goals

### Goals

- **P0:** Mod+Shift+S (Cmd+Shift+S on Mac, Ctrl+Shift+S on Windows/Linux) toggles strikethrough on selected text
- **P0:** Strikethrough is visually indicated immediately after applying
- **P1:** Strikethrough shortcut works consistently in all contexts (paragraphs, headings, list items, table cells)
- **P1:** Document strikethrough keyboard shortcut behavior matches other editors (VS Code, Notion, Google Docs)
- **P2:** All keyboard shortcuts in keyboardShortcuts.ts are verified working via e2e tests

### Non-Goals

- Adding new keyboard shortcuts beyond fixing existing ones
- Customizable keyboard shortcuts (future feature)
- Cross-platform shortcut normalization beyond standard Mod key handling
- Fixing shortcuts that conflict with VS Code commands (already handled)

---

## 3. Background and Context

### Current Implementation

Keyboard shortcuts are defined in `src/webview/extensions/keyboardShortcuts.ts`:

```typescript
// Strikethrough: Cmd/Ctrl+Shift+S
'Mod-Shift-s': () => this.editor.chain().focus().toggleStrike().run(),
```

This uses TipTap's standard `toggleStrike()` command which should work identically to `toggleBold()` and `toggleItalic()`.

### Root Cause: Test Bug

**Found:** The test helper in `editor.page.ts` line 134 uses the wrong key:

```typescript
// BUG: Test sends wrong key
async toggleStrikethrough(): Promise<void> {
  await this.page.keyboard.press(`${this.mod}+Shift+x`);  // WRONG: 'x'
}

// FIX: Should be 's' to match keyboardShortcuts.ts
async toggleStrikethrough(): Promise<void> {
  await this.page.keyboard.press(`${this.mod}+Shift+s`);  // CORRECT: 's'
}
```

The shortcut in `keyboardShortcuts.ts` is correct: `'Mod-Shift-s'`

### Related Files

- `src/webview/extensions/keyboardShortcuts.ts` - Shortcut definitions
- `src/webview/Editor.tsx` - Strike extension included in extensions array
- `test/e2e/specs/keyboard-shortcuts.spec.ts` - Existing shortcut tests (doesn't test strikethrough specifically)

### Working Shortcuts for Reference

```typescript
// These work correctly:
'Mod-b': () => this.editor.chain().focus().toggleBold().run(),
'Mod-i': () => this.editor.chain().focus().toggleItalic().run(),
'Mod-e': () => this.editor.chain().focus().toggleCode().run(),
```

---

## 4. Proposed Solution

### Overview

**Simple fix:** Update the test helper to use the correct key.

### The Fix

In `test/e2e/pages/editor.page.ts`, change line 134:

```typescript
// FROM (incorrect)
async toggleStrikethrough(): Promise<void> {
  await this.page.keyboard.press(`${this.mod}+Shift+x`);
}

// TO (correct)
async toggleStrikethrough(): Promise<void> {
  await this.page.keyboard.press(`${this.mod}+Shift+s`);
}
```

No changes needed to the actual shortcut implementation - it's correct.

---

## 5. Alternative Solutions Considered

### Alternative 1: Remove Strikethrough Shortcut

**Pros:**
- No conflict issues
- Users can still use slash command or toolbar

**Cons:**
- Inconsistent with other formatting shortcuts
- Poor user experience for keyboard-heavy users

**Decision:** Rejected - shortcuts should work

### Alternative 2: Use Non-Standard Shortcut

**Pros:**
- Avoids conflicts
- Could match other editors (Slack uses Mod+Shift+X)

**Cons:**
- Users must learn new shortcut
- Inconsistent with documented shortcuts

**Decision:** Consider as fallback if standard shortcut cannot work

---

## 6. Security, Privacy, and Compliance

### Security Considerations

- Keyboard shortcuts have no security implications
- No data transmission involved

### Privacy

- No user data involved in keyboard handling

### Compliance

- No compliance implications

---

## 7. Testing Strategy

### Unit Tests

No unit tests needed - shortcuts are best tested at e2e level.

### E2E Tests

Add to `test/e2e/specs/keyboard-shortcuts.spec.ts`:

```typescript
test('Mod+Shift+S toggles strikethrough on selected text', async ({ page }) => {
  await loadMarkdown(page, 'Strike this text');
  await page.waitForTimeout(300);

  await editorPage.selectAllText();
  await editorPage.toggleStrikethrough();
  await page.waitForTimeout(300);

  await expect(editorPage.strikethrough()).toBeVisible();
  await expect(editorPage.strikethrough()).toContainText('Strike this text');
});

test('Mod+Shift+S removes strikethrough when applied again', async ({ page }) => {
  await loadMarkdown(page, '~~Already struck~~');
  await page.waitForTimeout(300);

  await editorPage.selectAllText();
  await editorPage.toggleStrikethrough();
  await page.waitForTimeout(300);

  await expect(editorPage.strikethrough()).not.toBeVisible();
});
```

### Manual Testing

1. Select text in paragraph, press Mod+Shift+S - verify strikethrough
2. Select text in heading, press Mod+Shift+S - verify strikethrough
3. Select text in list item, press Mod+Shift+S - verify strikethrough
4. Press Mod+Shift+S again to toggle off - verify removed
5. Test in both Mac and Windows environments

---

## 8. Rollout Plan

### Phase 1: Diagnosis

- **Agent delivers:** Debug logs, root cause identification
- **Human reviews:** Console output, confirms hypothesis
- **Approved when:** Root cause is clearly identified

### Phase 2: Fix Implementation

- **Agent delivers:** Code fix, passing e2e test
- **Human reviews:** Tests pass, manual verification
- **Approved when:** Strikethrough works on Mac and documented for Windows

### Phase 3: Shortcut Audit

- **Agent delivers:** E2e tests for all defined shortcuts
- **Human reviews:** Test coverage completeness
- **Approved when:** All shortcuts verified working

### Rollback Plan

Revert the change. Very low risk as shortcuts are isolated.

---

## 9. Human Validation Plan

| Checkpoint | Agent Produces | Human Validates | Blocks |
|------------|----------------|-----------------|--------|
| Root cause identified | Debug output, hypothesis | Confirms diagnosis | Fix |
| Fix implemented | Code change | Manual test on their machine | Release |
| Shortcut audit | Test results for all shortcuts | Coverage is complete | Release |

---

## 10. Dependencies and Risks

### Dependencies

- TipTap Strike extension (included in project)
- Browser keyboard event handling
- VS Code webview keyboard passthrough

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| VS Code captures shortcut | High | Medium | Use alternative shortcut |
| Browser captures shortcut | High | Low | Test in isolated webview |
| Platform differences | Medium | Medium | Test on Mac and Windows |

---

## 11. Open Questions

*All questions resolved - this is a simple test fix:*

1. ~~**Platform testing:**~~ **RESOLVED:** Mac testing is sufficient for this fix since it's just correcting a test typo.
2. ~~**Alternative shortcut:**~~ **RESOLVED:** Not needed - the current shortcut (⌘+Shift+S) works correctly.
3. **Documentation:** Should keyboard shortcuts be documented in README? (Owner: Product - can be done separately)
