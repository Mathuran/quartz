import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown, updateConfig } from '../fixtures';

test.describe('Theme Rendering', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('light theme can be applied', async ({ page }) => {
    await loadMarkdown(page, '# Hello');
    await page.waitForTimeout(300);

    await updateConfig(page, {
      theme: 'light',
      fontFamily: 'inherit',
      fontSize: 16,
      pageLayout: true,
      pageMargin: 72,
      imageDir: './assets',
      preserveFormatting: true,
      showBlockHandles: true,
    });

    // Editor should still be visible after config update
    await expect(editorPage.prosemirror).toBeVisible();
    await expect(editorPage.heading(1)).toContainText('Hello');
  });

  test('dark theme can be applied', async ({ page }) => {
    await loadMarkdown(page, '# Hello');
    await page.waitForTimeout(300);

    await updateConfig(page, {
      theme: 'dark',
      fontFamily: 'inherit',
      fontSize: 16,
      pageLayout: true,
      pageMargin: 72,
      imageDir: './assets',
      preserveFormatting: true,
      showBlockHandles: true,
    });

    // Editor should still be visible after config update
    await expect(editorPage.prosemirror).toBeVisible();
    await expect(editorPage.heading(1)).toContainText('Hello');
  });

  test('auto theme does not crash', async ({ page }) => {
    await loadMarkdown(page, '# Hello');
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

    // Editor should still be visible after config update
    await expect(editorPage.prosemirror).toBeVisible();
  });
});
