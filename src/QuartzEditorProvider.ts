import * as vscode from 'vscode';

export class QuartzEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'quartz.markdownEditor';

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

    // Send document content to webview when it's ready
    const onWebviewMessage = webviewPanel.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'ready':
          this.sendDocumentToWebview(webviewPanel.webview, document);
          this.sendConfigToWebview(webviewPanel.webview);
          return;
        case 'update':
          this.applyEdits(document, message.content);
          return;
      }
    });

    // Handle external document changes
    const onDocumentChange = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString() && e.contentChanges.length > 0) {
        // Only send if the change didn't come from us
        if (
          e.reason !== vscode.TextDocumentChangeReason.Undo &&
          e.reason !== vscode.TextDocumentChangeReason.Redo
        ) {
          // Debounce external change notifications
        }
      }
    });

    // Handle config changes
    const onConfigChange = vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('quartz.editor') ||
        e.affectsConfiguration('workbench.sideBar.location')
      ) {
        this.sendConfigToWebview(webviewPanel.webview);
      }
    });

    webviewPanel.onDidDispose(() => {
      onWebviewMessage.dispose();
      onDocumentChange.dispose();
      onConfigChange.dispose();
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
    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    const sidebarPosition = workbenchConfig.get<string>('sideBar.location', 'left') as
      | 'left'
      | 'right';
    webview.postMessage({
      type: 'configUpdate',
      config: {
        theme: config.get<string>('theme', 'auto'),
        fontFamily: config.get<string>('fontFamily', 'inherit'),
        fontSize: config.get<number>('fontSize', 16),
        pageLayout: config.get<boolean>('pageLayout', true),
        pageWidth: config.get<number>('pageWidth', 816),
        pageMargin: config.get<number>('pageMargin', 72),
        imageDir: config.get<string>('imageDir', './assets'),
        preserveFormatting: config.get<boolean>('preserveFormatting', true),
        showBlockHandles: config.get<boolean>('showBlockHandles', true),
        sidebarPosition,
      },
    });
  }

  private applyEdits(document: vscode.TextDocument, content: string): void {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), content);
    vscode.workspace.applyEdit(edit);
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
