import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown, getUpdateCount, waitForUpdate } from '../fixtures';

test.describe('Roundtrip', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('unedited markdown is preserved in output', async ({ page }) => {
    const original = '# Heading\n\nParagraph text.';
    await loadMarkdown(page, original);

    // Wait for initial serialization
    await page.waitForTimeout(500);
    const count = await getUpdateCount(page);

    if (count > 0) {
      const output = await waitForUpdate(page, -1, 2000);
      // Output should contain the same content
      expect(output).toContain('Heading');
      expect(output).toContain('Paragraph text');
    }
  });

  test('adding bold formatting produces markdown with asterisks', async ({ page }) => {
    await loadMarkdown(page, 'Hello world');
    await page.waitForTimeout(400);

    const countBefore = await getUpdateCount(page);

    // Select all and bold
    await editorPage.selectAllText();
    await editorPage.toggleBold();

    // Wait for update
    const output = await waitForUpdate(page, countBefore - 1, 3000);

    // Should contain markdown bold syntax
    expect(output).toMatch(/\*\*.*Hello world.*\*\*/);
  });

  test('adding list item produces correct list markdown', async ({ page }) => {
    await loadMarkdown(page, '- Item 1');
    await page.waitForTimeout(400);

    const countBefore = await getUpdateCount(page);

    // Navigate to end and add new item
    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Item 2');

    // Wait for update
    await page.waitForTimeout(500);
    const output = await waitForUpdate(page, countBefore - 1, 3000);

    // Should have both items
    expect(output).toContain('Item 1');
    expect(output).toContain('Item 2');
    expect(output).toMatch(/-\s+Item/);
  });

  test('editing preserves surrounding unedited content', async ({ page }) => {
    await loadMarkdown(page, '# Title\n\nMiddle paragraph\n\n## Subtitle');
    await page.waitForTimeout(400);

    const countBefore = await getUpdateCount(page);

    // Click in middle paragraph and add text
    const middlePara = editorPage.paragraph().first();
    await middlePara.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' edited');

    // Wait for update
    await page.waitForTimeout(500);
    const output = await waitForUpdate(page, countBefore - 1, 3000);

    // All sections should be present
    expect(output).toContain('Title');
    expect(output).toContain('edited');
    expect(output).toContain('Subtitle');
  });
});
