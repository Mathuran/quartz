import * as vscode from 'vscode';
import { QuartzEditorProvider } from './QuartzEditorProvider';
import { QuartzOutlineProvider, type OutlineItem } from './QuartzOutlineProvider';
import { QuartzDocumentSymbolProvider } from './QuartzDocumentSymbolProvider';

/**
 * Safely extract a vscode.Uri from a tab input object.
 * Tab inputs are untyped at runtime; we check for a `uri` property that
 * looks like a real vscode.Uri (has a `scheme` string) rather than using
 * an unsafe type assertion.
 */
function getUriFromTabInput(input: unknown): vscode.Uri | undefined {
  if (input && typeof input === 'object' && 'uri' in input) {
    const candidate = (input as Record<string, unknown>).uri;
    if (candidate && typeof candidate === 'object' && 'scheme' in candidate) {
      return candidate as vscode.Uri;
    }
  }
  return undefined;
}

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
        const tabUri = getUriFromTabInput(activeTab?.input);
        if (tabUri) {
          vscode.workspace.openTextDocument(tabUri).then(
            (doc) => {
              outlineProvider.updateDocument(doc, panel);
            },
            (err) => {
              const msg = err instanceof Error ? err.message : String(err);
              vscode.window.showWarningMessage(`Failed to refresh outline: ${msg}`);
            },
          );
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

  // Close Diff View command — intentionally calls the same function as viewGitChanges.
  // The webview handles the toggle logic: if the diff view is open it closes it,
  // if it's closed it opens it. This command exists as a separate entry point
  // so that keybindings/menus can target "close" semantics specifically.
  context.subscriptions.push(
    vscode.commands.registerCommand('quartz.closeDiffView', async () => {
      await QuartzEditorProvider.requestGitDiffForActivePanel();
    }),
  );

  // Insert Link command (Cmd+K) — VS Code intercepts Cmd+K as a chord prefix,
  // so we register it as a VS Code keybinding and forward to the webview.
  context.subscriptions.push(
    vscode.commands.registerCommand('quartz.insertLink', () => {
      const panel = QuartzEditorProvider.getActiveWebviewPanel();
      if (panel) {
        panel.webview.postMessage({ type: 'insertLink' });
      }
    }),
  );

  // Register commands for toggling between editors
  context.subscriptions.push(
    vscode.commands.registerCommand('quartz.openWithQuartz', async () => {
      const activeEditor = vscode.window.activeTextEditor;
      const tabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
      const fileUri = activeEditor?.document.uri ?? getUriFromTabInput(tabInput);

      if (fileUri && fileUri.path.endsWith('.md')) {
        await vscode.commands.executeCommand(
          'vscode.openWith',
          fileUri,
          QuartzEditorProvider.viewType,
        );
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
      uri = getUriFromTabInput(activeTab?.input);
      if (!uri && activeEditor?.document.fileName.endsWith('.md')) {
        uri = activeEditor.document.uri;
      }

      if (uri && uri.path.endsWith('.md')) {
        await vscode.commands.executeCommand('vscode.openWith', uri, 'default');
      }
    }),
  );

  // Set Quartz as the default editor for .md files (if not already configured)
  ensureDefaultEditorAssociation();

  context.subscriptions.push(
    vscode.commands.registerCommand('quartz.toggleEditor', async () => {
      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;

      if (!activeTab?.input) return;

      const input = activeTab.input;
      const uri = getUriFromTabInput(input);

      if (!uri || !uri.path.endsWith('.md')) return;

      // Check if current editor is Quartz (custom editor) or text editor
      const isQuartzEditor =
        'viewType' in input &&
        (input as { viewType: string }).viewType === QuartzEditorProvider.viewType;

      // Close the current tab first so the new editor opens in the same position,
      // rather than opening a second tab for the same file.
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

      if (isQuartzEditor) {
        // Switch to default text editor
        await vscode.commands.executeCommand('vscode.openWith', uri, 'default');
      } else {
        // Switch to Quartz editor
        await vscode.commands.executeCommand(
          'vscode.openWith',
          uri,
          QuartzEditorProvider.viewType,
        );
      }
    }),
  );
}

/**
 * Set Quartz as the default editor for *.md files so that VS Code's
 * built-in search results open in Quartz instead of the text editor.
 * Only modifies global settings when `quartz.editor.defaultForMarkdown` is enabled
 * and the user hasn't already configured a *.md association.
 */
async function ensureDefaultEditorAssociation(): Promise<void> {
  try {
    const quartzConfig = vscode.workspace.getConfiguration('quartz.editor');
    if (!quartzConfig.get('defaultForMarkdown', false)) return;

    const config = vscode.workspace.getConfiguration('workbench');
    const associations = config.get<Record<string, string>>('editorAssociations') || {};

    // Don't override if user already has a *.md association
    if (associations['*.md']) return;

    await config.update(
      'editorAssociations',
      { ...associations, '*.md': 'quartz.markdownEditor' },
      vscode.ConfigurationTarget.Global,
    );
  } catch {
    // Silently fail — this is a nice-to-have, not critical
  }
}

export function deactivate() {}
