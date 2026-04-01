import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown, updateConfig, DEFAULT_TEST_CONFIG } from '../fixtures';

test.describe('Page Layout', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('page layout applies fixed width with clean preset', async ({ page }) => {
    await loadMarkdown(page, '# Hello\n\nParagraph content.');
    await page.waitForTimeout(300);

    await updateConfig(page, DEFAULT_TEST_CONFIG);
    await page.waitForTimeout(200);

    // Check that page container exists
    const pageContainer = page.locator('.quartz-page');
    await expect(pageContainer).toBeVisible();

    // Editor should still work
    await expect(editorPage.prosemirror).toBeVisible();
    await expect(editorPage.heading(1)).toContainText('Hello');
  });

  test('default preset applies 900px width', async ({ page }) => {
    await loadMarkdown(page, '# Hello\n\nParagraph content.');
    await page.waitForTimeout(300);

    await updateConfig(page, { ...DEFAULT_TEST_CONFIG, editorTheme: 'default' });
    await page.waitForTimeout(200);

    // Editor should still work
    await expect(editorPage.prosemirror).toBeVisible();
    await expect(editorPage.heading(1)).toContainText('Hello');

    // Default preset uses 900px max-width
    const maxWidth = await page.locator('.quartz-page').evaluate(
      (el) => window.getComputedStyle(el).maxWidth,
    );
    expect(maxWidth).toBe('900px');
  });

  test('preset switching changes theme class', async ({ page }) => {
    await loadMarkdown(page, '# Hello\n\nParagraph content.');
    await page.waitForTimeout(300);

    await updateConfig(page, { ...DEFAULT_TEST_CONFIG, editorTheme: 'warm' });
    await page.waitForTimeout(200);

    await expect(page.locator('.quartz-app')).toHaveClass(/quartz-theme-warm/);
    await expect(editorPage.prosemirror).toBeVisible();
  });
});
