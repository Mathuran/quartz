import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Configuration', () => {
  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('quartz.quartz-markdown-editor');
    if (ext && !ext.isActive) {
      await ext.activate();
    }
  });

  teardown(async () => {
    // Reset any config changes to defaults
    const config = vscode.workspace.getConfiguration('quartz.editor');
    await config.update('fontSize', undefined, vscode.ConfigurationTarget.Global);
    await config.update('pageLayout', undefined, vscode.ConfigurationTarget.Global);
    await config.update('theme', undefined, vscode.ConfigurationTarget.Global);
  });

  test('Default configuration values match package.json', () => {
    const config = vscode.workspace.getConfiguration('quartz.editor');
    assert.strictEqual(config.get('theme'), 'auto');
    assert.strictEqual(config.get('fontSize'), 16);
    assert.strictEqual(config.get('pageLayout'), true);
    assert.strictEqual(config.get('pageWidth'), 816);
    assert.strictEqual(config.get('fontFamily'), 'inherit');
  });

  test('Changing fontSize is accepted without error', async () => {
    const config = vscode.workspace.getConfiguration('quartz.editor');
    await assert.doesNotReject(async () => {
      await config.update('fontSize', 20, vscode.ConfigurationTarget.Global);
    });
    const updated = vscode.workspace.getConfiguration('quartz.editor');
    assert.strictEqual(updated.get('fontSize'), 20);
  });

  test('Changing pageLayout is accepted without error', async () => {
    const config = vscode.workspace.getConfiguration('quartz.editor');
    await assert.doesNotReject(async () => {
      await config.update('pageLayout', false, vscode.ConfigurationTarget.Global);
    });
    const updated = vscode.workspace.getConfiguration('quartz.editor');
    assert.strictEqual(updated.get('pageLayout'), false);
  });

  test('Setting theme to dark is accepted', async () => {
    const config = vscode.workspace.getConfiguration('quartz.editor');
    await assert.doesNotReject(async () => {
      await config.update('theme', 'dark', vscode.ConfigurationTarget.Global);
    });
    const updated = vscode.workspace.getConfiguration('quartz.editor');
    assert.strictEqual(updated.get('theme'), 'dark');
  });

  test('Configuration changes do not require extension reload', async () => {
    const ext = vscode.extensions.getExtension('quartz.quartz-markdown-editor');
    assert.ok(ext);
    assert.ok(ext.isActive, 'Extension should be active before config change');

    const config = vscode.workspace.getConfiguration('quartz.editor');
    await config.update('fontSize', 24, vscode.ConfigurationTarget.Global);

    // Extension should still be active after config change
    assert.ok(ext.isActive, 'Extension should still be active after config change');
  });
});
