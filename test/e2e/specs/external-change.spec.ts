import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown, sendExternalChange } from '../fixtures';

test.describe('External Changes', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('external change replaces editor content', async ({ page }) => {
    await loadMarkdown(page, '# Original Content\n\nFirst paragraph.');
    await page.waitForTimeout(300);

    // Verify original content
    await expect(editorPage.heading(1)).toContainText('Original Content');

    // Send external change
    await sendExternalChange(page, '# New Content\n\nReplaced paragraph.');
    await page.waitForTimeout(300);

    // Editor should show new content
    await expect(editorPage.heading(1)).toContainText('New Content');
    await expect(editorPage.paragraph()).toContainText('Replaced paragraph');
    await expect(editorPage.prosemirror).not.toContainText('Original Content');
  });

  test('external change after user edit overwrites with external content', async ({ page }) => {
    await loadMarkdown(page, '# Start');
    await page.waitForTimeout(300);

    // User makes an edit
    await editorPage.prosemirror.click();
    await editorPage.goToLineEnd();
    await page.keyboard.type(' user edit');
    await page.waitForTimeout(400);

    await expect(editorPage.prosemirror).toContainText('user edit');

    // External change arrives
    await sendExternalChange(page, '# External Override');
    await page.waitForTimeout(300);

    // External content should win
    await expect(editorPage.heading(1)).toContainText('External Override');
    await expect(editorPage.prosemirror).not.toContainText('user edit');
  });

  test('rapid external changes settle on final content', async ({ page }) => {
    await loadMarkdown(page, '# Initial');
    await page.waitForTimeout(300);

    // Send multiple rapid external changes
    await sendExternalChange(page, '# Change 1');
    await sendExternalChange(page, '# Change 2');
    await sendExternalChange(page, '# Change 3');
    await sendExternalChange(page, '# Final Change');

    // Wait for editor to settle
    await page.waitForTimeout(500);

    // Should show the last content
    await expect(editorPage.heading(1)).toContainText('Final Change');
  });
});
