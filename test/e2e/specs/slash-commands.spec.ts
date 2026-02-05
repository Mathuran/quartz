import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown } from '../fixtures';

test.describe('Slash Commands', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('typing / opens slash menu', async ({ page }) => {
    await loadMarkdown(page, 'Test');
    await page.waitForTimeout(300);

    // Move to end of line first
    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/');

    await expect(editorPage.slashMenu()).toBeVisible({ timeout: 2000 });
  });

  test('filtering narrows slash menu results', async ({ page }) => {
    await loadMarkdown(page, 'Test');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/head');

    await expect(editorPage.slashMenu()).toBeVisible({ timeout: 2000 });
    // Menu should show heading-related items
    await expect(editorPage.slashMenu()).toContainText(/heading/i);
  });

  test('Escape closes slash menu', async ({ page }) => {
    await loadMarkdown(page, 'Test');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/');
    await expect(editorPage.slashMenu()).toBeVisible({ timeout: 2000 });

    await page.keyboard.press('Escape');
    await expect(editorPage.slashMenu()).not.toBeVisible();
  });

  test('selecting heading command inserts h1', async ({ page }) => {
    await loadMarkdown(page, 'Test');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    // Use alias 'h1' which matches the filter
    await editorPage.triggerSlashCommand('h1');

    await expect(editorPage.heading(1)).toBeVisible();
  });

  test('selecting bullet list command inserts ul', async ({ page }) => {
    await loadMarkdown(page, 'Test');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');

    // Open slash menu and navigate to bullet list (7th item)
    await page.keyboard.type('/');
    await page.waitForSelector('.quartz-slash-menu', { timeout: 2000 });
    // Navigate down to Bullet List (after 6 headings)
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('ArrowDown');
    }
    await page.keyboard.press('Enter');

    await page.waitForTimeout(300);
    const lists = editorPage.prosemirror.locator('ul:not([data-type="taskList"])');
    await expect(lists.first()).toBeVisible({ timeout: 3000 });
  });

  test('selecting code block command inserts pre', async ({ page }) => {
    await loadMarkdown(page, 'Test');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');

    // Open slash menu and navigate to code block (10th item)
    await page.keyboard.type('/');
    await page.waitForSelector('.quartz-slash-menu', { timeout: 2000 });
    // Navigate down to Code Block (after 6 headings + bullet + numbered + task = 9)
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('ArrowDown');
    }
    await page.keyboard.press('Enter');

    await page.waitForTimeout(300);
    await expect(editorPage.codeBlock()).toBeVisible({ timeout: 3000 });
  });
});
