import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadFixture, loadMarkdown, getUpdateCount, waitForUpdate } from '../fixtures';

test.describe('Editor Loading', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('loads simple markdown and renders paragraphs', async ({ page }) => {
    await loadFixture(page, 'simple.md');
    const paragraphs = editorPage.paragraph();
    await expect(paragraphs.first()).toBeVisible();
  });

  test('loads complex markdown with all block types', async ({ page }) => {
    await loadFixture(page, 'complex.md');
    await expect(editorPage.heading(1)).toBeVisible();
    await expect(editorPage.codeBlock()).toBeVisible();
    await expect(editorPage.table()).toBeVisible();
    await expect(editorPage.blockquote()).toBeVisible();
  });

  test('handles empty document', async ({ page }) => {
    await loadFixture(page, 'empty.md');
    await expect(editorPage.prosemirror).toBeVisible();
  });

  test('handles large document', async ({ page }) => {
    test.slow(); // Mark as slow test for large file
    await loadFixture(page, 'large.md');
    await expect(editorPage.prosemirror).toBeVisible();
    // Verify at least some content rendered
    await expect(editorPage.heading(1).first()).toBeVisible();
  });

  test('edits text and produces updated markdown', async ({ page }) => {
    await loadMarkdown(page, '# Hello\n\nWorld');
    // Wait a moment for initial render
    await page.waitForTimeout(500);
    const countBefore = await getUpdateCount(page);

    // Click in editor and type
    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' there');

    // Wait for debounced update
    const updated = await waitForUpdate(page, countBefore - 1, 3000);
    expect(updated).toContain('there');
  });
});
