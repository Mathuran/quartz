import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown, updateConfig } from '../fixtures';

test.describe('Sidebar Alignment', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('editor aligns right when sidebar is on left', async ({ page }) => {
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
      sidebarPosition: 'left',
    });

    await page.waitForTimeout(200);

    // Check that page wrapper has align-right class
    const pageWrapper = page.locator('.quartz-page-wrapper');
    await expect(pageWrapper).toHaveClass(/align-right/);
    await expect(pageWrapper).not.toHaveClass(/align-left/);
  });

  test('editor aligns left when sidebar is on right', async ({ page }) => {
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
      sidebarPosition: 'right',
    });

    await page.waitForTimeout(200);

    // Check that page wrapper has align-left class
    const pageWrapper = page.locator('.quartz-page-wrapper');
    await expect(pageWrapper).toHaveClass(/align-left/);
    await expect(pageWrapper).not.toHaveClass(/align-right/);
  });

  test('alignment updates dynamically when sidebar position changes', async ({ page }) => {
    await loadMarkdown(page, '# Hello\n\nParagraph content.');
    await page.waitForTimeout(300);

    // Start with sidebar on left
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
      sidebarPosition: 'left',
    });

    await page.waitForTimeout(200);

    const pageWrapper = page.locator('.quartz-page-wrapper');
    await expect(pageWrapper).toHaveClass(/align-right/);

    // Change sidebar to right
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
      sidebarPosition: 'right',
    });

    await page.waitForTimeout(200);

    await expect(pageWrapper).toHaveClass(/align-left/);
    await expect(pageWrapper).not.toHaveClass(/align-right/);
  });
});
