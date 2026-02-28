import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown } from '../fixtures';

test.describe('Table of Contents', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  const multiHeadingDoc = `# Title

Some intro text.

## Section One

Content under section one.

### Subsection A

Details here.

## Section Two

More content.

#### Deep Heading`;

  async function openToc(page: import('@playwright/test').Page) {
    // Focus the editor first so the keyboard shortcut reaches ProseMirror
    await page.locator('.ProseMirror').click();
    await page.waitForTimeout(100);
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${mod}+/`);
  }

  test('opens with Cmd+/ and shows headings', async ({ page }) => {
    await loadMarkdown(page, multiHeadingDoc);
    await page.waitForTimeout(300);

    await openToc(page);

    // Modal should be visible
    const modal = page.locator('.quartz-toc-modal');
    await expect(modal).toBeVisible();

    // Should show all 5 headings
    const items = page.locator('.quartz-toc-item');
    await expect(items).toHaveCount(5);

    // Verify heading text
    await expect(items.nth(0)).toContainText('Title');
    await expect(items.nth(1)).toContainText('Section One');
    await expect(items.nth(2)).toContainText('Subsection A');
    await expect(items.nth(3)).toContainText('Section Two');
    await expect(items.nth(4)).toContainText('Deep Heading');
  });

  test('filters headings as user types', async ({ page }) => {
    await loadMarkdown(page, multiHeadingDoc);
    await page.waitForTimeout(300);

    await openToc(page);

    const searchInput = page.locator('.quartz-toc-search input');
    await expect(searchInput).toBeFocused();

    await searchInput.fill('Section');

    const items = page.locator('.quartz-toc-item');
    await expect(items).toHaveCount(3); // Section One, Subsection A, Section Two
  });

  test('keyboard navigation works (ArrowDown, ArrowUp, Enter)', async ({ page }) => {
    await loadMarkdown(page, multiHeadingDoc);
    await page.waitForTimeout(300);

    await openToc(page);

    // First item should be selected by default
    const items = page.locator('.quartz-toc-item');
    await expect(items.nth(0)).toHaveClass(/selected/);

    // Move down
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toHaveClass(/selected/);

    await page.keyboard.press('ArrowDown');
    await expect(items.nth(2)).toHaveClass(/selected/);

    // Move back up
    await page.keyboard.press('ArrowUp');
    await expect(items.nth(1)).toHaveClass(/selected/);

    // Press Enter to select and close
    await page.keyboard.press('Enter');
    const modal = page.locator('.quartz-toc-modal');
    await expect(modal).not.toBeVisible();
  });

  test('Escape closes the overlay', async ({ page }) => {
    await loadMarkdown(page, multiHeadingDoc);
    await page.waitForTimeout(300);

    await openToc(page);

    const modal = page.locator('.quartz-toc-modal');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('clicking backdrop closes the overlay', async ({ page }) => {
    await loadMarkdown(page, multiHeadingDoc);
    await page.waitForTimeout(300);

    await openToc(page);

    const modal = page.locator('.quartz-toc-modal');
    await expect(modal).toBeVisible();

    // Click the backdrop (outside the modal)
    await page.locator('.quartz-toc-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(modal).not.toBeVisible();
  });

  test('shows empty message when no headings in document', async ({ page }) => {
    await loadMarkdown(page, 'Just a paragraph\n\nAnother paragraph');
    await page.waitForTimeout(300);

    await openToc(page);

    const empty = page.locator('.quartz-toc-empty');
    await expect(empty).toBeVisible();
    await expect(empty).toContainText('No headings');
  });
});
