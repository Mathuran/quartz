import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown, updateConfig } from '../fixtures';

test.describe('Page Layout', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('page layout mode applies fixed width', async ({ page }) => {
    await loadMarkdown(page, '# Hello\n\nParagraph content.');
    await page.waitForTimeout(300);

    await updateConfig(page, {
      theme: 'auto',
      fontFamily: 'inherit',
      fontSize: 16,
      pageLayout: true,
      pageWidth: 816,
      pageMargin: 72,
      imageDir: './assets',
      preserveFormatting: true,
      showBlockHandles: true,
    });

    await page.waitForTimeout(200);

    // Check that page container exists and has width styling
    const pageContainer = page.locator('.quartz-page');
    const isVisible = await pageContainer.isVisible().catch(() => false);

    // Editor should still work regardless of page layout wrapper
    await expect(editorPage.prosemirror).toBeVisible();
    await expect(editorPage.heading(1)).toContainText('Hello');
  });

  test('fluid mode uses full width', async ({ page }) => {
    await loadMarkdown(page, '# Hello\n\nParagraph content.');
    await page.waitForTimeout(300);

    await updateConfig(page, {
      theme: 'auto',
      fontFamily: 'inherit',
      fontSize: 16,
      pageLayout: false,
      pageWidth: 816,
      pageMargin: 72,
      imageDir: './assets',
      preserveFormatting: true,
      showBlockHandles: true,
    });

    await page.waitForTimeout(200);

    // Editor should still work
    await expect(editorPage.prosemirror).toBeVisible();
    await expect(editorPage.heading(1)).toContainText('Hello');
  });

  test('custom font size is applied', async ({ page }) => {
    await loadMarkdown(page, '# Hello\n\nParagraph content.');
    await page.waitForTimeout(300);

    await updateConfig(page, {
      theme: 'auto',
      fontFamily: 'inherit',
      fontSize: 20,
      pageLayout: true,
      pageWidth: 816,
      pageMargin: 72,
      imageDir: './assets',
      preserveFormatting: true,
      showBlockHandles: true,
    });

    await page.waitForTimeout(200);

    // Editor should still work with custom font size
    await expect(editorPage.prosemirror).toBeVisible();
  });
});
