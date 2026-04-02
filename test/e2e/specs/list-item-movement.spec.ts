import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown, getUpdateCount, waitForUpdate } from '../fixtures';

test.describe('List Item Movement', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('move single bullet list item down', async ({ page }) => {
    await loadMarkdown(page, '- Alpha\n- Beta\n- Gamma');
    await page.waitForTimeout(300);

    const items = editorPage.bulletList().locator('li');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toContainText('Alpha');

    // Click first item, move down
    await items.nth(0).click();
    await page.waitForTimeout(100);
    await editorPage.moveBlockDown();
    await page.waitForTimeout(200);

    // Alpha should now be second
    await expect(items.nth(0)).toContainText('Beta');
    await expect(items.nth(1)).toContainText('Alpha');
    await expect(items.nth(2)).toContainText('Gamma');
  });

  test('move single bullet list item up', async ({ page }) => {
    await loadMarkdown(page, '- Alpha\n- Beta\n- Gamma');
    await page.waitForTimeout(300);

    const items = editorPage.bulletList().locator('li');

    // Click second item, move up
    await items.nth(1).click();
    await page.waitForTimeout(100);
    await editorPage.moveBlockUp();
    await page.waitForTimeout(200);

    // Beta should now be first
    await expect(items.nth(0)).toContainText('Beta');
    await expect(items.nth(1)).toContainText('Alpha');
    await expect(items.nth(2)).toContainText('Gamma');
  });

  test('boundary: first item up escalates to block move', async ({ page }) => {
    await loadMarkdown(page, 'Above paragraph\n\n- First\n- Second');
    await page.waitForTimeout(300);

    const items = editorPage.bulletList().locator('li');

    // Click first list item, move up — should move entire list above the paragraph
    await items.nth(0).click();
    await page.waitForTimeout(100);

    // Capture update count BEFORE the move so we can wait for the post-move update
    const countBefore = await getUpdateCount(page);
    await editorPage.moveBlockUp();

    // Wait for the debounced update triggered by the block move
    const output = await waitForUpdate(page, countBefore - 1, 3000);
    // List marker should appear before "Above paragraph" in serialized output
    const listIndex = output.indexOf('- First');
    const paraIndex = output.indexOf('Above paragraph');
    expect(listIndex).toBeLessThan(paraIndex);
  });

  test('boundary: last item down escalates to block move', async ({ page }) => {
    await loadMarkdown(page, '- First\n- Second\n\nBelow paragraph');
    await page.waitForTimeout(300);

    const items = editorPage.bulletList().locator('li');

    // Click last list item, move down — should move entire list below the paragraph
    await items.nth(1).click();
    await page.waitForTimeout(100);

    // Capture update count BEFORE the move so we can wait for the post-move update
    const countBefore = await getUpdateCount(page);
    await editorPage.moveBlockDown();

    // Wait for the debounced update triggered by the block move
    const output = await waitForUpdate(page, countBefore - 1, 3000);
    // Paragraph should appear before list in serialized output
    const paraIndex = output.indexOf('Below paragraph');
    const listIndex = output.indexOf('- First');
    expect(paraIndex).toBeLessThan(listIndex);
  });

  test('undo reverses list item move', async ({ page }) => {
    await loadMarkdown(page, '- Alpha\n- Beta\n- Gamma');
    await page.waitForTimeout(300);

    const items = editorPage.bulletList().locator('li');

    // Move first item down
    await items.nth(0).click();
    await page.waitForTimeout(100);
    await editorPage.moveBlockDown();
    await page.waitForTimeout(200);

    // Verify moved
    await expect(items.nth(0)).toContainText('Beta');
    await expect(items.nth(1)).toContainText('Alpha');

    // Undo
    await editorPage.undo();
    await page.waitForTimeout(200);

    // Should restore original order
    await expect(items.nth(0)).toContainText('Alpha');
    await expect(items.nth(1)).toContainText('Beta');
    await expect(items.nth(2)).toContainText('Gamma');
  });

  test('ordered list item movement', async ({ page }) => {
    await loadMarkdown(page, '1. One\n2. Two\n3. Three');
    await page.waitForTimeout(300);

    const items = editorPage.orderedList().locator('li');
    await expect(items).toHaveCount(3);

    // Move first item down
    await items.nth(0).click();
    await page.waitForTimeout(100);
    await editorPage.moveBlockDown();
    await page.waitForTimeout(200);

    // "One" should now be second
    await expect(items.nth(0)).toContainText('Two');
    await expect(items.nth(1)).toContainText('One');
    await expect(items.nth(2)).toContainText('Three');
  });
});
