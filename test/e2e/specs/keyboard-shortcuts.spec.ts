import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown, getUpdateCount, waitForUpdate } from '../fixtures';

test.describe('Keyboard Shortcuts', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('Mod+B toggles bold on selected text', async ({ page }) => {
    await loadMarkdown(page, 'Hello world');
    await page.waitForTimeout(300);

    // Select all and apply bold
    await editorPage.selectAllText();
    await editorPage.toggleBold();

    await expect(editorPage.bold()).toBeVisible();
    await expect(editorPage.bold()).toContainText('Hello world');
  });

  test('Mod+I toggles italic on selected text', async ({ page }) => {
    await loadMarkdown(page, 'Hello world');
    await page.waitForTimeout(300);

    // Select all and apply italic
    await editorPage.selectAllText();
    await editorPage.toggleItalic();

    await expect(editorPage.italic()).toBeVisible();
    await expect(editorPage.italic()).toContainText('Hello world');
  });

  test('Mod+Z undoes last action', async ({ page }) => {
    await loadMarkdown(page, 'Original');
    await page.waitForTimeout(300);

    // Type something new
    await editorPage.prosemirror.click();
    await editorPage.goToLineEnd();
    await page.keyboard.type(' added');
    await page.waitForTimeout(400); // Wait for debounce

    // Verify text was added
    await expect(editorPage.prosemirror).toContainText('added');

    // Undo
    await editorPage.undo();
    await page.waitForTimeout(300);

    // Verify undo worked
    await expect(editorPage.prosemirror).not.toContainText('added');
  });

  test('Mod+Shift+Z redoes undone action', async ({ page }) => {
    await loadMarkdown(page, 'Original');
    await page.waitForTimeout(300);

    // Type, undo, then redo
    await editorPage.prosemirror.click();
    await editorPage.goToLineEnd();
    await page.keyboard.type(' added');
    await page.waitForTimeout(400);

    await editorPage.undo();
    await page.waitForTimeout(300);
    await expect(editorPage.prosemirror).not.toContainText('added');

    await editorPage.redo();
    await page.waitForTimeout(300);
    await expect(editorPage.prosemirror).toContainText('added');
  });

  test('Mod+A selects all text', async ({ page }) => {
    await loadMarkdown(page, 'Hello world');
    await page.waitForTimeout(300);

    // Select all and apply bold to verify selection worked
    await editorPage.selectAllText();
    await editorPage.toggleBold();

    // Text should be bold
    await expect(editorPage.bold()).toBeVisible();
    await expect(editorPage.bold()).toContainText('Hello');
  });

  test('Enter creates new paragraph', async ({ page }) => {
    await loadMarkdown(page, 'First line');
    await page.waitForTimeout(300);

    // Move to end and press Enter
    await editorPage.prosemirror.click();
    await editorPage.goToLineEnd();
    await page.keyboard.press('Enter');
    await page.keyboard.type('Second line');

    // Should have 2 paragraphs
    const paragraphs = editorPage.paragraph();
    await expect(paragraphs).toHaveCount(2);
  });

  test('Backspace at start of paragraph works', async ({ page }) => {
    await loadMarkdown(page, 'First\n\nSecond');
    await page.waitForTimeout(300);

    // Click at start of second paragraph and press backspace
    const secondPara = editorPage.paragraph().nth(1);
    await secondPara.click();
    await editorPage.goToLineStart();
    await page.keyboard.press('Backspace');

    // Should merge paragraphs
    await page.waitForTimeout(300);
    await expect(editorPage.prosemirror).toContainText('FirstSecond');
  });

  test('Mod+E toggles inline code', async ({ page }) => {
    await loadMarkdown(page, 'Hello world');
    await page.waitForTimeout(300);

    // Select all and apply code
    await editorPage.selectAllText();
    await editorPage.toggleCode();

    const inlineCode = editorPage.prosemirror.locator('code');
    await expect(inlineCode).toBeVisible();
  });
});
