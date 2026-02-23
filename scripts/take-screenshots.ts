import { chromium } from 'playwright';
import * as path from 'path';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3100';
const IMAGES_DIR = path.resolve(__dirname, '..', 'images');

interface HarnessWindow extends Window {
  __loadMarkdown(content: string, fileName: string): void;
  __updateConfig(config: Record<string, unknown>): void;
}

const CALLOUT_MD = `# Callouts

> [!note] Taking Notes
> Callouts help organize information visually with distinct colors and icons.

> [!tip] Pro Tip
> Use callouts to highlight important information in your documents.

> [!warning] Be Careful
> This action cannot be undone. Make sure to save your work first.

> [!danger] Critical Alert
> Do not delete the configuration file or the application will crash.

> [!info] Did You Know?
> Quartz supports all 8 Obsidian-style callout types out of the box.

> [!example] Example Usage
> Just type \`> [!type]\` at the start of a blockquote to create a callout.

> [!abstract] Summary
> Callouts support custom titles, collapsible content, and 8 distinct color themes.

> [!quote] Inspiration
> "The best interface is the one you already know." — Anonymous
`;

const FRONTMATTER_MD = `---
title: My Blog Post
date: 2026-02-15
author: Jane Smith
tags: [markdown, editor, quartz]
draft: false
description: A guide to using frontmatter in Quartz
---

# My Blog Post

Frontmatter metadata is displayed in a collapsible banner above the document. Click it to expand and edit the raw YAML.
`;

const TASK_LIST_MD = `# Project Checklist

- [x] Set up development environment
- [x] Design system architecture
- [x] Implement markdown parser
- [x] Build serializer with round-trip fidelity
- [ ] Add image paste support
- [ ] Write end-to-end tests
- [ ] Publish to VS Code Marketplace
- [ ] Write documentation
`;

const CODE_BLOCK_MD = `# Code Blocks

\`\`\`typescript
interface EditorConfig {
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  fontFamily: string;
  pageLayout: boolean;
}

function createEditor(config: EditorConfig): Editor {
  const extensions = [
    StarterKit,
    TaskList,
    CodeBlockLowlight.configure({
      lowlight: createLowlight(common),
    }),
  ];

  return new Editor({
    extensions,
    content: parseMarkdown(initialContent),
    onUpdate: ({ editor }) => {
      const markdown = serializeToMarkdown(editor.getJSON());
      saveToFile(markdown);
    },
  });
}
\`\`\`
`;

const DARK_THEME_MD = `# Dark Theme

Quartz adapts to your preferred color scheme, including a **beautiful dark theme** that's easy on the eyes.

## Features at a Glance

- **Bold text**, *italic text*, and ~~strikethrough~~
- Inline \`code\` renders with syntax highlighting

> [!tip] Theme Options
> Choose between \`auto\`, \`light\`, or \`dark\` in your VS Code settings.

\`\`\`javascript
const theme = vscode.workspace
  .getConfiguration('quartz.editor')
  .get('theme', 'auto');
\`\`\`

- [x] Light theme
- [x] Dark theme
- [x] Auto-detect from VS Code
`;

interface Screenshot {
  name: string;
  markdown: string;
  config?: Record<string, unknown>;
  waitMs?: number;
}

const SCREENSHOTS: Screenshot[] = [
  { name: 'calloutDemo', markdown: CALLOUT_MD },
  { name: 'frontmatterDemo', markdown: FRONTMATTER_MD },
  { name: 'taskListDemo', markdown: TASK_LIST_MD },
  { name: 'codeBlockDemo', markdown: CODE_BLOCK_MD },
  { name: 'darkThemeDemo', markdown: DARK_THEME_MD, config: { theme: 'dark' } },
];

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });

  for (const shot of SCREENSHOTS) {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/test/e2e/harness.html`);
    await page.waitForSelector('.ProseMirror', { timeout: 10_000 });

    // Apply config if needed (before loading content so theme is set)
    if (shot.config) {
      await page.evaluate(
        (config) => (window as unknown as HarnessWindow).__updateConfig(config),
        shot.config,
      );
      await page.waitForTimeout(300);
    }

    // Load markdown content
    await page.evaluate(
      ({ content, fileName }) =>
        (window as unknown as HarnessWindow).__loadMarkdown(content, fileName),
      { content: shot.markdown, fileName: `${shot.name}.md` },
    );

    // Wait for render
    await page.waitForSelector('.ProseMirror[contenteditable="true"]', { timeout: 5_000 });
    await page.waitForTimeout(shot.waitMs ?? 500);

    // Click outside the editor to deselect any cursor
    await page.mouse.click(10, 10);
    await page.waitForTimeout(100);

    // Screenshot the editor content area
    const editor = page.locator('.quartz-app');
    const box = await editor.boundingBox();
    if (!box) {
      console.error(`Could not find .quartz-app for ${shot.name}, skipping`);
      await page.close();
      continue;
    }

    // Get actual content height for tighter clipping
    const contentHeight = await page.evaluate(() => {
      const pm = document.querySelector('.ProseMirror');
      if (!pm) return 0;
      const rect = pm.getBoundingClientRect();
      // Include some padding above (for frontmatter banner) and below
      return rect.bottom + 40;
    });

    const clipHeight = Math.min(contentHeight || box.height, 900);

    const outPath = path.join(IMAGES_DIR, `${shot.name}.png`);
    await page.screenshot({
      path: outPath,
      clip: { x: box.x, y: 0, width: box.width, height: clipHeight },
    });
    console.log(`Saved ${outPath}`);
    await page.close();
  }

  await browser.close();
  console.log('Done! All screenshots saved to images/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
