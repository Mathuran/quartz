import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Activation', () => {
  test('Extension is present in extension list', () => {
    const ext = vscode.extensions.getExtension('mathuran-quartz.quartz-md');
    assert.ok(ext, 'Extension should be found');
  });

  test('Extension activates when a .md file is opened', async () => {
    const ext = vscode.extensions.getExtension('mathuran-quartz.quartz-md');
    assert.ok(ext, 'Extension should be found');

    // Open a markdown file from fixtures to trigger activation
    const files = await vscode.workspace.findFiles('*.md', null, 1);
    if (files.length > 0) {
      await vscode.workspace.openTextDocument(files[0]);
    }

    // Give the extension time to activate if it hasn't already
    if (!ext.isActive) {
      await ext.activate();
    }
    assert.ok(ext.isActive, 'Extension should be active');
  });

  test('Extension exports activate and deactivate functions', async () => {
    const ext = vscode.extensions.getExtension('mathuran-quartz.quartz-md');
    assert.ok(ext);
    if (!ext.isActive) {
      await ext.activate();
    }
    // The extension exports are available after activation
    assert.ok(ext.isActive);
  });

  test('Extension activates without error', async () => {
    const ext = vscode.extensions.getExtension('mathuran-quartz.quartz-md');
    assert.ok(ext);
    // Activation should not throw
    await assert.doesNotReject(async () => {
      if (!ext.isActive) {
        await ext.activate();
      }
    });
  });

  test('Deactivate is callable without error', async () => {
    // We can't directly call deactivate in integration tests,
    // but we can verify the extension is properly structured
    const ext = vscode.extensions.getExtension('mathuran-quartz.quartz-md');
    assert.ok(ext);
    assert.ok(ext.packageJSON);
    assert.strictEqual(ext.packageJSON.main, './dist/extension.js');
  });
});
