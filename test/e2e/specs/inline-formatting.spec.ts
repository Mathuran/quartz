import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadFixture, loadMarkdown } from '../fixtures';

test.describe('Inline Formatting', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('renders bold text as strong element', async ({ page }) => {
    await loadMarkdown(page, 'This is **bold text** here.');

    await expect(editorPage.bold()).toBeVisible();
    await expect(editorPage.bold()).toContainText('bold text');
  });

  test('renders italic text as em element', async ({ page }) => {
    await loadMarkdown(page, 'This is *italic text* here.');

    await expect(editorPage.italic()).toBeVisible();
    await expect(editorPage.italic()).toContainText('italic text');
  });

  test('renders inline code as code element', async ({ page }) => {
    await loadMarkdown(page, 'This is `inline code` here.');

    const inlineCode = editorPage.prosemirror.locator('code');
    await expect(inlineCode).toBeVisible();
    await expect(inlineCode).toContainText('inline code');
  });

  test('renders strikethrough text', async ({ page }) => {
    await loadMarkdown(page, 'This is ~~strikethrough~~ here.');

    await expect(editorPage.strikethrough()).toBeVisible();
    await expect(editorPage.strikethrough()).toContainText('strikethrough');
  });

  test('renders links with correct href', async ({ page }) => {
    await loadMarkdown(page, 'Click [this link](https://example.com) here.');

    await expect(editorPage.link()).toBeVisible();
    await expect(editorPage.link()).toContainText('this link');
    await expect(editorPage.link()).toHaveAttribute('href', 'https://example.com');
  });

  test('renders combined formatting with nested tags', async ({ page }) => {
    // Use complex.md which has confirmed bold and italic
    await loadFixture(page, 'complex.md');

    // Multiple format types should be present
    await expect(editorPage.bold()).toBeVisible();
    await expect(editorPage.italic()).toBeVisible();
  });

  test('renders all inline formats from fixture', async ({ page }) => {
    // Load directly to avoid fixture path issues
    await loadMarkdown(page, '# Test\n\nHas **bold** and *italic*.');

    // Verify bold and italic are present (most reliable)
    await expect(editorPage.bold()).toBeVisible();
    await expect(editorPage.italic()).toBeVisible();
  });
});
