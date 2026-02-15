import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown } from '../fixtures';

test.describe('Block Movement', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
    await loadMarkdown(page, 'First paragraph\n\nSecond paragraph\n\nThird paragraph');
    await page.waitForTimeout(300);
  });

  test('Alt+ArrowDown moves paragraph down', async ({ page }) => {
    const paras = editorPage.paragraph();

    // Verify initial order
    await expect(paras.nth(0)).toContainText('First paragraph');
    await expect(paras.nth(1)).toContainText('Second paragraph');
    await expect(paras.nth(2)).toContainText('Third paragraph');

    // Place cursor in first paragraph
    await paras.nth(0).click();
    await page.waitForTimeout(100);

    // Press Alt+ArrowDown to move block down
    await editorPage.moveBlockDown();
    await page.waitForTimeout(200);

    // First paragraph should now be second
    await expect(paras.nth(0)).toContainText('Second paragraph');
    await expect(paras.nth(1)).toContainText('First paragraph');
    await expect(paras.nth(2)).toContainText('Third paragraph');
  });

  test('Alt+ArrowUp moves paragraph up', async ({ page }) => {
    const paras = editorPage.paragraph();

    // Verify initial order
    await expect(paras.nth(0)).toContainText('First paragraph');
    await expect(paras.nth(1)).toContainText('Second paragraph');
    await expect(paras.nth(2)).toContainText('Third paragraph');

    // Place cursor in second paragraph
    await paras.nth(1).click();
    await page.waitForTimeout(100);

    // Press Alt+ArrowUp to move block up
    await editorPage.moveBlockUp();
    await page.waitForTimeout(200);

    // Second paragraph should now be first
    await expect(paras.nth(0)).toContainText('Second paragraph');
    await expect(paras.nth(1)).toContainText('First paragraph');
    await expect(paras.nth(2)).toContainText('Third paragraph');
  });

  test('Alt+ArrowUp at top does nothing (no error)', async ({ page }) => {
    const paras = editorPage.paragraph();

    // Verify initial order
    await expect(paras.nth(0)).toContainText('First paragraph');
    await expect(paras.nth(1)).toContainText('Second paragraph');
    await expect(paras.nth(2)).toContainText('Third paragraph');

    // Place cursor in first paragraph (which is already at the top)
    await paras.nth(0).click();
    await page.waitForTimeout(100);

    // Press Alt+ArrowUp - should do nothing since we're at the top
    await editorPage.moveBlockUp();
    await page.waitForTimeout(200);

    // Order should remain unchanged
    await expect(paras.nth(0)).toContainText('First paragraph');
    await expect(paras.nth(1)).toContainText('Second paragraph');
    await expect(paras.nth(2)).toContainText('Third paragraph');

    // Verify no error by ensuring paragraphs still have correct count
    await expect(paras).toHaveCount(3);
  });

  test('Alt+ArrowDown at bottom does nothing (no error)', async ({ page }) => {
    const paras = editorPage.paragraph();

    // Place cursor in third paragraph (which is at the bottom)
    await paras.nth(2).click();
    await page.waitForTimeout(100);

    // Press Alt+ArrowDown - should do nothing since we're at the bottom
    await editorPage.moveBlockDown();
    await page.waitForTimeout(200);

    // Order should remain unchanged
    await expect(paras.nth(0)).toContainText('First paragraph');
    await expect(paras.nth(1)).toContainText('Second paragraph');
    await expect(paras.nth(2)).toContainText('Third paragraph');

    // Verify no error by ensuring paragraphs still have correct count
    await expect(paras).toHaveCount(3);
  });

  test('multiple block movements work correctly', async ({ page }) => {
    const paras = editorPage.paragraph();

    // Place cursor in first paragraph
    await paras.nth(0).click();
    await page.waitForTimeout(100);

    // Move first paragraph down twice (to position 3)
    await editorPage.moveBlockDown();
    await page.waitForTimeout(150);
    await editorPage.moveBlockDown();
    await page.waitForTimeout(200);

    // First paragraph should now be last
    await expect(paras.nth(0)).toContainText('Second paragraph');
    await expect(paras.nth(1)).toContainText('Third paragraph');
    await expect(paras.nth(2)).toContainText('First paragraph');
  });
});
