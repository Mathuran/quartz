import * as vscode from 'vscode';
import type { QuartzOutlineProvider } from './QuartzOutlineProvider';

export class QuartzEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'quartz.markdownEditor';

  private static outlineProvider: QuartzOutlineProvider | undefined;
  private static activeWebviewPanel: vscode.WebviewPanel | undefined;
  private static pendingDiffUris = new Set<string>();

  public static setOutlineProvider(provider: QuartzOutlineProvider): void {
    QuartzEditorProvider.outlineProvider = provider;
  }

  public static getActiveWebviewPanel(): vscode.WebviewPanel | undefined {
    return QuartzEditorProvider.activeWebviewPanel;
  }

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new QuartzEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(QuartzEditorProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: false,
    });
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')],
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Track active panel and notify outline provider
    const docKey = document.uri.toString();
    QuartzEditorProvider.activeWebviewPanel = webviewPanel;
    if (QuartzEditorProvider.outlineProvider) {
      QuartzEditorProvider.outlineProvider.updateDocument(document, webviewPanel);
    }

    // Update active panel when this panel gains focus
    webviewPanel.onDidChangeViewState((e) => {
      if (e.webviewPanel.active) {
        QuartzEditorProvider.activeWebviewPanel = webviewPanel;
      }
    });

    // Change origin guard: tracks whether a document change originated from the
    // webview (our own edit) so that we don't echo it back as an external change.
    let isApplyingWebviewEdit = false;

    // Debounce timer for external change notifications
    let externalChangeTimeout: ReturnType<typeof setTimeout> | undefined;

    function sendExternalChange() {
      if (externalChangeTimeout) clearTimeout(externalChangeTimeout);
      externalChangeTimeout = setTimeout(() => {
        const diffReviewEnabled = vscode.workspace
          .getConfiguration('quartz.diffReview')
          .get<boolean>('enabled', true);

        if (diffReviewEnabled) {
          webviewPanel.webview.postMessage({
            type: 'externalChangeAvailable',
            content: document.getText(),
          });
        } else {
          webviewPanel.webview.postMessage({
            type: 'externalChange',
            content: document.getText(),
          });
        }
      }, 300);
    }

    // Send document content to webview when it's ready
    const onWebviewMessage = webviewPanel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'ready':
          this.sendDocumentToWebview(webviewPanel.webview, document);
          this.sendConfigToWebview(webviewPanel.webview);
          // If this URI was queued for diff (e.g. from SCM context menu), trigger it now
          if (QuartzEditorProvider.pendingDiffUris.has(docKey)) {
            QuartzEditorProvider.pendingDiffUris.delete(docKey);
            this.openGitDiff(webviewPanel.webview, document);
          }
          return;
        case 'update':
          isApplyingWebviewEdit = true;
          await this.applyEdits(document, message.content);
          isApplyingWebviewEdit = false;
          return;
        case 'requestGitDiff':
          await this.openGitDiff(webviewPanel.webview, document);
          return;
        case 'diffNoChanges':
          vscode.window.showInformationMessage('No changes compared to HEAD.');
          return;
        case 'diffViewOpened':
          vscode.commands.executeCommand('setContext', 'quartz.diffViewActive', true);
          return;
        case 'diffViewClosed':
          vscode.commands.executeCommand('setContext', 'quartz.diffViewActive', false);
          return;
      }
    });

    // Handle external document changes
    const onDocumentChange = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      if (e.contentChanges.length === 0) return;
      if (isApplyingWebviewEdit) return; // Skip our own edits

      // Debounce and send external change to the webview
      sendExternalChange();

      // Refresh outline with latest content
      if (QuartzEditorProvider.outlineProvider) {
        QuartzEditorProvider.outlineProvider.updateDocument(e.document, webviewPanel);
      }
    });

    // Handle config changes
    const onConfigChange = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('quartz.editor')) {
        this.sendConfigToWebview(webviewPanel.webview);
      }
    });

    webviewPanel.onDidDispose(() => {
      if (externalChangeTimeout) clearTimeout(externalChangeTimeout);
      onWebviewMessage.dispose();
      onDocumentChange.dispose();
      onConfigChange.dispose();

      if (QuartzEditorProvider.activeWebviewPanel === webviewPanel) {
        QuartzEditorProvider.activeWebviewPanel = undefined;
      }
      if (QuartzEditorProvider.outlineProvider) {
        QuartzEditorProvider.outlineProvider.clearDocument();
      }
    });
  }

  private sendDocumentToWebview(webview: vscode.Webview, document: vscode.TextDocument): void {
    webview.postMessage({
      type: 'loadDocument',
      content: document.getText(),
      fileName: document.fileName,
    });
  }

  private sendConfigToWebview(webview: vscode.Webview): void {
    const config = vscode.workspace.getConfiguration('quartz.editor');
    webview.postMessage({
      type: 'configUpdate',
      config: {
        theme: config.get<string>('theme', 'auto'),
        fontFamily: config.get<string>('fontFamily', 'inherit'),
        fontSize: config.get<number>('fontSize', 16),
        pageLayout: config.get<boolean>('pageLayout', true),
        pageMargin: config.get<number>('pageMargin', 72),
        imageDir: config.get<string>('imageDir', './assets'),
        preserveFormatting: config.get<boolean>('preserveFormatting', true),
        showBlockHandles: config.get<boolean>('showBlockHandles', true),
      },
    });
  }

  /**
   * Queue a URI so that when its webview sends `ready`, the diff opens automatically.
   * Called from the SCM context menu before opening the file with `vscode.openWith`.
   */
  public static queueDiffForUri(uri: vscode.Uri): void {
    QuartzEditorProvider.pendingDiffUris.add(uri.toString());
  }

  /**
   * Request the active webview to open a git diff view.
   * Called from the `quartz.viewGitChanges` command.
   */
  public static async requestGitDiffForActivePanel(): Promise<void> {
    const panel = QuartzEditorProvider.activeWebviewPanel;
    if (!panel) {
      vscode.window.showWarningMessage('No active Quartz editor.');
      return;
    }
    panel.webview.postMessage({ type: 'triggerGitDiff' });
  }

  private async openGitDiff(webview: vscode.Webview, document: vscode.TextDocument): Promise<void> {
    try {
      const gitExtension = vscode.extensions.getExtension('vscode.git');
      if (!gitExtension) {
        vscode.window.showWarningMessage('Git extension is not available.');
        return;
      }

      const git = gitExtension.isActive
        ? gitExtension.exports.getAPI(1)
        : (await gitExtension.activate()).getAPI(1);
      const repo = git.getRepository(document.uri);
      if (!repo) {
        vscode.window.showWarningMessage('This file is not in a git repository.');
        return;
      }

      // Get the file path relative to the repo root
      const repoRoot = repo.rootUri.fsPath;
      const filePath = document.uri.fsPath;
      const relativePath = filePath.startsWith(repoRoot)
        ? filePath.slice(repoRoot.length + 1)
        : filePath;

      let oldContent: string;
      try {
        oldContent = await repo.show('HEAD', relativePath);
      } catch {
        // File doesn't exist at HEAD (new file)
        oldContent = '';
      }

      const newContent = document.getText();

      webview.postMessage({
        type: 'openDiffView',
        oldContent,
        newContent,
        sourceLabel: 'vs HEAD',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`Failed to get git diff: ${message}`);
    }
  }

  private async applyEdits(document: vscode.TextDocument, content: string): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), content);
    await vscode.workspace.applyEdit(edit);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'index.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'index.css'),
    );
    const nonce = getNonce();

    // CSP: script-src needs both the nonce (for the inline module script) and the
    // webview source (for dynamically imported ESM chunks produced by esbuild splitting).
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource};">
  <link href="${styleUri}" rel="stylesheet">
  <title>Quartz Editor</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
