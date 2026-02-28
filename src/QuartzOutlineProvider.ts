import * as vscode from 'vscode';
import { extractHeadingsFromMarkdown, type ExtensionHeadingItem } from './utils/headingExtractor';

export interface OutlineItem {
  heading: ExtensionHeadingItem;
  index: number;
}

export class QuartzOutlineProvider implements vscode.TreeDataProvider<OutlineItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<OutlineItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private headings: ExtensionHeadingItem[] = [];
  private activePanel: vscode.WebviewPanel | undefined;

  updateDocument(document: vscode.TextDocument, panel: vscode.WebviewPanel): void {
    this.headings = extractHeadingsFromMarkdown(document.getText());
    this.activePanel = panel;
    this._onDidChangeTreeData.fire(null);
  }

  clearDocument(): void {
    this.headings = [];
    this.activePanel = undefined;
    this._onDidChangeTreeData.fire(null);
  }

  scrollToHeading(item: OutlineItem): void {
    if (this.activePanel) {
      this.activePanel.webview.postMessage({
        type: 'scrollToHeading',
        index: item.index,
      });
    }
  }

  getActivePanel(): vscode.WebviewPanel | undefined {
    return this.activePanel;
  }

  getTreeItem(element: OutlineItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.heading.text, vscode.TreeItemCollapsibleState.None);
    item.description = `H${element.heading.level}`;
    item.iconPath = new vscode.ThemeIcon('symbol-string');
    item.command = {
      command: 'quartz.scrollToHeading',
      title: 'Scroll to Heading',
      arguments: [element],
    };
    return item;
  }

  getChildren(): OutlineItem[] {
    return this.headings.map((heading, index) => ({ heading, index }));
  }
}
