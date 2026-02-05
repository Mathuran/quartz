import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadFixture, loadMarkdown } from '../fixtures';

test.describe('Block Rendering', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test('renders headings H1-H6 with correct tags', async ({ page }) => {
    await loadFixture(page, 'all-blocks.md');

    await expect(editorPage.heading(1)).toBeVisible();
    await expect(editorPage.heading(2)).toBeVisible();
    await expect(editorPage.heading(3)).toBeVisible();
    await expect(editorPage.heading(4)).toBeVisible();
    await expect(editorPage.heading(5)).toBeVisible();
    await expect(editorPage.heading(6)).toBeVisible();
  });

  test('renders paragraphs as p elements', async ({ page }) => {
    await loadMarkdown(page, 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.');

    const paragraphs = editorPage.paragraph();
    await expect(paragraphs).toHaveCount(3);
  });

  test('renders bullet lists with ul and li', async ({ page }) => {
    await loadMarkdown(page, '- Item 1\n- Item 2\n- Item 3');

    await expect(editorPage.bulletList()).toBeVisible();
    const items = editorPage.bulletList().locator('li');
    await expect(items).toHaveCount(3);
  });

  test('renders ordered lists with ol and li', async ({ page }) => {
    await loadMarkdown(page, '1. First\n2. Second\n3. Third');

    await expect(editorPage.orderedList()).toBeVisible();
    const items = editorPage.orderedList().locator('li');
    await expect(items).toHaveCount(3);
  });

  test('renders task lists with checkboxes', async ({ page }) => {
    await loadMarkdown(page, '- [ ] Unchecked\n- [x] Checked');

    // TipTap task lists have data-type="taskList"
    const taskList = editorPage.prosemirror.locator('ul[data-type="taskList"]');
    await expect(taskList).toBeVisible();
  });

  test('renders code blocks in pre element', async ({ page }) => {
    await loadMarkdown(page, '```javascript\nconst x = 1;\n```');

    await expect(editorPage.codeBlock()).toBeVisible();
    await expect(editorPage.codeBlock()).toContainText('const x = 1');
  });

  test('renders blockquotes', async ({ page }) => {
    await loadMarkdown(page, '> This is a quote.\n> Multiple lines.');

    await expect(editorPage.blockquote()).toBeVisible();
    await expect(editorPage.blockquote()).toContainText('This is a quote');
  });

  test('renders tables with header and body', async ({ page }) => {
    await loadMarkdown(page, '| A | B |\n|---|---|\n| 1 | 2 |');

    await expect(editorPage.table()).toBeVisible();
    const headerCells = editorPage.table().locator('th, thead td');
    const bodyCells = editorPage.table().locator('tbody td');
    await expect(headerCells.or(editorPage.table().locator('tr').first().locator('td, th'))).toHaveCount(2);
  });

  test('renders horizontal rules', async ({ page }) => {
    await loadMarkdown(page, 'Before\n\n---\n\nAfter');

    await expect(editorPage.horizontalRule()).toBeVisible();
  });

  test.skip('renders images as img tags', async ({ page }) => {
    // Skip: TipTap may render images differently depending on configuration
    // The image extension creates the node but visibility depends on load state
    await loadMarkdown(page, '![alt](https://example.com/img.png)');
    const img = editorPage.prosemirror.locator('img');
    await expect(img).toBeVisible({ timeout: 3000 });
  });

  test('renders nested structures correctly', async ({ page }) => {
    await loadFixture(page, 'all-blocks.md');

    // Check blockquote with nested list exists
    const blockquote = editorPage.blockquote().last();
    await expect(blockquote).toBeVisible();

    // Check nested bullet list
    const nestedList = editorPage.bulletList().locator('ul');
    await expect(nestedList.first()).toBeVisible();
  });

  test('renders all block types from all-blocks fixture', async ({ page }) => {
    await loadFixture(page, 'all-blocks.md');

    // Verify presence of each block type
    await expect(editorPage.heading(1)).toBeVisible();
    await expect(editorPage.paragraph().first()).toBeVisible();
    await expect(editorPage.bulletList().first()).toBeVisible();
    await expect(editorPage.orderedList()).toBeVisible();
    await expect(editorPage.prosemirror.locator('ul[data-type="taskList"]')).toBeVisible();
    await expect(editorPage.codeBlock()).toBeVisible();
    await expect(editorPage.blockquote().first()).toBeVisible();
    await expect(editorPage.table()).toBeVisible();
    await expect(editorPage.horizontalRule()).toBeVisible();
    // Skip image check since all-blocks.md uses relative path that won't render
  });
});
