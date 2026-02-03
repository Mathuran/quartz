import * as vscode from 'vscode';
import { QuartzEditorProvider } from './QuartzEditorProvider';

export function activate(context: vscode.ExtensionContext) {
  const provider = QuartzEditorProvider.register(context);
  context.subscriptions.push(provider);
}

export function deactivate() {}
