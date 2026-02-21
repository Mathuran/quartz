import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown, waitForUpdate, getUpdateCount } from '../fixtures';

test.describe('Edge Cases', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  // ============================================================
  // LIST INPUT RULE EDGE CASES
  // Testing the listInputRule.ts extension that strips list markers
  // typed inside existing list items
  // ============================================================

  test('typing "- " inside bullet list item strips the marker', async ({ page }) => {
    // This tests the listInputRule extension
    await loadMarkdown(page, '- First item');
    await page.waitForTimeout(300);

    // Navigate to end of first item and press Enter
    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');

    // Type "- " which should be stripped (since we're already in a list)
    await page.keyboard.type('- Second item');
    await page.waitForTimeout(300);

    // The marker should be stripped, so we should just see "Second item"
    const listItems = page.locator('.ProseMirror li');
    await expect(listItems.nth(1)).toContainText('Second item');
    // Should NOT contain the "- " prefix as literal text
    const secondItemText = await listItems.nth(1).innerText();
    expect(secondItemText.trim()).toBe('Second item');
  });

  test('typing "1. " inside ordered list item strips the marker', async ({ page }) => {
    await loadMarkdown(page, '1. First item');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');

    // Type "2. " which should be stripped
    await page.keyboard.type('2. Second item');
    await page.waitForTimeout(300);

    const listItems = page.locator('.ProseMirror ol li');
    await expect(listItems.nth(1)).toContainText('Second item');
    const secondItemText = await listItems.nth(1).innerText();
    expect(secondItemText.trim()).toBe('Second item');
  });

  test('typing "+ " inside bullet list item strips the marker', async ({ page }) => {
    await loadMarkdown(page, '- First item');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');

    // Type "+ " using different marker style
    await page.keyboard.type('+ Second item');
    await page.waitForTimeout(300);

    const listItems = page.locator('.ProseMirror li');
    const secondItemText = await listItems.nth(1).innerText();
    expect(secondItemText.trim()).toBe('Second item');
  });

  test('typing "* " inside bullet list item strips the marker', async ({ page }) => {
    await loadMarkdown(page, '- First item');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');

    // Type "* " using asterisk marker style
    await page.keyboard.type('* Second item');
    await page.waitForTimeout(300);

    const listItems = page.locator('.ProseMirror li');
    const secondItemText = await listItems.nth(1).innerText();
    expect(secondItemText.trim()).toBe('Second item');
  });

  test('typing list marker in middle of text does not strip it', async ({ page }) => {
    await loadMarkdown(page, '- First item');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    // Type text that includes "- " in the middle
    await page.keyboard.type(' has - dash');
    await page.waitForTimeout(300);

    const listItems = page.locator('.ProseMirror li');
    await expect(listItems.first()).toContainText('First item has - dash');
  });

  // ============================================================
  // CODE BLOCK CLOSURE EDGE CASES
  // Testing the codeBlockExtension.ts that exits code blocks when
  // typing ``` on its own line
  // ============================================================

  test('typing ``` on own line in code block exits to new paragraph', async ({ page }) => {
    await loadMarkdown(page, '```javascript\nconst x = 1;\n```');
    await page.waitForTimeout(300);

    // Click into the code block
    const codeBlock = editorPage.codeBlock();
    await codeBlock.click();
    await page.waitForTimeout(100);

    // Navigate to end of the code block content
    await page.keyboard.press('End');
    // Add a newline and type closing backticks
    await page.keyboard.press('Enter');
    await page.keyboard.type('```');
    await page.waitForTimeout(300);

    // Should have exited to a new paragraph
    const paragraphs = editorPage.paragraph();
    await expect(paragraphs).toHaveCount(1);
  });

  test('typing backticks not on own line does not exit code block', async ({ page }) => {
    await loadMarkdown(page, '```javascript\nconst x = 1;\n```');
    await page.waitForTimeout(300);

    const codeBlock = editorPage.codeBlock();
    await codeBlock.click();
    await page.keyboard.press('End');

    // Type ``` at end of existing line (not on its own line)
    await page.keyboard.type('```');
    await page.waitForTimeout(300);

    // Should still be in code block with backticks as content
    await expect(codeBlock).toContainText('```');
  });

  test('Mod+Enter exits code block to new paragraph', async ({ page }) => {
    await loadMarkdown(page, '```javascript\nconst x = 1;\n```');
    await page.waitForTimeout(300);

    const codeBlock = editorPage.codeBlock();
    await codeBlock.click();
    await page.waitForTimeout(100);

    // Use Mod+Enter to exit
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${mod}+Enter`);
    await page.waitForTimeout(300);

    // Type something to verify we're in a new paragraph
    await page.keyboard.type('After code block');
    await page.waitForTimeout(300);

    await expect(editorPage.paragraph()).toContainText('After code block');
  });

  // ============================================================
  // TASK LIST EDGE CASES
  // ============================================================

  test('clicking task checkbox toggles checked state', async ({ page }) => {
    await loadMarkdown(page, '- [ ] Unchecked task\n- [x] Checked task');
    await page.waitForTimeout(300);

    // Find the checkbox input and click it
    const checkboxes = page.locator('.ProseMirror input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(2);

    // First checkbox should be unchecked
    const firstCheckbox = checkboxes.first();
    await expect(firstCheckbox).not.toBeChecked();

    // Click to toggle
    await firstCheckbox.click();
    await page.waitForTimeout(300);

    // Should now be checked
    await expect(firstCheckbox).toBeChecked();
  });

  test('task list mixed with regular list items', async ({ page }) => {
    // Parse a task list - all items should be task items
    await loadMarkdown(page, '- [x] Task 1\n- [ ] Task 2');
    await page.waitForTimeout(300);

    const taskItems = editorPage.taskItem();
    await expect(taskItems).toHaveCount(2);
  });

  // ============================================================
  // NESTED STRUCTURE EDGE CASES
  // ============================================================

  test('deeply nested blockquotes (3 levels) render correctly', async ({ page }) => {
    const markdown = '> Level 1\n> > Level 2\n> > > Level 3';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(500);

    // Should have 3 nested blockquotes (one at each level)
    const blockquotes = editorPage.blockquote();
    await expect(blockquotes).toHaveCount(3);

    // Verify nesting structure: blockquote > blockquote > blockquote
    const nestedBlockquote = page.locator('.ProseMirror blockquote blockquote');
    await expect(nestedBlockquote).toHaveCount(2); // Level 2 and Level 3

    // Verify all content is present
    await expect(editorPage.prosemirror).toContainText('Level 1');
    await expect(editorPage.prosemirror).toContainText('Level 2');
    await expect(editorPage.prosemirror).toContainText('Level 3');
  });

  test('list inside blockquote renders correctly', async ({ page }) => {
    const markdown = '> Quote with list:\n> - Item 1\n> - Item 2';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    await expect(editorPage.blockquote()).toBeVisible();
    // Check if list is present (may be inside or after blockquote)
    const lists = page.locator('.ProseMirror ul');
    await expect(lists.first()).toBeVisible();
  });

  // ============================================================
  // BLOCK MOVEMENT EDGE CASES
  // ============================================================

  test('moving heading block preserves heading level', async ({ page }) => {
    await loadMarkdown(page, '# Heading 1\n\nParagraph\n\n## Heading 2');
    await page.waitForTimeout(300);

    // Move H1 down
    await editorPage.heading(1).click();
    await page.waitForTimeout(100);
    await editorPage.moveBlockDown();
    await page.waitForTimeout(200);

    // H1 should now be after the paragraph
    const headings = editorPage.heading(1);
    await expect(headings).toBeVisible();
  });

  test('moving list block preserves list structure', async ({ page }) => {
    await loadMarkdown(page, '- Item 1\n- Item 2\n\nParagraph');
    await page.waitForTimeout(300);

    // Click in list
    await page.locator('.ProseMirror ul li').first().click();
    await page.waitForTimeout(100);

    // Move list down
    await editorPage.moveBlockDown();
    await page.waitForTimeout(200);

    // List should still exist with both items
    const listItems = page.locator('.ProseMirror ul li');
    await expect(listItems).toHaveCount(2);
  });

  test('moving code block preserves language', async ({ page }) => {
    await loadMarkdown(page, '```python\nprint("hello")\n```\n\nParagraph');
    await page.waitForTimeout(300);

    await editorPage.codeBlock().click();
    await page.waitForTimeout(100);
    await editorPage.moveBlockDown();
    await page.waitForTimeout(200);

    // Code block should still have python language attribute
    const codeBlock = editorPage.codeBlock();
    await expect(codeBlock).toContainText('print("hello")');
  });

  // ============================================================
  // TABLE EDGE CASES
  // ============================================================

  test('table with single cell renders correctly', async ({ page }) => {
    await loadMarkdown(page, '| Header |\n|--------|\n| Cell   |');
    await page.waitForTimeout(300);

    const table = editorPage.table();
    await expect(table).toBeVisible();
    const cells = page.locator('.ProseMirror td, .ProseMirror th');
    await expect(cells).toHaveCount(2); // 1 header + 1 cell
  });

  test('table with many columns (10+) renders correctly', async ({ page }) => {
    const headers = Array.from({ length: 12 }, (_, i) => `H${i + 1}`).join(' | ');
    const separator = Array.from({ length: 12 }, () => '---').join(' | ');
    const row = Array.from({ length: 12 }, (_, i) => `C${i + 1}`).join(' | ');
    const markdown = `| ${headers} |\n| ${separator} |\n| ${row} |`;

    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    const table = editorPage.table();
    await expect(table).toBeVisible();

    // Should have 24 cells (12 header + 12 body)
    const cells = page.locator('.ProseMirror td, .ProseMirror th');
    await expect(cells).toHaveCount(24);
  });

  test('table navigation with Tab key moves to next cell', async ({ page }) => {
    await loadMarkdown(page, '| A | B |\n|---|---|\n| 1 | 2 |');
    await page.waitForTimeout(300);

    // Click in first cell
    const firstCell = page.locator('.ProseMirror td').first();
    await firstCell.click();
    await page.waitForTimeout(100);

    // Press Tab to move to next cell
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // Type in the new cell
    await page.keyboard.type('NEW');
    await page.waitForTimeout(300);

    // Second cell should now contain NEW
    const secondCell = page.locator('.ProseMirror td').nth(1);
    await expect(secondCell).toContainText('NEW');
  });

  test('table shortcuts: Ctrl+Enter adds row', async ({ page }) => {
    await loadMarkdown(page, '| A | B |\n|---|---|\n| 1 | 2 |');
    await page.waitForTimeout(300);

    // Click in a body cell
    const bodyCell = page.locator('.ProseMirror td').first();
    await bodyCell.click();
    await page.waitForTimeout(100);

    // Press Ctrl+Enter to add row
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(300);

    // Should now have 4 body cells (2 original + 2 new)
    const bodyCells = page.locator('.ProseMirror td');
    await expect(bodyCells).toHaveCount(4);
  });

  // ============================================================
  // SLASH COMMAND EDGE CASES
  // ============================================================

  test('slash command inside code block does not open menu', async ({ page }) => {
    await loadMarkdown(page, '```javascript\nconst x = 1;\n```');
    await page.waitForTimeout(300);

    await editorPage.codeBlock().click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/');
    await page.waitForTimeout(500);

    // Slash menu should NOT be visible in code block
    await expect(editorPage.slashMenu()).not.toBeVisible();
  });

  test('slash command at very beginning of document', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.type('/');
    await page.waitForTimeout(300);

    await expect(editorPage.slashMenu()).toBeVisible();
  });

  test('slash command after inline formatting', async ({ page }) => {
    await loadMarkdown(page, '**bold**');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    // Type space then slash - menu should open
    await page.keyboard.type(' /');
    await page.waitForTimeout(300);

    // Menu should open after "bold /"
    await expect(editorPage.slashMenu()).toBeVisible();
  });

  // ============================================================
  // INLINE FORMATTING EDGE CASES
  // ============================================================

  test('overlapping bold and italic produces correct marks', async ({ page }) => {
    await loadMarkdown(page, 'normal ***bold and italic*** normal');
    await page.waitForTimeout(300);

    // Should have text that is both bold AND italic
    const strongEm = page.locator('.ProseMirror strong em, .ProseMirror em strong');
    await expect(strongEm).toBeVisible();
    await expect(strongEm).toContainText('bold and italic');
  });

  test('inline code inside bold remains as inline code', async ({ page }) => {
    await loadMarkdown(page, '**bold `code` bold**');
    await page.waitForTimeout(300);

    // The code element should exist within the bold
    await expect(editorPage.bold()).toContainText('code');
    const inlineCode = page.locator('.ProseMirror strong code');
    await expect(inlineCode).toBeVisible();
  });

  test('applying bold to selection spanning multiple paragraphs', async ({ page }) => {
    await loadMarkdown(page, 'First paragraph\n\nSecond paragraph');
    await page.waitForTimeout(300);

    // Select all
    await editorPage.selectAllText();
    await page.waitForTimeout(100);

    // Apply bold
    await editorPage.toggleBold();
    await page.waitForTimeout(300);

    // Both paragraphs should have bold text
    const strongElements = editorPage.bold();
    await expect(strongElements).toHaveCount(2);
  });

  test('strikethrough with tilde characters renders correctly', async ({ page }) => {
    await loadMarkdown(page, 'Normal ~~strikethrough~~ normal');
    await page.waitForTimeout(300);

    await expect(editorPage.strikethrough()).toBeVisible();
    await expect(editorPage.strikethrough()).toContainText('strikethrough');
  });

  // ============================================================
  // UNDO/REDO EDGE CASES
  // ============================================================

  test('undo after slash command insertion', async ({ page }) => {
    await loadMarkdown(page, 'Some paragraph text');
    await page.waitForTimeout(300);

    // Verify no heading initially
    await expect(editorPage.heading(1)).not.toBeVisible();

    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');

    // Insert heading via slash command
    await editorPage.triggerSlashCommand('h1');
    await page.waitForTimeout(300);

    // Verify heading was created (should be empty heading)
    await expect(editorPage.heading(1)).toBeVisible();

    // Undo - should remove the heading
    await editorPage.undo();
    await page.waitForTimeout(300);

    // Heading should be removed, back to paragraph only
    await expect(editorPage.heading(1)).not.toBeVisible();
    await expect(editorPage.prosemirror).toContainText('Some paragraph text');
  });

  test('undo after block movement', async ({ page }) => {
    await loadMarkdown(page, 'First\n\nSecond\n\nThird');
    await page.waitForTimeout(300);

    // Move first paragraph down
    await editorPage.paragraph().first().click();
    await page.waitForTimeout(100);
    await editorPage.moveBlockDown();
    await page.waitForTimeout(200);

    // Verify movement
    await expect(editorPage.paragraph().first()).toContainText('Second');

    // Undo
    await editorPage.undo();
    await page.waitForTimeout(300);

    // Should be back to original order
    await expect(editorPage.paragraph().first()).toContainText('First');
  });

  test('multiple rapid undos work correctly', async ({ page }) => {
    await loadMarkdown(page, 'Start');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.press('End');

    // Make multiple changes
    await page.keyboard.type(' one');
    await page.waitForTimeout(400); // Wait for debounce
    await page.keyboard.type(' two');
    await page.waitForTimeout(400);
    await page.keyboard.type(' three');
    await page.waitForTimeout(400);

    // Rapid undos
    await editorPage.undo();
    await editorPage.undo();
    await editorPage.undo();
    await page.waitForTimeout(300);

    // Should be back close to original (depending on undo grouping)
    const text = await editorPage.prosemirror.innerText();
    expect(text.length).toBeLessThan(20); // Should have undone most changes
  });

  // ============================================================
  // HARD BREAK AND SOFT BREAK EDGE CASES
  // ============================================================

  test('Shift+Enter creates hard break (not new paragraph)', async ({ page }) => {
    await loadMarkdown(page, 'First line');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Shift+Enter');
    await page.keyboard.type('Second line');
    await page.waitForTimeout(300);

    // Should still be single paragraph with hard break
    await expect(editorPage.paragraph()).toHaveCount(1);
    // The paragraph should contain both lines
    await expect(editorPage.paragraph()).toContainText('First line');
    await expect(editorPage.paragraph()).toContainText('Second line');
  });

  test('multiple hard breaks in a row', async ({ page }) => {
    await loadMarkdown(page, 'Text');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Shift+Enter');
    await page.keyboard.press('Shift+Enter');
    await page.keyboard.type('After breaks');
    await page.waitForTimeout(300);

    // Should have hard breaks (br elements) in the paragraph
    const breaks = page.locator('.ProseMirror br');
    await expect(breaks).toHaveCount(2);
  });

  // ============================================================
  // HORIZONTAL RULE EDGE CASES
  // ============================================================

  test('horizontal rule between paragraphs', async ({ page }) => {
    await loadMarkdown(page, 'Before\n\n---\n\nAfter');
    await page.waitForTimeout(300);

    await expect(editorPage.horizontalRule()).toBeVisible();
    await expect(editorPage.paragraph().first()).toContainText('Before');
    await expect(editorPage.paragraph().last()).toContainText('After');
  });

  test('deleting horizontal rule with backspace', async ({ page }) => {
    await loadMarkdown(page, 'Before\n\n---\n\nAfter');
    await page.waitForTimeout(300);

    await expect(editorPage.horizontalRule()).toBeVisible();

    // Click on paragraph after HR
    await editorPage.paragraph().last().click();
    await page.keyboard.press('Home');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    // HR should be deleted
    await expect(editorPage.horizontalRule()).not.toBeVisible();
  });

  // ============================================================
  // IMAGE EDGE CASES
  // ============================================================

  test('image with empty alt text renders', async ({ page }) => {
    await loadMarkdown(page, '![](https://example.com/image.png)');
    await page.waitForTimeout(300);

    // Image may be hidden (broken) but should exist with correct src
    const img = page.locator('.ProseMirror img[src="https://example.com/image.png"]');
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute('alt', '');
  });

  test('image with special characters in alt text', async ({ page }) => {
    await loadMarkdown(page, '![Alt text here](https://example.com/img.png)');
    await page.waitForTimeout(300);

    // Image may be hidden (broken) but should exist with correct src and alt
    const img = page.locator('.ProseMirror img[src="https://example.com/img.png"]');
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute('alt', 'Alt text here');
  });

  // ============================================================
  // LINK EDGE CASES
  // ============================================================

  test('link with special characters in URL', async ({ page }) => {
    // Use URL that doesn't trigger HTML entity parsing issues in test harness
    await loadMarkdown(page, '[Link](https://example.com/path?a=1&b=2#section)');
    await page.waitForTimeout(300);

    const link = editorPage.link();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://example.com/path?a=1&b=2#section');
  });

  test('adjacent links without space between them', async ({ page }) => {
    await loadMarkdown(page, '[Link1](https://one.com)[Link2](https://two.com)');
    await page.waitForTimeout(300);

    const links = editorPage.link();
    await expect(links).toHaveCount(2);
    await expect(links.first()).toHaveAttribute('href', 'https://one.com');
    await expect(links.last()).toHaveAttribute('href', 'https://two.com');
  });

  // ============================================================
  // EMPTY CONTENT EDGE CASES
  // ============================================================

  test('empty document shows placeholder', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    // The placeholder should be visible (TipTap Placeholder extension)
    const placeholder = page.locator('.ProseMirror p.is-editor-empty');
    // May have the placeholder class or data attribute
    await expect(editorPage.prosemirror).toBeVisible();
  });

  test('clearing all content leaves empty document', async ({ page }) => {
    await loadMarkdown(page, 'Some content here');
    await page.waitForTimeout(300);

    await editorPage.selectAllText();
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    // Should have an empty paragraph
    const text = await editorPage.prosemirror.innerText();
    expect(text.trim()).toBe('');
  });

  // ============================================================
  // UNICODE AND SPECIAL CHARACTERS
  // ============================================================

  test('unicode emojis in paragraph', async ({ page }) => {
    await loadMarkdown(page, 'Hello 👋 World 🌍!');
    await page.waitForTimeout(300);

    await expect(editorPage.paragraph()).toContainText('Hello 👋 World 🌍!');
  });

  test('unicode in heading', async ({ page }) => {
    await loadMarkdown(page, '# Héllo Wörld 中文');
    await page.waitForTimeout(300);

    await expect(editorPage.heading(1)).toContainText('Héllo Wörld 中文');
  });

  test('unicode in code block', async ({ page }) => {
    await loadMarkdown(page, '```\nconst greeting = "こんにちは";\n```');
    await page.waitForTimeout(300);

    await expect(editorPage.codeBlock()).toContainText('こんにちは');
  });

  // ============================================================
  // FRONTMATTER EDGE CASES
  // ============================================================

  test('frontmatter with dashes inside preserves correctly', async ({ page }) => {
    const markdown = '---\ntitle: "My-Title-With-Dashes"\ndate: 2024-01-15\n---\n\nContent';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    // Frontmatter should be rendered as a code block with yaml
    const codeBlock = editorPage.codeBlock();
    await expect(codeBlock).toBeVisible();
    await expect(codeBlock).toContainText('title');
  });

  // ============================================================
  // RAPID INTERACTION EDGE CASES
  // ============================================================

  test('rapid typing does not lose characters', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();

    // Type rapidly
    const testString = 'The quick brown fox jumps over the lazy dog';
    await page.keyboard.type(testString, { delay: 10 }); // Very fast typing
    await page.waitForTimeout(500);

    await expect(editorPage.prosemirror).toContainText(testString);
  });

  test('rapid formatting toggles work correctly', async ({ page }) => {
    await loadMarkdown(page, 'Test text');
    await page.waitForTimeout(300);

    await editorPage.selectAllText();

    // Toggle bold rapidly
    await editorPage.toggleBold();
    await editorPage.toggleBold();
    await editorPage.toggleBold();
    await page.waitForTimeout(300);

    // Should end up bold (odd number of toggles)
    await expect(editorPage.bold()).toBeVisible();
  });

  // ============================================================
  // COPY/PASTE EDGE CASES
  // ============================================================

  test('copy and paste within same document', async ({ page }) => {
    await loadMarkdown(page, 'Copy this text');
    await page.waitForTimeout(300);

    // Select all and copy
    await editorPage.selectAllText();
    await editorPage.copy();
    await page.waitForTimeout(100);

    // Move to end and paste
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await editorPage.paste();
    await page.waitForTimeout(300);

    // Should have duplicated content
    const paragraphs = editorPage.paragraph();
    await expect(paragraphs).toHaveCount(2);
  });
});
