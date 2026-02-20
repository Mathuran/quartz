import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown, getUpdateCount, waitForUpdate } from '../fixtures';

test.describe('Editing', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('typing text into empty editor creates paragraph', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    await editorPage.typeInEditor('Hello world');

    await expect(editorPage.paragraph()).toBeVisible();
    await expect(editorPage.paragraph()).toContainText('Hello world');
  });

  test('backspace at paragraph start merges with previous', async ({ page }) => {
    await loadMarkdown(page, 'First\n\nSecond');
    await page.waitForTimeout(300);

    // Navigate to start of second paragraph
    const secondPara = editorPage.paragraph().nth(1);
    await secondPara.click();
    await editorPage.goToLineStart();
    await page.keyboard.press('Backspace');

    await page.waitForTimeout(300);
    // Should now have merged text
    await expect(editorPage.prosemirror).toContainText('FirstSecond');
  });

  test('undo reverts text insertion', async ({ page }) => {
    await loadMarkdown(page, 'Original');
    await page.waitForTimeout(300);

    // Add text
    await editorPage.prosemirror.click();
    await editorPage.goToLineEnd();
    await page.keyboard.type(' new');
    await page.waitForTimeout(400);

    await expect(editorPage.prosemirror).toContainText('new');

    // Undo
    await editorPage.undo();
    await page.waitForTimeout(300);

    await expect(editorPage.prosemirror).not.toContainText('new');
  });

  test('redo restores undone text', async ({ page }) => {
    await loadMarkdown(page, 'Original');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await editorPage.goToLineEnd();
    await page.keyboard.type(' new');
    await page.waitForTimeout(400);

    await editorPage.undo();
    await page.waitForTimeout(300);
    await editorPage.redo();
    await page.waitForTimeout(300);

    await expect(editorPage.prosemirror).toContainText('new');
  });

  test('multiple edits produce debounced updates', async ({ page }) => {
    await loadMarkdown(page, 'Start');
    await page.waitForTimeout(500);

    const countBefore = await getUpdateCount(page);

    // Type quickly multiple times
    await editorPage.prosemirror.click();
    await editorPage.goToLineEnd();
    await page.keyboard.type('a');
    await page.keyboard.type('b');
    await page.keyboard.type('c');
    await page.keyboard.type('d');
    await page.keyboard.type('e');

    // Wait for debounce to complete
    await page.waitForTimeout(600);
    const countAfter = await getUpdateCount(page);

    // Should have fewer updates than individual keystrokes due to debouncing
    // Expecting 1-3 updates, not 5
    expect(countAfter - countBefore).toBeLessThanOrEqual(3);
    expect(countAfter).toBeGreaterThan(countBefore);
  });
});
