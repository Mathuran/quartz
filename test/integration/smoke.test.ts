import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Smoke Test', () => {
  test('VS Code is running', () => {
    assert.ok(vscode.workspace);
  });

  test('Extension is present', () => {
    const ext = vscode.extensions.getExtension('mathuran-quartz.quartz-md');
    assert.ok(ext, 'Extension should be found');
  });
});
