import * as crypto from 'crypto';
import * as path from 'path';
import * as vscode from 'vscode';
import type { QuartzOutlineProvider } from './QuartzOutlineProvider';

export class QuartzEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'quartz.markdownEditor';

  private static outlineProvider: QuartzOutlineProvider | undefined;
  /** Map of document URI → active webview panel (supports multiple open editors) */
  private static webviewPanels = new Map<string, vscode.WebviewPanel>();
  private static pendingDiffUris = new Set<string>();

  public static setOutlineProvider(provider: QuartzOutlineProvider): void {
    QuartzEditorProvider.outlineProvider = provider;
  }

  public static getActiveWebviewPanel(): vscode.WebviewPanel | undefined {
    // Return the last active panel (for backwards compat with single-panel callers)
    for (const panel of QuartzEditorProvider.webviewPanels.values()) {
      if (panel.active) return panel;
    }
    return undefined;
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
    // Abort setup if cancellation was already requested
    if (_token.isCancellationRequested) return;

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')],
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Track active panel and notify outline provider
    const docKey = document.uri.toString();
    QuartzEditorProvider.webviewPanels.set(docKey, webviewPanel);
    if (QuartzEditorProvider.outlineProvider) {
      QuartzEditorProvider.outlineProvider.updateDocument(document, webviewPanel);
    }

    // Update active panel tracking when this panel gains focus — capture disposable
    const viewStateDisposable = webviewPanel.onDidChangeViewState(() => {
      // Panel map is keyed by URI, so no explicit "active" tracking needed —
      // getActiveWebviewPanel() checks .active on each panel.
    });

    // Version-based edit tracking: instead of a boolean flag (which can miss edits
    // if VS Code coalesces changes), we track the expected version after our edit.
    let expectedVersionAfterEdit: number | null = null;

    // Debounce timer for external change notifications
    let externalChangeTimeout: ReturnType<typeof setTimeout> | undefined;

    function sendExternalChange() {
      if (externalChangeTimeout) clearTimeout(externalChangeTimeout);
      externalChangeTimeout = setTimeout(() => {
        // Guard: document may have been closed while debounce was pending
        if (document.isClosed) return;

        const diffReviewEnabled = vscode.workspace
          .getConfiguration('quartz.diffReview')
          .get<boolean>('enabled', true);

        try {
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
        } catch {
          // Panel may have been disposed while debounce was pending — ignore
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
          expectedVersionAfterEdit = document.version + 1;
          await this.applyEdits(document, message.content);
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
      if (e.document.uri.toString() !== docKey) return;
      if (e.contentChanges.length === 0) return;
      // Skip our own edits by comparing document version
      if (expectedVersionAfterEdit !== null && e.document.version === expectedVersionAfterEdit) {
        expectedVersionAfterEdit = null;
        return;
      }
      expectedVersionAfterEdit = null;

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
      viewStateDisposable.dispose();

      // Clean up panel tracking
      QuartzEditorProvider.webviewPanels.delete(docKey);
      QuartzEditorProvider.pendingDiffUris.delete(docKey);
      vscode.commands.executeCommand('setContext', 'quartz.diffViewActive', false);

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
    const key = uri.toString();
    QuartzEditorProvider.pendingDiffUris.add(key);
    // Auto-cleanup after 10s in case webview never sends 'ready'
    setTimeout(() => QuartzEditorProvider.pendingDiffUris.delete(key), 10_000);
  }

  /**
   * Request the active webview to open a git diff view.
   * Called from the `quartz.viewGitChanges` command.
   */
  public static async requestGitDiffForActivePanel(): Promise<void> {
    const panel = QuartzEditorProvider.getActiveWebviewPanel();
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
      const relativePath = path.relative(repo.rootUri.fsPath, document.uri.fsPath);

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
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length),
    );
    edit.replace(document.uri, fullRange, content);
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
    // img-src includes https: so that external images referenced in markdown (e.g. ![alt](https://...))
    // can load in the editor preview. This is an intentional trade-off for usability.
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource};">
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
  return crypto.randomBytes(16).toString('hex');
}
