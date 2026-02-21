import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Custom Editor', () => {
  // Ensure extension is active before tests
  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('quartz.quartz-markdown-editor');
    if (ext && !ext.isActive) {
      await ext.activate();
    }
  });

  test('Custom editor can open a .md file', async () => {
    const files = await vscode.workspace.findFiles('simple.md', null, 1);
    assert.ok(files.length > 0, 'simple.md fixture should exist');

    // Open with our custom editor
    await vscode.commands.executeCommand('vscode.openWith', files[0], 'quartz.markdownEditor');

    // Give the editor time to open
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify an editor tab is open
    const tabs = vscode.window.tabGroups.all.flatMap(g => g.tabs);
    assert.ok(tabs.length > 0, 'At least one tab should be open');
  });

  test('Opening a .md file creates a webview panel', async () => {
    const files = await vscode.workspace.findFiles('complex.md', null, 1);
    assert.ok(files.length > 0, 'complex.md fixture should exist');

    await vscode.commands.executeCommand('vscode.openWith', files[0], 'quartz.markdownEditor');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check that a tab with the right label exists
    const tabs = vscode.window.tabGroups.all.flatMap(g => g.tabs);
    const mdTab = tabs.find(t => t.label.includes('complex'));
    assert.ok(mdTab, 'A tab for complex.md should exist');
  });

  test('Closing the editor disposes the tab', async () => {
    const files = await vscode.workspace.findFiles('empty.md', null, 1);
    assert.ok(files.length > 0, 'empty.md fixture should exist');

    await vscode.commands.executeCommand('vscode.openWith', files[0], 'quartz.markdownEditor');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Close all editors
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await new Promise(resolve => setTimeout(resolve, 500));

    const tabs = vscode.window.tabGroups.all.flatMap(g => g.tabs);
    const emptyTab = tabs.find(t => t.label.includes('empty'));
    assert.ok(!emptyTab, 'The empty.md tab should be closed');
  });

  test('Custom editor view type is registered', async () => {
    const ext = vscode.extensions.getExtension('quartz.quartz-markdown-editor');
    assert.ok(ext);

    // Check package.json has the custom editor contribution
    const customEditors = ext.packageJSON?.contributes?.customEditors;
    assert.ok(customEditors, 'Custom editors should be declared');
    assert.ok(customEditors.length > 0, 'At least one custom editor');

    const quartzEditor = customEditors.find(
      (e: { viewType: string; selector: { filenamePattern: string }[] }) => e.viewType === 'quartz.markdownEditor'
    );
    assert.ok(quartzEditor, 'quartz.markdownEditor should be registered');
    assert.strictEqual(quartzEditor.selector[0].filenamePattern, '*.md');
  });

  // Cleanup after all tests
  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });
});
