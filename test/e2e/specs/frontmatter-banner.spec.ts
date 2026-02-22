import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown, getUpdateCount, waitForUpdate, sendExternalChange } from '../fixtures';

test.describe('Frontmatter Banner', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('banner renders for file with frontmatter', async ({ page }) => {
    await loadMarkdown(page, '---\ntitle: Test\n---\n\nHello');
    await page.waitForTimeout(300);

    const banner = page.locator('.quartz-frontmatter-banner');
    await expect(banner).toBeVisible();

    const label = page.locator('.quartz-frontmatter-label');
    await expect(label).toContainText('Frontmatter');
  });

  test('no banner for file without frontmatter', async ({ page }) => {
    await loadMarkdown(page, '# Just a heading\n\nSome text');
    await page.waitForTimeout(300);

    const banner = page.locator('.quartz-frontmatter-banner');
    await expect(banner).toHaveCount(0);

    const addButton = page.locator('.quartz-frontmatter-add');
    await expect(addButton).toBeVisible();
  });

  test('collapse and expand toggle', async ({ page }) => {
    await loadMarkdown(page, '---\ntitle: Test\ntags: demo\n---\n\nHello');
    await page.waitForTimeout(300);

    const textarea = page.locator('.quartz-frontmatter-textarea');
    const header = page.locator('.quartz-frontmatter-header');
    const label = page.locator('.quartz-frontmatter-label');

    // Initially expanded — textarea visible
    await expect(textarea).toBeVisible();

    // Click header to collapse
    await header.click();
    await page.waitForTimeout(100);

    // Textarea should be hidden, label shows property count
    await expect(textarea).toHaveCount(0);
    await expect(label).toContainText('properties');

    // Click header again to expand
    await header.click();
    await page.waitForTimeout(100);

    await expect(page.locator('.quartz-frontmatter-textarea')).toBeVisible();
  });

  test('edit frontmatter', async ({ page }) => {
    await loadMarkdown(page, '---\ntitle: Original\n---\n\nBody text');
    await page.waitForTimeout(300);

    const countBefore = await getUpdateCount(page);

    const textarea = page.locator('.quartz-frontmatter-textarea');
    await textarea.click();
    // Select all text in textarea and replace
    await page.keyboard.press('Meta+a');
    await page.keyboard.type('title: Updated');

    // Wait for debounce (300ms) + serialization
    const output = await waitForUpdate(page, countBefore - 1, 3000);

    expect(output).toContain('---');
    expect(output).toContain('title: Updated');
  });

  test('remove frontmatter', async ({ page }) => {
    await loadMarkdown(page, '---\ntitle: ToRemove\n---\n\nKeep this');
    await page.waitForTimeout(300);

    const countBefore = await getUpdateCount(page);

    const removeBtn = page.locator('.quartz-frontmatter-remove-btn');
    await removeBtn.click();
    await page.waitForTimeout(100);

    // Banner should disappear
    await expect(page.locator('.quartz-frontmatter-banner')).toHaveCount(0);

    // Serialized output should have no --- fences
    const output = await waitForUpdate(page, countBefore - 1, 3000);
    expect(output).not.toMatch(/^---/m);
  });

  test('add frontmatter to file without it', async ({ page }) => {
    await loadMarkdown(page, '# No frontmatter yet');
    await page.waitForTimeout(300);

    const addBtn = page.locator('.quartz-frontmatter-add-btn');
    await expect(addBtn).toBeVisible();

    await addBtn.click();
    await page.waitForTimeout(200);

    // Banner should now appear with empty textarea
    const banner = page.locator('.quartz-frontmatter-banner');
    await expect(banner).toBeVisible();

    const textarea = page.locator('.quartz-frontmatter-textarea');
    await expect(textarea).toBeVisible();
  });

  test('external change updates frontmatter', async ({ page }) => {
    await loadMarkdown(page, '---\ntitle: Before\n---\n\nHello');
    await page.waitForTimeout(300);

    const textarea = page.locator('.quartz-frontmatter-textarea');
    await expect(textarea).toHaveValue(/title: Before/);

    // Send external change with different frontmatter
    await sendExternalChange(page, '---\ntitle: After\nauthor: Claude\n---\n\nHello');
    await page.waitForTimeout(300);

    await expect(textarea).toHaveValue(/title: After/);
    await expect(textarea).toHaveValue(/author: Claude/);
  });

  test('frontmatter-only file shows banner and empty paragraph', async ({ page }) => {
    await loadMarkdown(page, '---\ntitle: X\n---\n');
    await page.waitForTimeout(300);

    const banner = page.locator('.quartz-frontmatter-banner');
    await expect(banner).toBeVisible();

    // Editor should have at least an empty paragraph
    const paragraphs = editorPage.paragraph();
    await expect(paragraphs).toHaveCount(1);
  });
});
