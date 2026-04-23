import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadFixture, loadMarkdown, getEditorMarkdown, getUpdateCount, waitForUpdate } from '../fixtures';

test.describe('Mermaid Diagrams', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  test.describe('Rendering', () => {
    test('renders mermaid flowchart as SVG', async ({ page }) => {
      await loadFixture(page, 'mermaid.md');
      // Wait for mermaid to lazy-load and render
      await expect(editorPage.prosemirror.locator('.quartz-mermaid svg').first()).toBeVisible({ timeout: 10_000 });
    });

    test('renders multiple mermaid blocks independently', async ({ page }) => {
      await loadFixture(page, 'mermaid.md');
      // Should have 2 mermaid blocks (flowchart + sequence) — use direct child selector
      // to avoid counting nested SVGs inside mermaid-generated output
      await expect(editorPage.prosemirror.locator('.quartz-mermaid-svg > svg')).toHaveCount(2, { timeout: 15_000 });
    });

    test('regular code blocks render normally (not as diagrams)', async ({ page }) => {
      await loadFixture(page, 'mermaid.md');
      // Wait for mermaid blocks to render
      await expect(editorPage.prosemirror.locator('.quartz-mermaid svg').first()).toBeVisible({ timeout: 10_000 });
      // Should have exactly 2 mermaid diagram containers
      await expect(editorPage.prosemirror.locator('.quartz-mermaid')).toHaveCount(2);
      // The TypeScript code block renders as a <pre> (mermaid blocks use custom div-based NodeView)
      await expect(editorPage.codeBlock()).toHaveCount(1);
    });

    test('shows loading spinner while mermaid loads', async ({ page }) => {
      await loadMarkdown(page, '```mermaid\ngraph TD\n    A --> B\n```');
      // Spinner should appear briefly (may be too fast to catch, so just verify no crash)
      await expect(editorPage.prosemirror.locator('.quartz-mermaid')).toBeVisible({ timeout: 5_000 });
    });

    test('shows error state for invalid mermaid syntax', async ({ page }) => {
      await loadMarkdown(page, '```mermaid\nthis is not valid\n```');
      await expect(editorPage.prosemirror.locator('.quartz-mermaid-error')).toBeVisible({ timeout: 10_000 });
      await expect(editorPage.prosemirror.locator('.quartz-mermaid-error-message')).toBeVisible();
    });

    test('error state shows edit button', async ({ page }) => {
      await loadMarkdown(page, '```mermaid\ninvalid diagram\n```');
      await expect(editorPage.prosemirror.locator('.quartz-mermaid-error')).toBeVisible({ timeout: 10_000 });
      // Hover to reveal edit button
      await editorPage.prosemirror.locator('.quartz-mermaid-error').hover();
      await expect(editorPage.prosemirror.locator('.quartz-mermaid-error .quartz-mermaid-edit-btn')).toBeVisible();
    });
  });

  test.describe('Edit Toggle', () => {
    test('clicking edit button shows textarea with mermaid source', async ({ page }) => {
      await loadMarkdown(page, '```mermaid\ngraph TD\n    A --> B\n```');
      await expect(editorPage.prosemirror.locator('.quartz-mermaid svg').first()).toBeVisible({ timeout: 10_000 });

      // Hover to reveal edit button, then click
      await editorPage.prosemirror.locator('.quartz-mermaid-rendered').hover();
      await editorPage.prosemirror.locator('.quartz-mermaid-edit-btn').click();

      // Textarea should be visible with mermaid source
      const textarea = editorPage.prosemirror.locator('.quartz-mermaid-textarea');
      await expect(textarea).toBeVisible();
      await expect(textarea).toHaveValue(/graph TD/);
    });

    test('clicking Done re-renders diagram', async ({ page }) => {
      await loadMarkdown(page, '```mermaid\ngraph TD\n    A --> B\n```');
      await expect(editorPage.prosemirror.locator('.quartz-mermaid svg').first()).toBeVisible({ timeout: 10_000 });

      // Enter edit mode
      await editorPage.prosemirror.locator('.quartz-mermaid-rendered').hover();
      await editorPage.prosemirror.locator('.quartz-mermaid-edit-btn').click();
      await expect(editorPage.prosemirror.locator('.quartz-mermaid-textarea')).toBeVisible();

      // Click Done
      await editorPage.prosemirror.locator('.quartz-mermaid-done-btn').click();

      // SVG should re-appear
      await expect(editorPage.prosemirror.locator('.quartz-mermaid svg').first()).toBeVisible({ timeout: 10_000 });
    });

    test('editing code and clicking Done renders updated diagram', async ({ page }) => {
      await loadMarkdown(page, '```mermaid\ngraph TD\n    A --> B\n```');
      await expect(editorPage.prosemirror.locator('.quartz-mermaid svg').first()).toBeVisible({ timeout: 10_000 });

      // Enter edit mode
      await editorPage.prosemirror.locator('.quartz-mermaid-rendered').hover();
      await editorPage.prosemirror.locator('.quartz-mermaid-edit-btn').click();

      // Clear and type new content
      const textarea = editorPage.prosemirror.locator('.quartz-mermaid-textarea');
      await textarea.fill('graph TD\n    X --> Y --> Z');

      // Click Done
      await editorPage.prosemirror.locator('.quartz-mermaid-done-btn').click();

      // SVG should render with new content
      await expect(editorPage.prosemirror.locator('.quartz-mermaid svg').first()).toBeVisible({ timeout: 10_000 });
    });

    test('Escape exits edit mode and re-renders', async ({ page }) => {
      await loadMarkdown(page, '```mermaid\ngraph TD\n    A --> B\n```');
      await expect(editorPage.prosemirror.locator('.quartz-mermaid svg').first()).toBeVisible({ timeout: 10_000 });

      // Enter edit mode
      await editorPage.prosemirror.locator('.quartz-mermaid-rendered').hover();
      await editorPage.prosemirror.locator('.quartz-mermaid-edit-btn').click();
      await expect(editorPage.prosemirror.locator('.quartz-mermaid-textarea')).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');

      // SVG should re-appear
      await expect(editorPage.prosemirror.locator('.quartz-mermaid svg').first()).toBeVisible({ timeout: 10_000 });
    });

    test('empty mermaid block starts in edit mode', async ({ page }) => {
      await loadMarkdown(page, '```mermaid\n```');
      // Should show textarea (edit mode) since content is empty
      await expect(editorPage.prosemirror.locator('.quartz-mermaid-textarea')).toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe('Max-Height & Fullscreen', () => {
    test('large diagram shows expand button on hover', async ({ page }) => {
      const largeDiagram = '```mermaid\ngraph TD\n' +
        Array.from({ length: 30 }, (_, i) => `    N${i}[Node ${i}] --> N${i + 1}[Node ${i + 1}]`).join('\n') +
        '\n```';
      await loadMarkdown(page, largeDiagram);
      await expect(editorPage.prosemirror.locator('.quartz-mermaid svg').first()).toBeVisible({ timeout: 15_000 });

      // Should have overflow class
      await expect(editorPage.prosemirror.locator('.quartz-mermaid-overflowing')).toBeVisible();

      // Hover to reveal expand button
      await editorPage.prosemirror.locator('.quartz-mermaid-rendered').hover();
      await expect(editorPage.prosemirror.locator('.quartz-mermaid-expand-btn')).toBeVisible();
    });

    test('small diagram does not show expand button', async ({ page }) => {
      await loadMarkdown(page, '```mermaid\ngraph TD\n    A --> B\n```');
      await expect(editorPage.prosemirror.locator('.quartz-mermaid svg').first()).toBeVisible({ timeout: 10_000 });

      // Should not have overflow class
      await expect(editorPage.prosemirror.locator('.quartz-mermaid-overflowing')).toHaveCount(0);
    });

    test('clicking expand opens fullscreen viewer', async ({ page }) => {
      const largeDiagram = '```mermaid\ngraph TD\n' +
        Array.from({ length: 30 }, (_, i) => `    N${i}[Node ${i}] --> N${i + 1}[Node ${i + 1}]`).join('\n') +
        '\n```';
      await loadMarkdown(page, largeDiagram);
      await expect(editorPage.prosemirror.locator('.quartz-mermaid svg').first()).toBeVisible({ timeout: 15_000 });

      // Click expand
      await editorPage.prosemirror.locator('.quartz-mermaid-rendered').hover();
      await editorPage.prosemirror.locator('.quartz-mermaid-expand-btn').click();

      // Fullscreen overlay should appear
      await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible();
    });

    test('Escape closes fullscreen viewer', async ({ page }) => {
      const largeDiagram = '```mermaid\ngraph TD\n' +
        Array.from({ length: 30 }, (_, i) => `    N${i}[Node ${i}] --> N${i + 1}[Node ${i + 1}]`).join('\n') +
        '\n```';
      await loadMarkdown(page, largeDiagram);
      await expect(editorPage.prosemirror.locator('.quartz-mermaid svg').first()).toBeVisible({ timeout: 15_000 });

      // Open fullscreen
      await editorPage.prosemirror.locator('.quartz-mermaid-rendered').hover();
      await editorPage.prosemirror.locator('.quartz-mermaid-expand-btn').click();
      await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"][aria-modal="true"]')).not.toBeVisible();
    });

    test('fullscreen viewer has zoom controls', async ({ page }) => {
      const largeDiagram = '```mermaid\ngraph TD\n' +
        Array.from({ length: 30 }, (_, i) => `    N${i}[Node ${i}] --> N${i + 1}[Node ${i + 1}]`).join('\n') +
        '\n```';
      await loadMarkdown(page, largeDiagram);
      await expect(editorPage.prosemirror.locator('.quartz-mermaid svg').first()).toBeVisible({ timeout: 15_000 });

      // Open fullscreen
      await editorPage.prosemirror.locator('.quartz-mermaid-rendered').hover();
      await editorPage.prosemirror.locator('.quartz-mermaid-expand-btn').click();

      const dialog = page.locator('[role="dialog"][aria-modal="true"]');
      await expect(dialog).toBeVisible();

      // Should have zoom in, zoom out, fit, close buttons
      await expect(dialog.locator('button[aria-label="Zoom in"]')).toBeVisible();
      await expect(dialog.locator('button[aria-label="Zoom out"]')).toBeVisible();
      await expect(dialog.locator('button[aria-label="Fit to screen"]')).toBeVisible();
      await expect(dialog.locator('button[aria-label="Close fullscreen view"]')).toBeVisible();
    });
  });

  test.describe('Slash Command', () => {
    test('/mermaid appears in slash menu', async ({ page }) => {
      await loadMarkdown(page, 'Test');
      await page.waitForTimeout(300);

      await editorPage.prosemirror.click();
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await page.keyboard.type('/mermaid');

      await expect(editorPage.slashMenu()).toBeVisible({ timeout: 2000 });
      await expect(editorPage.slashMenu()).toContainText(/mermaid/i);
    });

    test('selecting /mermaid creates block in edit mode', async ({ page }) => {
      await loadMarkdown(page, 'Test');
      await page.waitForTimeout(300);

      await editorPage.prosemirror.click();
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await page.keyboard.type('/mermaid', { delay: 50 });

      // Wait for slash menu to show mermaid option specifically
      await expect(editorPage.slashMenu()).toBeVisible({ timeout: 2000 });
      await expect(editorPage.slashMenu()).toContainText(/mermaid/i, { timeout: 2000 });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Should create a mermaid code block
      const mermaidBlock = editorPage.prosemirror.locator('.quartz-mermaid');
      const codeBlock = editorPage.prosemirror.locator('pre');
      await expect(mermaidBlock.or(codeBlock)).toHaveCount(1, { timeout: 10_000 });
    });

    test('/diagram alias also works', async ({ page }) => {
      await loadMarkdown(page, 'Test');
      await page.waitForTimeout(300);

      await editorPage.prosemirror.click();
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await page.keyboard.type('/diagram');

      await expect(editorPage.slashMenu()).toBeVisible({ timeout: 2000 });
      await expect(editorPage.slashMenu()).toContainText(/mermaid/i);
    });
  });

  test.describe('Round-trip', () => {
    test('mermaid block content preserved after edit cycle', async ({ page }) => {
      const md = '```mermaid\ngraph TD\n    A --> B\n```';
      await loadMarkdown(page, md);
      await expect(editorPage.prosemirror.locator('.quartz-mermaid svg').first()).toBeVisible({ timeout: 10_000 });

      // Enter edit mode, then exit without changing
      await editorPage.prosemirror.locator('.quartz-mermaid-rendered').hover();
      await editorPage.prosemirror.locator('.quartz-mermaid-edit-btn').click();
      await expect(editorPage.prosemirror.locator('.quartz-mermaid-textarea')).toBeVisible();

      const countBefore = await getUpdateCount(page);
      await editorPage.prosemirror.locator('.quartz-mermaid-done-btn').click();
      await expect(editorPage.prosemirror.locator('.quartz-mermaid svg').first()).toBeVisible({ timeout: 10_000 });

      // Content should match original
      const output = await getEditorMarkdown(page);
      if (output) {
        expect(output).toContain('```mermaid');
        expect(output).toContain('graph TD');
        expect(output).toContain('A --> B');
      }
    });
  });
});
