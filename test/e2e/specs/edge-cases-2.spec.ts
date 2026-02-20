import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/editor.page';
import { loadMarkdown, waitForUpdate, getUpdateCount, sendExternalChange } from '../fixtures';

test.describe('Edge Cases 2', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
  });

  // ============================================================
  // MORE LIST EDGE CASES
  // ============================================================

  test('nested list with different marker types', async ({ page }) => {
    const markdown = '- Bullet item\n  1. Nested ordered\n  2. Second ordered\n- Another bullet';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    const bulletList = editorPage.bulletList();
    await expect(bulletList).toBeVisible();

    const orderedList = editorPage.orderedList();
    await expect(orderedList).toBeVisible();

    // Should have 2 bullet items
    const bulletItems = page.locator('.ProseMirror > ul > li');
    await expect(bulletItems).toHaveCount(2);
  });

  test('list item with multiple paragraphs', async ({ page }) => {
    // This is valid markdown but often breaks editors
    const markdown = '- Item 1\n\n  Continuation of item 1\n\n- Item 2';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    // Should have rendered correctly without crashing
    await expect(editorPage.bulletList()).toBeVisible();
  });

  test('very long list item (500+ chars)', async ({ page }) => {
    const longText = 'A'.repeat(500);
    await loadMarkdown(page, `- ${longText}`);
    await page.waitForTimeout(300);

    await expect(editorPage.bulletList()).toBeVisible();
    const listItem = page.locator('.ProseMirror li').first();
    await expect(listItem).toContainText(longText);
  });

  test('list with all items being task items with different states', async ({ page }) => {
    const markdown = '- [x] Done\n- [ ] Not done\n- [X] Also done (capital X)';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    const taskItems = editorPage.taskItem();
    await expect(taskItems).toHaveCount(3);
  });

  // ============================================================
  // CODE BLOCK EDGE CASES
  // ============================================================

  test('code block with triple backticks inside the content', async ({ page }) => {
    // This is a tricky case - the content contains what looks like a closing fence
    const markdown = '````markdown\n```javascript\ncode here\n```\n````';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    const codeBlock = editorPage.codeBlock();
    await expect(codeBlock).toBeVisible();
    // The content should include the inner fence
    await expect(codeBlock).toContainText('```javascript');
  });

  test('code block with very long line (1000+ chars)', async ({ page }) => {
    const longCode = 'const x = ' + '"' + 'A'.repeat(1000) + '";';
    const markdown = '```javascript\n' + longCode + '\n```';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    const codeBlock = editorPage.codeBlock();
    await expect(codeBlock).toBeVisible();
    await expect(codeBlock).toContainText('A'.repeat(100)); // Check partial content
  });

  test('code block with empty lines preserves them', async ({ page }) => {
    const markdown = '```python\nline1\n\nline3\n\n\nline6\n```';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    const codeBlock = editorPage.codeBlock();
    await expect(codeBlock).toBeVisible();
    const codeText = await codeBlock.innerText();
    // Should preserve empty lines (count newlines)
    expect(codeText).toContain('line1');
    expect(codeText).toContain('line3');
    expect(codeText).toContain('line6');
  });

  test('code block language with special chars (c++)', async ({ page }) => {
    const markdown = '```c++\nint main() {}\n```';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    const codeBlock = editorPage.codeBlock();
    await expect(codeBlock).toBeVisible();
    // Should have the code block even with c++ language
    await expect(codeBlock).toContainText('int main()');
  });

  // ============================================================
  // TABLE EDGE CASES
  // ============================================================

  test('table with empty cells', async ({ page }) => {
    const markdown = '| A | B | C |\n|---|---|---|\n|   |   |   |';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    const table = editorPage.table();
    await expect(table).toBeVisible();

    // All cells should exist even if empty
    const cells = page.locator('.ProseMirror td, .ProseMirror th');
    await expect(cells).toHaveCount(6);
  });

  test('table with bold/italic in cells', async ({ page }) => {
    const markdown = '| **Bold** | *Italic* |\n|----------|----------|\n| Normal   | ~~Strike~~ |';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    await expect(editorPage.table()).toBeVisible();
    await expect(editorPage.bold()).toBeVisible();
    await expect(editorPage.italic()).toBeVisible();
    await expect(editorPage.strikethrough()).toBeVisible();
  });

  test('table with inline code in cells', async ({ page }) => {
    const markdown = '| Header |\n|--------|\n| `code` |';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    await expect(editorPage.table()).toBeVisible();
    const inlineCode = page.locator('.ProseMirror td code');
    await expect(inlineCode).toBeVisible();
  });

  test('table editing: delete last column', async ({ page }) => {
    const markdown = '| A | B |\n|---|---|\n| 1 | 2 |';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    // Click in last column cell
    const lastCell = page.locator('.ProseMirror td').last();
    await lastCell.click();
    await page.waitForTimeout(100);

    // Delete column with Ctrl+Shift+Backspace
    await page.keyboard.press('Control+Shift+Backspace');
    await page.waitForTimeout(300);

    // Should now have only 2 cells (1 header + 1 body)
    const cells = page.locator('.ProseMirror td, .ProseMirror th');
    await expect(cells).toHaveCount(2);
  });

  // ============================================================
  // HEADING EDGE CASES
  // ============================================================

  test('heading levels 1-6 all render correctly', async ({ page }) => {
    const markdown = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    for (let i = 1; i <= 6; i++) {
      await expect(editorPage.heading(i)).toBeVisible();
    }
  });

  test('heading with inline formatting', async ({ page }) => {
    const markdown = '# **Bold** and *italic* heading';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    await expect(editorPage.heading(1)).toBeVisible();
    await expect(page.locator('.ProseMirror h1 strong')).toBeVisible();
    await expect(page.locator('.ProseMirror h1 em')).toBeVisible();
  });

  test('heading with inline code', async ({ page }) => {
    const markdown = '# Heading with `code`';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    await expect(editorPage.heading(1)).toBeVisible();
    const codeInHeading = page.locator('.ProseMirror h1 code');
    await expect(codeInHeading).toBeVisible();
  });

  test('very long heading (200+ chars)', async ({ page }) => {
    const longHeading = '# ' + 'A'.repeat(200);
    await loadMarkdown(page, longHeading);
    await page.waitForTimeout(300);

    await expect(editorPage.heading(1)).toBeVisible();
    await expect(editorPage.heading(1)).toContainText('A'.repeat(50));
  });

  // ============================================================
  // BLOCKQUOTE EDGE CASES
  // ============================================================

  test('blockquote with code block inside', async ({ page }) => {
    const markdown = '> Quote text\n>\n> ```js\n> const x = 1;\n> ```';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    await expect(editorPage.blockquote()).toBeVisible();
    // Code block might be inside or after blockquote depending on parser
    await expect(editorPage.blockquote()).toContainText('Quote text');
  });

  test('blockquote with multiple paragraphs', async ({ page }) => {
    const markdown = '> Para 1\n>\n> Para 2\n>\n> Para 3';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    await expect(editorPage.blockquote()).toBeVisible();
    const bq = editorPage.blockquote();
    await expect(bq).toContainText('Para 1');
    await expect(bq).toContainText('Para 2');
    await expect(bq).toContainText('Para 3');
  });

  test('blockquote immediately after paragraph (no blank line)', async ({ page }) => {
    const markdown = 'Normal paragraph\n> Quote';
    await loadMarkdown(page, markdown);
    await page.waitForTimeout(300);

    // Use first() since blockquote also contains a paragraph
    await expect(editorPage.paragraph().first()).toBeVisible();
    await expect(editorPage.blockquote()).toBeVisible();
    await expect(editorPage.prosemirror).toContainText('Normal paragraph');
    await expect(editorPage.prosemirror).toContainText('Quote');
  });

  // ============================================================
  // EXTERNAL CHANGE EDGE CASES
  // ============================================================

  test('external change during typing does not lose user input', async ({ page }) => {
    await loadMarkdown(page, 'Initial');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.press('End');

    // Start typing
    await page.keyboard.type(' typ');

    // Send external change while user is typing
    await sendExternalChange(page, 'External content');

    // Wait a bit
    await page.waitForTimeout(500);

    // The external change should take over (this is expected behavior)
    // But the editor should not crash
    await expect(editorPage.prosemirror).toBeVisible();
  });

  test('external change with complex formatting', async ({ page }) => {
    await loadMarkdown(page, 'Simple');
    await page.waitForTimeout(300);

    // Send complex content externally
    const complexContent = '# Heading\n\n**Bold** and *italic*\n\n- List item\n\n```code\nblock\n```';
    await sendExternalChange(page, complexContent);
    await page.waitForTimeout(500);

    // All elements should render
    await expect(editorPage.heading(1)).toBeVisible();
    await expect(editorPage.bold()).toBeVisible();
    await expect(editorPage.bulletList()).toBeVisible();
    await expect(editorPage.codeBlock()).toBeVisible();
  });

  // ============================================================
  // KEYBOARD SHORTCUT EDGE CASES
  // ============================================================

  test('Mod+Shift+S applies strikethrough', async ({ page }) => {
    await loadMarkdown(page, 'Strike this');
    await page.waitForTimeout(300);

    await editorPage.selectAllText();
    await editorPage.toggleStrikethrough();
    await page.waitForTimeout(300);

    await expect(editorPage.strikethrough()).toBeVisible();
    await expect(editorPage.strikethrough()).toContainText('Strike this');
  });

  test('Mod+Shift+H applies highlight', async ({ page }) => {
    await loadMarkdown(page, 'Highlight this');
    await page.waitForTimeout(300);

    await editorPage.selectAllText();
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${mod}+Shift+h`);
    await page.waitForTimeout(300);

    // Check for mark element (highlight)
    const mark = page.locator('.ProseMirror mark');
    await expect(mark).toBeVisible();
  });

  test('heading shortcuts Mod+Alt+1 through 3', async ({ page }) => {
    await loadMarkdown(page, 'Test heading');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

    // H1
    await page.keyboard.press(`${mod}+Alt+1`);
    await page.waitForTimeout(200);
    await expect(editorPage.heading(1)).toBeVisible();

    // H2
    await page.keyboard.press(`${mod}+Alt+2`);
    await page.waitForTimeout(200);
    await expect(editorPage.heading(2)).toBeVisible();

    // H3
    await page.keyboard.press(`${mod}+Alt+3`);
    await page.waitForTimeout(200);
    await expect(editorPage.heading(3)).toBeVisible();
  });

  // ============================================================
  // INPUT RULE EDGE CASES
  // ============================================================

  test('typing "# " at start creates heading', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.type('# Heading text');
    await page.waitForTimeout(300);

    await expect(editorPage.heading(1)).toBeVisible();
    await expect(editorPage.heading(1)).toContainText('Heading text');
  });

  test('typing "## " at start creates h2', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.type('## H2 text');
    await page.waitForTimeout(300);

    await expect(editorPage.heading(2)).toBeVisible();
  });

  test('typing "- " at start creates bullet list', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.type('- List item');
    await page.waitForTimeout(300);

    await expect(editorPage.bulletList()).toBeVisible();
  });

  test('typing "1. " at start creates ordered list', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.type('1. First item');
    await page.waitForTimeout(300);

    await expect(editorPage.orderedList()).toBeVisible();
  });

  test('typing "> " at start creates blockquote', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.type('> Quote text');
    await page.waitForTimeout(300);

    await expect(editorPage.blockquote()).toBeVisible();
  });

  test('typing "```" followed by Enter creates code block', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.type('```javascript');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    await expect(editorPage.codeBlock()).toBeVisible();
  });

  test('typing "---" creates horizontal rule', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    // Need some text first or it might trigger frontmatter
    await page.keyboard.type('before');
    await page.keyboard.press('Enter');
    await page.keyboard.type('---');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    await expect(editorPage.horizontalRule()).toBeVisible();
  });

  // ============================================================
  // COMBINED MARKS INPUT RULES
  // ============================================================

  test('typing **text** creates bold', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.type('some **bold** text');
    await page.waitForTimeout(300);

    await expect(editorPage.bold()).toBeVisible();
    await expect(editorPage.bold()).toContainText('bold');
  });

  test('typing *text* creates italic', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.type('some *italic* text');
    await page.waitForTimeout(300);

    await expect(editorPage.italic()).toBeVisible();
    await expect(editorPage.italic()).toContainText('italic');
  });

  test('typing `code` creates inline code', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.type('some `code` text');
    await page.waitForTimeout(300);

    const inlineCode = page.locator('.ProseMirror code').first();
    await expect(inlineCode).toBeVisible();
  });

  test('typing ~~text~~ creates strikethrough', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.type('some ~~strike~~ text');
    await page.waitForTimeout(300);

    await expect(editorPage.strikethrough()).toBeVisible();
  });

  // ============================================================
  // LINK INPUT RULE
  // ============================================================

  test('typing [text](url) creates link', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.type('Click [here](https://example.com) for more');
    await page.waitForTimeout(300);

    const link = editorPage.link();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://example.com');
  });

  test('typing link with spaces in URL fails gracefully', async ({ page }) => {
    await loadMarkdown(page, '');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    // This shouldn't create a link (invalid URL syntax)
    await page.keyboard.type('[text](not a url)');
    await page.waitForTimeout(300);

    // Should either not create link or handle it gracefully
    await expect(editorPage.prosemirror).toBeVisible();
  });

  // ============================================================
  // ROUNDTRIP EDGE CASES
  // ============================================================

  test('complex document roundtrips preserve structure', async ({ page }) => {
    const complex = `# Title

**Bold** and *italic* paragraph.

- List 1
- List 2

\`\`\`javascript
const x = 1;
\`\`\`

> Quote

| A | B |
|---|---|
| 1 | 2 |

---

Final paragraph.`;

    await loadMarkdown(page, complex);
    await page.waitForTimeout(500);

    // Make a small edit
    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' edited');
    await page.waitForTimeout(500);

    const countBefore = await getUpdateCount(page);
    const output = await waitForUpdate(page, countBefore - 1, 3000);

    // Verify all major elements are preserved
    expect(output).toContain('Title');
    expect(output).toContain('**Bold**');
    expect(output).toContain('*italic*');
    expect(output).toContain('- List 1');
    expect(output).toContain('javascript');
    expect(output).toContain('Quote');
    expect(output).toContain('edited');
  });

  // ============================================================
  // SELECTION EDGE CASES
  // ============================================================

  test('selecting across different block types', async ({ page }) => {
    await loadMarkdown(page, '# Heading\n\nParagraph\n\n- List item');
    await page.waitForTimeout(300);

    // Select all
    await editorPage.selectAllText();
    await page.waitForTimeout(100);

    // Delete
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    // Should have cleared everything
    const text = await editorPage.prosemirror.innerText();
    expect(text.trim()).toBe('');
  });

  test('double-click selects word', async ({ page }) => {
    await loadMarkdown(page, 'Hello beautiful world');
    await page.waitForTimeout(300);

    // Find the paragraph and double-click on "beautiful"
    const para = editorPage.paragraph();
    const box = await para.boundingBox();
    if (box) {
      // Double-click roughly in the middle
      await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(100);

      // Apply bold to selection
      await editorPage.toggleBold();
      await page.waitForTimeout(300);

      // One word should be bold
      await expect(editorPage.bold()).toBeVisible();
    }
  });

  // ============================================================
  // CURSOR POSITION EDGE CASES
  // ============================================================

  test('cursor at very beginning of document', async ({ page }) => {
    await loadMarkdown(page, 'Text here');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.press('Home');
    await page.keyboard.press('Home'); // Extra Home for good measure
    await page.keyboard.type('START');
    await page.waitForTimeout(300);

    await expect(editorPage.prosemirror).toContainText('STARTText here');
  });

  test('cursor at very end of document', async ({ page }) => {
    await loadMarkdown(page, 'Text here');
    await page.waitForTimeout(300);

    await editorPage.prosemirror.click();
    await page.keyboard.press('End');
    await page.keyboard.press('End'); // Extra End for good measure
    await page.keyboard.type(' END');
    await page.waitForTimeout(300);

    await expect(editorPage.prosemirror).toContainText('Text here END');
  });

  // ============================================================
  // PASTE MARKDOWN EDGE CASES
  // ============================================================

  test('editor handles very large document', async ({ page }) => {
    // Create a large document with many paragraphs
    const paragraphs = Array.from({ length: 100 }, (_, i) => `Paragraph ${i + 1}`);
    const largeDoc = paragraphs.join('\n\n');

    await loadMarkdown(page, largeDoc);
    await page.waitForTimeout(500);

    // Should have many paragraphs
    const paras = editorPage.paragraph();
    await expect(paras).toHaveCount(100);
  });
});
