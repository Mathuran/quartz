import { Page, Locator } from '@playwright/test';

export class EditorPage {
  readonly page: Page;
  readonly editor: Locator;
  readonly prosemirror: Locator;
  private readonly isMac: boolean;

  constructor(page: Page) {
    this.page = page;
    this.editor = page.locator('.quartz-app');
    this.prosemirror = page.locator('.ProseMirror');
    this.isMac = process.platform === 'darwin';
  }

  /** Returns 'Meta' on macOS, 'Control' elsewhere */
  private get mod(): string {
    return this.isMac ? 'Meta' : 'Control';
  }

  async goto() {
    await this.page.goto('/test/e2e/harness.html');
    await this.page.waitForSelector('#root');
  }

  // Block-level queries
  heading(level: number): Locator {
    return this.prosemirror.locator(`h${level}`);
  }

  paragraph(): Locator {
    return this.prosemirror.locator('p');
  }

  codeBlock(): Locator {
    return this.prosemirror.locator('pre');
  }

  bulletList(): Locator {
    return this.prosemirror.locator('ul:not([data-type="taskList"])');
  }

  orderedList(): Locator {
    return this.prosemirror.locator('ol');
  }

  taskList(): Locator {
    return this.prosemirror.locator('ul[data-type="taskList"]');
  }

  taskItem(): Locator {
    return this.prosemirror.locator('li[data-type="taskItem"]');
  }

  blockquote(): Locator {
    return this.prosemirror.locator('blockquote');
  }

  table(): Locator {
    return this.prosemirror.locator('table');
  }

  horizontalRule(): Locator {
    return this.prosemirror.locator('hr');
  }

  image(): Locator {
    return this.prosemirror.locator('img');
  }

  // Inline queries
  bold(): Locator {
    return this.prosemirror.locator('strong');
  }

  italic(): Locator {
    return this.prosemirror.locator('em');
  }

  inlineCode(): Locator {
    return this.prosemirror.locator('code').filter({ hasNot: this.page.locator('pre code') });
  }

  strikethrough(): Locator {
    return this.prosemirror.locator('s, del, strike');
  }

  link(): Locator {
    return this.prosemirror.locator('a');
  }

  // Interactions
  async typeInEditor(text: string): Promise<void> {
    await this.prosemirror.click();
    await this.page.keyboard.type(text);
  }

  async pressKeys(keys: string): Promise<void> {
    await this.page.keyboard.press(keys);
  }

  async triggerSlashCommand(command: string): Promise<void> {
    await this.prosemirror.click();
    await this.page.keyboard.type('/');
    await this.page.waitForSelector('.quartz-slash-menu', { timeout: 2000 });
    await this.page.keyboard.type(command);
    await this.page.waitForTimeout(100); // Wait for filter
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(200); // Wait for command execution
  }

  async selectAllText(): Promise<void> {
    await this.prosemirror.click();
    await this.page.keyboard.press(`${this.mod}+a`);
  }

  async undo(): Promise<void> {
    await this.page.keyboard.press(`${this.mod}+z`);
  }

  async redo(): Promise<void> {
    await this.page.keyboard.press(`${this.mod}+Shift+z`);
  }

  async toggleBold(): Promise<void> {
    await this.page.keyboard.press(`${this.mod}+b`);
  }

  async toggleItalic(): Promise<void> {
    await this.page.keyboard.press(`${this.mod}+i`);
  }

  async toggleStrikethrough(): Promise<void> {
    await this.page.keyboard.press(`${this.mod}+Shift+x`);
  }

  async toggleCode(): Promise<void> {
    await this.page.keyboard.press(`${this.mod}+e`);
  }

  // Get the slash menu
  slashMenu(): Locator {
    return this.page.locator('.quartz-slash-menu');
  }

  // Drag handle
  dragHandle(): Locator {
    return this.page.locator('.drag-handle');
  }
}
