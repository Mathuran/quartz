import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Configuration', () => {
  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('mathuran-quartz.quartz-md');
    if (ext && !ext.isActive) {
      await ext.activate();
    }
  });

  teardown(async () => {
    // Reset any config changes to defaults
    const config = vscode.workspace.getConfiguration('quartz.editor');
    await config.update('editorTheme', undefined, vscode.ConfigurationTarget.Global);
    await config.update('imageDir', undefined, vscode.ConfigurationTarget.Global);
    await config.update('preserveFormatting', undefined, vscode.ConfigurationTarget.Global);
    await config.update('showBlockHandles', undefined, vscode.ConfigurationTarget.Global);
  });

  test('Default configuration values match package.json', () => {
    const editorConfig = vscode.workspace.getConfiguration('quartz.editor');
    assert.strictEqual(editorConfig.get('editorTheme'), 'clean');
    assert.strictEqual(editorConfig.get('imageDir'), './assets');
    assert.strictEqual(editorConfig.get('preserveFormatting'), true);
    assert.strictEqual(editorConfig.get('showBlockHandles'), true);
    assert.strictEqual(editorConfig.get('defaultForMarkdown'), false);

    const diffConfig = vscode.workspace.getConfiguration('quartz.diffReview');
    assert.strictEqual(diffConfig.get('enabled'), true);
  });

  test('Changing editorTheme is accepted without error', async () => {
    const config = vscode.workspace.getConfiguration('quartz.editor');
    await assert.doesNotReject(async () => {
      await config.update('editorTheme', 'warm', vscode.ConfigurationTarget.Global);
    });
    const updated = vscode.workspace.getConfiguration('quartz.editor');
    assert.strictEqual(updated.get('editorTheme'), 'warm');
  });

  test('Changing preserveFormatting is accepted without error', async () => {
    const config = vscode.workspace.getConfiguration('quartz.editor');
    await assert.doesNotReject(async () => {
      await config.update('preserveFormatting', false, vscode.ConfigurationTarget.Global);
    });
    const updated = vscode.workspace.getConfiguration('quartz.editor');
    assert.strictEqual(updated.get('preserveFormatting'), false);
  });

  test('Changing imageDir is accepted without error', async () => {
    const config = vscode.workspace.getConfiguration('quartz.editor');
    await assert.doesNotReject(async () => {
      await config.update('imageDir', './images', vscode.ConfigurationTarget.Global);
    });
    const updated = vscode.workspace.getConfiguration('quartz.editor');
    assert.strictEqual(updated.get('imageDir'), './images');
  });

  test('Configuration changes do not require extension reload', async () => {
    const ext = vscode.extensions.getExtension('mathuran-quartz.quartz-md');
    assert.ok(ext);
    assert.ok(ext.isActive, 'Extension should be active before config change');

    const config = vscode.workspace.getConfiguration('quartz.editor');
    await config.update('editorTheme', 'academic', vscode.ConfigurationTarget.Global);

    // Extension should still be active after config change
    assert.ok(ext.isActive, 'Extension should still be active after config change');
  });
});
