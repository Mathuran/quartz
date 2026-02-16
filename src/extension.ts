import * as vscode from 'vscode';
import { QuartzEditorProvider } from './QuartzEditorProvider';

export function activate(context: vscode.ExtensionContext) {
  const provider = QuartzEditorProvider.register(context);
  context.subscriptions.push(provider);

  // Register commands for toggling between editors
  context.subscriptions.push(
    vscode.commands.registerCommand('quartz.openWithQuartz', async () => {
      const activeEditor = vscode.window.activeTextEditor;
      const uri = activeEditor?.document.uri ?? vscode.window.tabGroups.activeTabGroup.activeTab?.input;

      if (uri && 'uri' in (uri as any)) {
        const fileUri = (uri as any).uri as vscode.Uri;
        if (fileUri.path.endsWith('.md')) {
          await vscode.commands.executeCommand(
            'vscode.openWith',
            fileUri,
            QuartzEditorProvider.viewType
          );
        }
      } else if (activeEditor?.document.fileName.endsWith('.md')) {
        await vscode.commands.executeCommand(
          'vscode.openWith',
          activeEditor.document.uri,
          QuartzEditorProvider.viewType
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('quartz.openWithTextEditor', async () => {
      const activeEditor = vscode.window.activeTextEditor;
      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;

      let uri: vscode.Uri | undefined;

      // Check if we're in a custom editor (Quartz)
      if (activeTab?.input && 'uri' in (activeTab.input as any)) {
        uri = (activeTab.input as any).uri;
      } else if (activeEditor?.document.fileName.endsWith('.md')) {
        uri = activeEditor.document.uri;
      }

      if (uri && uri.path.endsWith('.md')) {
        await vscode.commands.executeCommand(
          'vscode.openWith',
          uri,
          'default'
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('quartz.toggleEditor', async () => {
      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;

      if (!activeTab?.input) return;

      const input = activeTab.input as any;
      const uri: vscode.Uri | undefined = input.uri;

      if (!uri || !uri.path.endsWith('.md')) return;

      // Check if current editor is Quartz (custom editor) or text editor
      const isQuartzEditor = input.viewType === QuartzEditorProvider.viewType;

      if (isQuartzEditor) {
        // Switch to default text editor
        await vscode.commands.executeCommand('vscode.openWith', uri, 'default');
      } else {
        // Switch to Quartz editor
        await vscode.commands.executeCommand('vscode.openWith', uri, QuartzEditorProvider.viewType);
      }
    })
  );
}

export function deactivate() {}
