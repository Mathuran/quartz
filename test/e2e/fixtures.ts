import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/** Typed interface for test harness helpers injected on the browser window */
interface E2EHarnessWindow extends Window {
  __loadMarkdown(content: string, fileName: string): void;
  __getUpdate(index?: number): string | null;
  __getUpdateCount(): number;
  __sendExternalChange(content: string): void;
  __updateConfig(config: Record<string, unknown>): void;
}

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const SHARED_FIXTURES_DIR = path.resolve(__dirname, '../integration/fixtures');

/**
 * Load a markdown fixture file into the editor.
 * Looks in test/e2e/fixtures/ first, then falls back to test/integration/fixtures/
 */
export async function loadFixture(page: Page, fixtureName: string): Promise<string> {
  let filePath = path.join(FIXTURES_DIR, fixtureName);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(SHARED_FIXTURES_DIR, fixtureName);
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture not found: ${fixtureName}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  await loadMarkdown(page, content, fixtureName);
  return content;
}

/**
 * Load raw markdown content into the editor.
 */
export async function loadMarkdown(page: Page, content: string, fileName = 'test.md'): Promise<void> {
  await page.evaluate(
    ({ content, fileName }) => (window as unknown as E2EHarnessWindow).__loadMarkdown(content, fileName),
    { content, fileName }
  );
  // Wait for editor to render
  await page.waitForSelector('.ProseMirror[contenteditable="true"]', { timeout: 5000 });
}

/**
 * Get the latest serialized markdown from the editor.
 */
export async function getEditorMarkdown(page: Page): Promise<string | null> {
  return page.evaluate(() => (window as unknown as E2EHarnessWindow).__getUpdate());
}

/**
 * Get the number of updates the editor has sent.
 */
export async function getUpdateCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as E2EHarnessWindow).__getUpdateCount());
}

/**
 * Wait for an update after a given index.
 * If afterIndex is undefined, waits for any update.
 */
export async function waitForUpdate(page: Page, afterIndex?: number, timeout = 2000): Promise<string> {
  const targetIndex = afterIndex ?? -1;
  await page.waitForFunction(
    (idx: number) => ((window as unknown as { __getUpdateCount(): number }).__getUpdateCount()) > idx + 1,
    targetIndex,
    { timeout }
  );
  return page.evaluate(() => (window as unknown as E2EHarnessWindow).__getUpdate());
}

/**
 * Send an external change to the editor (simulates file modified externally).
 */
export async function sendExternalChange(page: Page, content: string): Promise<void> {
  await page.evaluate(
    (content: string) => (window as unknown as E2EHarnessWindow).__sendExternalChange(content),
    content
  );
}

/**
 * Update the editor configuration.
 */
export async function updateConfig(page: Page, config: Record<string, unknown>): Promise<void> {
  await page.evaluate(
    (config: Record<string, unknown>) => (window as unknown as E2EHarnessWindow).__updateConfig(config),
    config
  );
}

export const DEFAULT_TEST_CONFIG = {
  editorTheme: 'clean',
  imageDir: './assets',
  preserveFormatting: true,
  showBlockHandles: true,
};
