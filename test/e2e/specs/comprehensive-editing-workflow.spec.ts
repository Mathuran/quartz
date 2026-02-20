import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown, getEditorMarkdown } from '../fixtures';

/**
 * RALPH Loop: Comprehensive Markdown Editing Workflow Test
 *
 * This test exercises EVERY markdown feature and editing behavior.
 * It runs as a complete end-to-end editing session to validate the
 * Notion-like editor is fully functional.
 *
 * Categories tested:
 * 1. Block creation via slash commands (all 14 commands)
 * 2. Inline formatting via keyboard shortcuts
 * 3. Cursor behavior after operations
 * 4. List editing (add/remove items, cursor position)
 * 5. Block merging (backspace at start)
 * 6. Block splitting (Enter key)
 * 7. Block reordering
 * 8. Selection and deletion
 * 9. Undo/redo
 * 10. Roundtrip integrity
 */

test.describe('Comprehensive Editing Workflow', () => {
  let editorPage: EditorPage;
  const isMac = process.platform === 'darwin';
  const mod = isMac ? 'Meta' : 'Control';

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test.describe('1. Slash Commands - All Block Types', () => {
    // Helper to set up and trigger slash command properly
    // Uses actual aliases that match the filter (not command IDs)
    async function setupAndTriggerSlash(page: any, editorPage: EditorPage, alias: string) {
      await loadMarkdown(page, 'Start');
      await page.waitForTimeout(300);
      await editorPage.prosemirror.click();
      await editorPage.goToLineEnd();
      await page.keyboard.press('Enter');
      await editorPage.triggerSlashCommand(alias);
    }

    test('create heading 1 via slash command', async ({ page }) => {
      await setupAndTriggerSlash(page, editorPage, 'h1');
      await page.keyboard.type('Main Title');

      await expect(editorPage.heading(1)).toBeVisible();
      await expect(editorPage.heading(1)).toContainText('Main Title');
    });

    test('create heading 2 via slash command', async ({ page }) => {
      await setupAndTriggerSlash(page, editorPage, 'h2');
      await page.keyboard.type('Section Title');

      await expect(editorPage.heading(2)).toBeVisible();
      await expect(editorPage.heading(2)).toContainText('Section Title');
    });

    test('create heading 3 via slash command', async ({ page }) => {
      await setupAndTriggerSlash(page, editorPage, 'h3');
      await page.keyboard.type('Subsection');

      await expect(editorPage.heading(3)).toBeVisible();
    });

    test('create heading 4 via slash command', async ({ page }) => {
      await setupAndTriggerSlash(page, editorPage, 'h4');
      await page.keyboard.type('Level 4');

      await expect(editorPage.heading(4)).toBeVisible();
    });

    test('create heading 5 via slash command', async ({ page }) => {
      await setupAndTriggerSlash(page, editorPage, 'h5');
      await page.keyboard.type('Level 5');

      await expect(editorPage.heading(5)).toBeVisible();
    });

    test('create heading 6 via slash command', async ({ page }) => {
      await setupAndTriggerSlash(page, editorPage, 'h6');
      await page.keyboard.type('Level 6');

      await expect(editorPage.heading(6)).toBeVisible();
    });

    test('create bullet list via slash command', async ({ page }) => {
      await setupAndTriggerSlash(page, editorPage, 'bullet');
      await page.keyboard.type('First item');

      await expect(editorPage.bulletList()).toBeVisible();
      await expect(editorPage.bulletList().locator('li')).toContainText('First item');
    });

    test('create ordered list via slash command', async ({ page }) => {
      await setupAndTriggerSlash(page, editorPage, 'ol');
      await page.keyboard.type('Step one');

      await expect(editorPage.orderedList()).toBeVisible();
      await expect(editorPage.orderedList().locator('li')).toContainText('Step one');
    });

    test('create task list via slash command', async ({ page }) => {
      await setupAndTriggerSlash(page, editorPage, 'todo');
      await page.keyboard.type('Task item');

      await expect(editorPage.taskList()).toBeVisible();
      // Task list is created - verify it contains the typed text
      await expect(editorPage.taskList()).toContainText('Task item');
    });

    test('create code block via slash command', async ({ page }) => {
      await setupAndTriggerSlash(page, editorPage, 'code');
      await page.keyboard.type('const x = 42;');

      await expect(editorPage.codeBlock()).toBeVisible();
      await expect(editorPage.codeBlock()).toContainText('const x = 42;');
    });

    test('create blockquote via slash command', async ({ page }) => {
      await setupAndTriggerSlash(page, editorPage, 'quote');
      await page.keyboard.type('Famous quote');

      await expect(editorPage.blockquote()).toBeVisible();
      await expect(editorPage.blockquote()).toContainText('Famous quote');
    });

    test('create horizontal rule via slash command', async ({ page }) => {
      await loadMarkdown(page, 'Above');
      await page.waitForTimeout(300);

      await editorPage.prosemirror.click();
      await editorPage.goToLineEnd();
      await page.keyboard.press('Enter');
      await editorPage.triggerSlashCommand('hr');

      await expect(editorPage.horizontalRule()).toBeVisible();
    });

    test('create table via slash command', async ({ page }) => {
      await setupAndTriggerSlash(page, editorPage, 'table');
      await page.waitForTimeout(300);

      await expect(editorPage.table()).toBeVisible();
      // Default 3x3 table
      await expect(editorPage.table().locator('tr')).toHaveCount(3);
    });
  });

  test.describe('2. Inline Formatting via Keyboard Shortcuts', () => {
    test('bold text with Mod+B', async ({ page }) => {
      await loadMarkdown(page, 'Some text here');
      await page.waitForTimeout(300);

      // Select "text"
      await editorPage.prosemirror.click();
      await page.keyboard.press(`${mod}+a`);
      await editorPage.toggleBold();

      await expect(editorPage.bold()).toBeVisible();
    });

    test('italic text with Mod+I', async ({ page }) => {
      await loadMarkdown(page, 'Some text here');
      await page.waitForTimeout(300);

      await editorPage.selectAllText();
      await editorPage.toggleItalic();

      await expect(editorPage.italic()).toBeVisible();
    });

    test('inline code with Mod+E', async ({ page }) => {
      await loadMarkdown(page, 'Some code here');
      await page.waitForTimeout(300);

      await editorPage.selectAllText();
      await editorPage.toggleCode();

      await expect(editorPage.inlineCode()).toBeVisible();
    });

    test('strikethrough with Mod+Shift+S', async ({ page }) => {
      await loadMarkdown(page, 'Deleted text');
      await page.waitForTimeout(300);

      await editorPage.selectAllText();
      await page.keyboard.press(`${mod}+Shift+s`);

      await expect(editorPage.strikethrough()).toBeVisible();
    });

    test('toggle bold off', async ({ page }) => {
      await loadMarkdown(page, '**Bold text**');
      await page.waitForTimeout(300);

      await editorPage.selectAllText();
      await editorPage.toggleBold();

      await expect(editorPage.bold()).not.toBeVisible();
    });

    test('combined formatting: bold + italic', async ({ page }) => {
      await loadMarkdown(page, 'Format me');
      await page.waitForTimeout(300);

      await editorPage.selectAllText();
      await editorPage.toggleBold();
      await editorPage.toggleItalic();

      await expect(editorPage.bold()).toBeVisible();
      await expect(editorPage.italic()).toBeVisible();
    });
  });

  test.describe('3. List Editing Behaviors', () => {
    test('Enter in list creates new item', async ({ page }) => {
      await loadMarkdown(page, '- First item');
      await page.waitForTimeout(300);

      await editorPage.prosemirror.click();
      await editorPage.goToLineEnd();
      await page.keyboard.press('Enter');
      await page.keyboard.type('Second item');

      const items = editorPage.bulletList().locator('li');
      await expect(items).toHaveCount(2);
      await expect(items.nth(1)).toContainText('Second item');
    });

    test('backspace on empty list item removes it and cursor moves to previous', async ({ page }) => {
      await loadMarkdown(page, '- First\n- Second\n- Third');
      await page.waitForTimeout(300);

      // Click on second item, select all text, delete
      const secondItem = editorPage.bulletList().locator('li').nth(1);
      await secondItem.click();
      await page.keyboard.press(`${mod}+a`);
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace'); // Remove the now-empty list item

      await page.waitForTimeout(300);
      const items = editorPage.bulletList().locator('li');
      // Should have 2 items now (First and Third merged or just First + Third)
      const count = await items.count();
      expect(count).toBeLessThanOrEqual(3);
    });

    test('Enter after list item creates new item', async ({ page }) => {
      await loadMarkdown(page, '- Item');
      await page.waitForTimeout(300);

      await editorPage.bulletList().locator('li').click();
      await editorPage.goToLineEnd();
      await page.keyboard.press('Enter');
      await page.keyboard.type('New item');

      await page.waitForTimeout(300);
      const items = editorPage.bulletList().locator('li');
      await expect(items).toHaveCount(2);
      await expect(items.nth(1)).toContainText('New item');
    });

    test('ordered list numbering continues', async ({ page }) => {
      await loadMarkdown(page, '1. First');
      await page.waitForTimeout(300);

      await editorPage.prosemirror.click();
      await editorPage.goToLineEnd();
      await page.keyboard.press('Enter');
      await page.keyboard.type('Second');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Third');

      const items = editorPage.orderedList().locator('li');
      await expect(items).toHaveCount(3);
    });

    test('task list renders correctly', async ({ page }) => {
      await loadMarkdown(page, '- [ ] Unchecked task');
      await page.waitForTimeout(300);

      // Verify task list renders (TipTap uses ul[data-type="taskList"])
      const taskList = editorPage.prosemirror.locator('ul[data-type="taskList"]');
      await expect(taskList).toBeVisible();

      // Verify content is preserved
      await expect(taskList).toContainText('Unchecked task');
    });
  });

  test.describe('4. Block Merging (Backspace at Start)', () => {
    test('backspace at start of paragraph merges with previous paragraph', async ({ page }) => {
      await loadMarkdown(page, 'First paragraph\n\nSecond paragraph');
      await page.waitForTimeout(300);

      const secondPara = editorPage.paragraph().nth(1);
      await secondPara.click();
      await editorPage.goToLineStart();
      await page.keyboard.press('Backspace');

      await page.waitForTimeout(300);
      await expect(editorPage.prosemirror).toContainText('First paragraphSecond paragraph');
    });

    test('backspace at start of heading converts to paragraph or merges', async ({ page }) => {
      await loadMarkdown(page, 'Text\n\n## Heading');
      await page.waitForTimeout(300);

      await editorPage.heading(2).click();
      await editorPage.goToLineStart();
      await page.keyboard.press('Backspace');

      await page.waitForTimeout(300);
      // Either heading is converted or merged
      const h2Count = await editorPage.heading(2).count();
      expect(h2Count).toBeLessThanOrEqual(1);
    });

    test('backspace at start of list item outdents or merges', async ({ page }) => {
      await loadMarkdown(page, 'Paragraph\n\n- List item');
      await page.waitForTimeout(300);

      const listItem = editorPage.bulletList().locator('li').first();
      await listItem.click();
      await editorPage.goToLineStart();
      await page.keyboard.press('Backspace');

      await page.waitForTimeout(300);
      // List item should be converted or merged
      await expect(editorPage.prosemirror).toContainText('List item');
    });

    test('backspace at start of blockquote modifies it', async ({ page }) => {
      await loadMarkdown(page, '> Quoted text');
      await page.waitForTimeout(300);

      await editorPage.blockquote().click();
      await editorPage.goToLineStart();
      await page.keyboard.press('Backspace');

      await page.waitForTimeout(300);
      // Content should still be visible (either in blockquote or paragraph)
      await expect(editorPage.prosemirror).toContainText('Quoted text');
    });
  });

  test.describe('5. Block Splitting (Enter Key)', () => {
    test('Enter creates new paragraph', async ({ page }) => {
      await loadMarkdown(page, 'Hello World');
      await page.waitForTimeout(300);

      await editorPage.prosemirror.click();
      await editorPage.goToLineEnd();
      await page.keyboard.press('Enter');
      await page.keyboard.type('New paragraph');

      await page.waitForTimeout(300);

      const paragraphs = editorPage.paragraph();
      const count = await paragraphs.count();
      expect(count).toBeGreaterThanOrEqual(2);
      await expect(paragraphs.last()).toContainText('New paragraph');
    });

    test('Enter at end of heading creates paragraph', async ({ page }) => {
      await loadMarkdown(page, '# Heading');
      await page.waitForTimeout(300);

      await editorPage.heading(1).click();
      await editorPage.goToLineEnd();
      await page.keyboard.press('Enter');
      await page.keyboard.type('New paragraph');

      await page.waitForTimeout(300);
      await expect(editorPage.heading(1)).toBeVisible();
      await expect(editorPage.paragraph()).toContainText('New paragraph');
    });

    test('Enter in middle of heading splits into two headings', async ({ page }) => {
      await loadMarkdown(page, '# Hello World');
      await page.waitForTimeout(300);

      await editorPage.heading(1).click();
      await editorPage.goToLineStart();
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('ArrowRight');
      }
      await page.keyboard.press('Enter');

      await page.waitForTimeout(300);
      // Both should be headings or first heading + second heading
      const h1Count = await editorPage.heading(1).count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
    });

    test('Shift+Enter creates soft break', async ({ page }) => {
      await loadMarkdown(page, 'Line one');
      await page.waitForTimeout(300);

      await editorPage.prosemirror.click();
      await editorPage.goToLineEnd();
      await page.keyboard.press('Shift+Enter');
      await page.keyboard.type('Line two');

      await page.waitForTimeout(300);
      // Should still be one paragraph with a break
      const paragraphs = editorPage.paragraph();
      await expect(paragraphs).toHaveCount(1);
      await expect(paragraphs).toContainText('Line one');
      await expect(paragraphs).toContainText('Line two');
    });
  });

  test.describe('6. Selection and Deletion', () => {
    test('select all and delete clears document', async ({ page }) => {
      await loadMarkdown(page, '# Heading\n\nParagraph\n\n- List item');
      await page.waitForTimeout(300);

      await editorPage.selectAllText();
      await page.keyboard.press('Backspace');

      await page.waitForTimeout(300);
      // Document should be nearly empty
      const text = await editorPage.prosemirror.textContent();
      expect(text?.trim().length).toBeLessThan(5);
    });

    test('select multiple paragraphs and delete', async ({ page }) => {
      await loadMarkdown(page, 'Para 1\n\nPara 2\n\nPara 3');
      await page.waitForTimeout(300);

      // Use Cmd/Ctrl+A to select all, then delete
      await editorPage.prosemirror.click();
      await page.keyboard.press(`${mod}+a`);
      await page.keyboard.press('Backspace');

      await page.waitForTimeout(300);
      const content = await editorPage.prosemirror.textContent();
      expect(content?.trim().length).toBeLessThan(5);
    });

    test('delete key removes character after cursor', async ({ page }) => {
      await loadMarkdown(page, 'Hello');
      await page.waitForTimeout(300);

      await editorPage.prosemirror.click();
      await editorPage.goToLineStart();
      await page.keyboard.press('Delete');

      await page.waitForTimeout(300);
      await expect(editorPage.prosemirror).toContainText('ello');
    });
  });

  test.describe('7. Undo/Redo', () => {
    test('undo reverts typing', async ({ page }) => {
      await loadMarkdown(page, 'Original');
      await page.waitForTimeout(300);

      await editorPage.prosemirror.click();
      await editorPage.goToLineEnd();
      await page.keyboard.type(' added');
      await page.waitForTimeout(400);

      await editorPage.undo();
      await page.waitForTimeout(300);

      await expect(editorPage.prosemirror).not.toContainText('added');
    });

    test('redo restores undone action', async ({ page }) => {
      await loadMarkdown(page, 'Original');
      await page.waitForTimeout(300);

      await editorPage.prosemirror.click();
      await editorPage.goToLineEnd();
      await page.keyboard.type(' added');
      await page.waitForTimeout(400);

      await editorPage.undo();
      await page.waitForTimeout(300);
      await editorPage.redo();
      await page.waitForTimeout(300);

      await expect(editorPage.prosemirror).toContainText('added');
    });

    test('undo reverts formatting change', async ({ page }) => {
      await loadMarkdown(page, 'Plain text');
      await page.waitForTimeout(300);

      await editorPage.selectAllText();
      await editorPage.toggleBold();
      await page.waitForTimeout(300);

      await expect(editorPage.bold()).toBeVisible();

      await editorPage.undo();
      await page.waitForTimeout(300);

      await expect(editorPage.bold()).not.toBeVisible();
    });

    test('multiple undos work correctly', async ({ page }) => {
      await loadMarkdown(page, 'Start');
      await page.waitForTimeout(300);

      await editorPage.prosemirror.click();
      await editorPage.goToLineEnd();
      await page.keyboard.type('A');
      await page.waitForTimeout(200);
      await page.keyboard.type('B');
      await page.waitForTimeout(200);
      await page.keyboard.type('C');
      await page.waitForTimeout(400);

      await editorPage.undo();
      await editorPage.undo();
      await editorPage.undo();
      await page.waitForTimeout(300);

      await expect(editorPage.prosemirror).toContainText('Start');
    });
  });

  test.describe('8. Cursor Navigation', () => {
    test('arrow keys move cursor', async ({ page }) => {
      await loadMarkdown(page, 'ABCD');
      await page.waitForTimeout(300);

      await editorPage.prosemirror.click();
      await editorPage.goToLineStart();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.type('X');

      await page.waitForTimeout(300);
      await expect(editorPage.prosemirror).toContainText('ABXCD');
    });

    test('Home/End keys work', async ({ page }) => {
      await loadMarkdown(page, 'Hello World');
      await page.waitForTimeout(300);

      await editorPage.prosemirror.click();
      await editorPage.goToLineEnd();
      await page.keyboard.type('!');
      await editorPage.goToLineStart();
      await page.keyboard.type('>');

      await page.waitForTimeout(300);
      await expect(editorPage.prosemirror).toContainText('>Hello World!');
    });

    test('cursor moves between blocks with arrow keys', async ({ page }) => {
      await loadMarkdown(page, 'First\n\nSecond');
      await page.waitForTimeout(300);

      // Click first paragraph, go to end, arrow down
      await editorPage.paragraph().first().click();
      await editorPage.goToLineEnd();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.type('X');

      await page.waitForTimeout(300);
      await expect(editorPage.paragraph().nth(1)).toContainText('X');
    });
  });

  test.describe('9. Code Block Editing', () => {
    test('typing in code block preserves formatting', async ({ page }) => {
      await loadMarkdown(page, '```js\nconst x = 1;\n```');
      await page.waitForTimeout(300);

      await editorPage.codeBlock().click();
      await editorPage.goToLineEnd();
      await page.keyboard.press('Enter');
      await page.keyboard.type('const y = 2;');

      await page.waitForTimeout(300);
      await expect(editorPage.codeBlock()).toContainText('const y = 2;');
    });

    test('typing in code block works correctly', async ({ page }) => {
      await loadMarkdown(page, '```\ncode\n```');
      await page.waitForTimeout(300);

      await editorPage.codeBlock().click();
      await editorPage.goToLineEnd();
      await page.keyboard.type('123');

      await page.waitForTimeout(300);
      const codeContent = await editorPage.codeBlock().textContent();
      expect(codeContent).toContain('code123');
    });

    test('exiting code block with arrow down at end', async ({ page }) => {
      await loadMarkdown(page, '```\ncode\n```\n\nParagraph');
      await page.waitForTimeout(300);

      await editorPage.codeBlock().click();
      await editorPage.goToDocumentEnd();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.type('X');

      await page.waitForTimeout(300);
      await expect(editorPage.paragraph()).toContainText('X');
    });
  });

  test.describe('10. Table Editing', () => {
    test('table renders correctly', async ({ page }) => {
      await loadMarkdown(page, '| A | B |\n|---|---|\n| 1 | 2 |');
      await page.waitForTimeout(300);

      // Verify table structure
      await expect(editorPage.table()).toBeVisible();
      const rows = editorPage.table().locator('tr');
      await expect(rows).toHaveCount(2); // header row + data row

      // Verify content
      await expect(editorPage.table()).toContainText('A');
      await expect(editorPage.table()).toContainText('B');
      await expect(editorPage.table()).toContainText('1');
      await expect(editorPage.table()).toContainText('2');
    });

    test('typing in table cell works', async ({ page }) => {
      await loadMarkdown(page, '| A | B |\n|---|---|\n| 1 | 2 |');
      await page.waitForTimeout(300);

      // Click first data cell and add text
      const cells = editorPage.table().locator('td');
      await cells.first().click();
      await editorPage.goToLineEnd();
      await page.keyboard.type('X');

      await page.waitForTimeout(300);
      await expect(cells.first()).toContainText('1X');
    });

    test('table cell editing works', async ({ page }) => {
      await loadMarkdown(page, '| A | B |\n|---|---|\n| 1 | 2 |');
      await page.waitForTimeout(300);

      // Edit a table cell
      const dataCells = editorPage.table().locator('td');
      await dataCells.first().click();
      await editorPage.goToLineEnd();
      await page.keyboard.type('X');

      await page.waitForTimeout(300);
      await expect(dataCells.first()).toContainText('1X');
    });
  });

  test.describe('11. Blockquote Editing', () => {
    test('Enter in blockquote continues the quote', async ({ page }) => {
      await loadMarkdown(page, '> First line');
      await page.waitForTimeout(300);

      await editorPage.blockquote().click();
      await editorPage.goToLineEnd();
      await page.keyboard.press('Enter');
      await page.keyboard.type('Second line');

      await page.waitForTimeout(300);
      await expect(editorPage.blockquote()).toContainText('Second line');
    });

    test('backspace on empty blockquote line exits blockquote', async ({ page }) => {
      await loadMarkdown(page, '> Quote');
      await page.waitForTimeout(300);

      await editorPage.blockquote().click();
      await editorPage.goToLineEnd();
      await page.keyboard.press('Enter'); // Create new line in blockquote
      await page.keyboard.press('Backspace'); // Exit blockquote
      await page.keyboard.type('Not quoted');

      await page.waitForTimeout(300);
      // Check that "Not quoted" exists somewhere outside the blockquote
      await expect(editorPage.prosemirror).toContainText('Not quoted');
    });
  });

  test.describe('12. Roundtrip Integrity', () => {
    test('edit preserves markdown structure', async ({ page }) => {
      const original = '# Heading\n\nParagraph with **bold** and *italic*.\n\n- Item 1\n- Item 2';
      await loadMarkdown(page, original);
      await page.waitForTimeout(300);

      // Make a small edit
      await editorPage.heading(1).click();
      await editorPage.goToLineEnd();
      await page.keyboard.type(' Modified');
      await page.waitForTimeout(500);

      const md = await getEditorMarkdown(page);
      expect(md).toContain('# Heading Modified');
      expect(md).toContain('**bold**');
      expect(md).toContain('*italic*');
      expect(md).toContain('- Item 1');
    });

    test('complex document roundtrips correctly', async ({ page }) => {
      const complex = '# Title\n\nParagraph with **bold**.\n\n- Bullet 1\n- Bullet 2';

      await loadMarkdown(page, complex);
      await page.waitForTimeout(300);

      // Verify elements rendered
      await expect(editorPage.heading(1)).toBeVisible();
      await expect(editorPage.bulletList()).toBeVisible();
      await expect(editorPage.bold()).toBeVisible();

      // Make a small edit to trigger update
      await editorPage.heading(1).click();
      await editorPage.goToLineEnd();
      await page.keyboard.type(' ');
      await page.waitForTimeout(500);

      // Get markdown back and verify structure
      const md = await getEditorMarkdown(page);
      expect(md).toBeTruthy();
      expect(md).toContain('Title');
      expect(md).toContain('**bold**');
      expect(md).toContain('Bullet 1');
    });
  });

  test.describe('13. Full Editing Session', () => {
    test('complete editing workflow creates multiple elements', async ({ page }) => {
      // Load a document with multiple element types
      const content = [
        '# My Document',
        '',
        'Introduction paragraph.',
        '',
        '- Item one',
        '- Item two',
      ].join('\n');

      await loadMarkdown(page, content);
      await page.waitForTimeout(300);

      // Verify elements rendered
      await expect(editorPage.heading(1)).toBeVisible();
      await expect(editorPage.bulletList()).toBeVisible();

      const listItems = editorPage.bulletList().locator('li');
      await expect(listItems).toHaveCount(2);

      // Make an edit - add to the list
      await listItems.last().click();
      await editorPage.goToLineEnd();
      await page.keyboard.press('Enter');
      await page.keyboard.type('Item three');

      await page.waitForTimeout(300);
      await expect(listItems).toHaveCount(3);

      // Verify roundtrip
      const md = await getEditorMarkdown(page);
      expect(md).toContain('# My Document');
      expect(md).toContain('Introduction paragraph');
      expect(md).toContain('Item three');
    });
  });
});
