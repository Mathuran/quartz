import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown, updateConfig, DEFAULT_TEST_CONFIG } from '../fixtures';

test.describe('Visual Sanity', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('table with long text does not overflow page', async ({ page }) => {
    const md = [
      '| one | two | three |',
      '| --- | --- | --- |',
      '| asldfkja;sldfj;ljkasd;flkj | asldkfj;lasdkjf;lkjsadfl | asdl;fkj;asldfjl;asjkdf |',
      '| short | 89080 | 0450234 |',
    ].join('\n');

    await loadMarkdown(page, md);
    await page.waitForTimeout(300);

    const overflow = await page.locator('.quartz-editor-content table').evaluate((table) => {
      const page = table.closest('.quartz-page');
      if (!page) return false;
      return table.scrollWidth > page.clientWidth;
    });

    expect(overflow).toBe(false);
  });

  test('common 4-word H1 fits on one line', async ({ page }) => {
    await loadMarkdown(page, '# The Great Markdown Story\n\nSome text.');
    await page.waitForTimeout(300);

    const h1 = editorPage.heading(1).first();
    await expect(h1).toBeVisible();

    // A single-line heading should have scrollHeight close to its line-height
    // If it wraps, scrollHeight will be significantly larger
    const isOneLine = await h1.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
      // Allow up to 1.5x line-height for padding/margin, but 2x would mean wrapping
      return el.scrollHeight < lineHeight * 2;
    });

    expect(isOneLine).toBe(true);
  });

  test('long H1 wraps but does not overflow horizontally', async ({ page }) => {
    await loadMarkdown(
      page,
      '# This Is A Very Long Heading That Should Wrap Gracefully Without Overflow\n\nText.',
    );
    await page.waitForTimeout(300);

    const h1 = editorPage.heading(1).first();
    await expect(h1).toBeVisible();

    const overflows = await h1.evaluate((el) => {
      const page = el.closest('.quartz-page');
      if (!page) return false;
      return el.scrollWidth > page.clientWidth;
    });

    expect(overflows).toBe(false);
  });

  test('5-column table does not overflow page', async ({ page }) => {
    const md = [
      '| Col A | Col B | Col C | Col D | Col E |',
      '| --- | --- | --- | --- | --- |',
      '| data1 | data2 | data3 | data4 | data5 |',
      '| longer-content-here | more-data | even-more | testing | final |',
    ].join('\n');

    await loadMarkdown(page, md);
    await page.waitForTimeout(300);

    const overflow = await page.locator('.quartz-editor-content table').evaluate((table) => {
      const page = table.closest('.quartz-page');
      if (!page) return false;
      return table.scrollWidth > page.clientWidth;
    });

    expect(overflow).toBe(false);
  });

  test('preset switching applies different theme class', async ({ page }) => {
    await loadMarkdown(page, '# Hello\n\nText.');
    await page.waitForTimeout(300);

    // Start with clean (default)
    await expect(page.locator('.quartz-app')).toHaveClass(/quartz-theme-clean/);

    // Switch to warm
    await updateConfig(page, { ...DEFAULT_TEST_CONFIG, editorTheme: 'warm' });
    await page.waitForTimeout(200);

    await expect(page.locator('.quartz-app')).toHaveClass(/quartz-theme-warm/);

    // Page width stays consistent at 900px across presets
    const maxWidth = await page.locator('.quartz-page').evaluate(
      (el) => window.getComputedStyle(el).maxWidth,
    );
    expect(maxWidth).toBe('900px');
  });

  test('page has visible shadow in clean preset', async ({ page }) => {
    await loadMarkdown(page, '# Hello\n\nText.');
    await page.waitForTimeout(300);

    const shadow = await page.locator('.quartz-page').evaluate(
      (el) => window.getComputedStyle(el).boxShadow,
    );

    expect(shadow).not.toBe('none');
  });
});
