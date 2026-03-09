import * as vscode from 'vscode';
import { QuartzEditorProvider } from './QuartzEditorProvider';
import { QuartzOutlineProvider, type OutlineItem } from './QuartzOutlineProvider';
import { QuartzDocumentSymbolProvider } from './QuartzDocumentSymbolProvider';

export function activate(context: vscode.ExtensionContext) {
  // Set up outline provider
  const outlineProvider = new QuartzOutlineProvider();
  QuartzEditorProvider.setOutlineProvider(outlineProvider);

  const provider = QuartzEditorProvider.register(context);
  context.subscriptions.push(provider);

  // Register TreeView for document outline
  context.subscriptions.push(
    vscode.window.createTreeView('quartz.outline', {
      treeDataProvider: outlineProvider,
    }),
  );

  // Register DocumentSymbolProvider for VS Code's built-in Outline view
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { language: 'markdown' },
      new QuartzDocumentSymbolProvider(),
    ),
  );

  // Scroll to heading command (used by TreeView click)
  context.subscriptions.push(
    vscode.commands.registerCommand('quartz.scrollToHeading', (item: OutlineItem) => {
      outlineProvider.scrollToHeading(item);
    }),
  );

  // Refresh outline command
  context.subscriptions.push(
    vscode.commands.registerCommand('quartz.refreshOutline', () => {
      // Re-read the active document if there's an active panel
      const panel = QuartzEditorProvider.getActiveWebviewPanel();
      if (panel) {
        // The outline will refresh when the document change event fires
        // For manual refresh, we can trigger it via the active tab's document
        const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
        if (activeTab?.input && typeof activeTab.input === 'object' && 'uri' in activeTab.input) {
          const uri = (activeTab.input as { uri: vscode.Uri }).uri;
          vscode.workspace.openTextDocument(uri).then((doc) => {
            outlineProvider.updateDocument(doc, panel);
          });
        }
      }
    }),
  );

  // View Git Changes command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'quartz.viewGitChanges',
      async (resourceState?: { resourceUri?: vscode.Uri }) => {
        const diffEnabled = vscode.workspace
          .getConfiguration('quartz.diffReview')
          .get<boolean>('enabled', true);
        if (!diffEnabled) {
          vscode.window.showInformationMessage('Diff review is disabled. Enable it in settings.');
          return;
        }

        // When invoked from SCM context menu, resourceState contains the file URI
        const uri = resourceState?.resourceUri;
        if (uri) {
          QuartzEditorProvider.queueDiffForUri(uri);
          await vscode.commands.executeCommand(
            'vscode.openWith',
            uri,
            QuartzEditorProvider.viewType,
          );
        } else {
          await QuartzEditorProvider.requestGitDiffForActivePanel();
        }
      },
    ),
  );

  // Close Diff View command (toggle back to editor)
  context.subscriptions.push(
    vscode.commands.registerCommand('quartz.closeDiffView', async () => {
      await QuartzEditorProvider.requestGitDiffForActivePanel();
    }),
  );

  // Register commands for toggling between editors
  context.subscriptions.push(
    vscode.commands.registerCommand('quartz.openWithQuartz', async () => {
      const activeEditor = vscode.window.activeTextEditor;
      const uri =
        activeEditor?.document.uri ?? vscode.window.tabGroups.activeTabGroup.activeTab?.input;

      if (uri && typeof uri === 'object' && 'uri' in uri) {
        const fileUri = (uri as { uri: vscode.Uri }).uri;
        if (fileUri.path.endsWith('.md')) {
          await vscode.commands.executeCommand(
            'vscode.openWith',
            fileUri,
            QuartzEditorProvider.viewType,
          );
        }
      } else if (activeEditor?.document.fileName.endsWith('.md')) {
        await vscode.commands.executeCommand(
          'vscode.openWith',
          activeEditor.document.uri,
          QuartzEditorProvider.viewType,
        );
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('quartz.openWithTextEditor', async () => {
      const activeEditor = vscode.window.activeTextEditor;
      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;

      let uri: vscode.Uri | undefined;

      // Check if we're in a custom editor (Quartz)
      if (activeTab?.input && typeof activeTab.input === 'object' && 'uri' in activeTab.input) {
        uri = (activeTab.input as { uri: vscode.Uri }).uri;
      } else if (activeEditor?.document.fileName.endsWith('.md')) {
        uri = activeEditor.document.uri;
      }

      if (uri && uri.path.endsWith('.md')) {
        await vscode.commands.executeCommand('vscode.openWith', uri, 'default');
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('quartz.toggleEditor', async () => {
      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;

      if (!activeTab?.input) return;

      const input = activeTab.input;

      if (!input || typeof input !== 'object' || !('uri' in input)) return;

      const uri = (input as { uri: vscode.Uri }).uri;

      if (!uri || !uri.path.endsWith('.md')) return;

      // Check if current editor is Quartz (custom editor) or text editor
      const isQuartzEditor =
        'viewType' in input &&
        (input as { viewType: string }).viewType === QuartzEditorProvider.viewType;

      if (isQuartzEditor) {
        // Switch to default text editor
        await vscode.commands.executeCommand('vscode.openWith', uri, 'default');
      } else {
        // Switch to Quartz editor
        await vscode.commands.executeCommand('vscode.openWith', uri, QuartzEditorProvider.viewType);
      }
    }),
  );
}

export function deactivate() {}
