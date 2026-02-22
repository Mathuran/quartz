import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown, updateConfig } from '../fixtures';

test.describe('Page Centering', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('editor is always centered in page layout', async ({ page }) => {
    await loadMarkdown(page, '# Hello\n\nParagraph content.');
    await page.waitForTimeout(300);

    await updateConfig(page, {
      theme: 'auto',
      fontFamily: 'inherit',
      fontSize: 16,
      pageLayout: true,
      pageMargin: 72,
      imageDir: './assets',
      preserveFormatting: true,
      showBlockHandles: true,
    });

    await page.waitForTimeout(200);

    const pageWrapper = page.locator('.quartz-page-wrapper');
    await expect(pageWrapper).toHaveClass(/align-center/);
  });
});
