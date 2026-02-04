import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

suite('File Round-Trip', () => {
  let tempDir: string;

  suiteSetup(async () => {
    // Create a temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quartz-test-'));

    // Ensure extension is active
    const ext = vscode.extensions.getExtension('quartz.quartz-markdown-editor');
    if (ext && !ext.isActive) {
      await ext.activate();
    }
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    // Clean up temp files
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  teardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('Opening a simple .md file does not error', async () => {
    const fixturePath = path.join(
      vscode.workspace.workspaceFolders![0].uri.fsPath,
      'simple.md'
    );
    const uri = vscode.Uri.file(fixturePath);

    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand('vscode.openWith', uri, 'quartz.markdownEditor');
      await new Promise(resolve => setTimeout(resolve, 2000));
    });
  });

  test('Opening a file with frontmatter does not error', async () => {
    const fixturePath = path.join(
      vscode.workspace.workspaceFolders![0].uri.fsPath,
      'frontmatter.md'
    );
    const uri = vscode.Uri.file(fixturePath);

    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand('vscode.openWith', uri, 'quartz.markdownEditor');
      await new Promise(resolve => setTimeout(resolve, 2000));
    });
  });

  test('Opening an empty .md file does not error', async () => {
    const fixturePath = path.join(
      vscode.workspace.workspaceFolders![0].uri.fsPath,
      'empty.md'
    );
    const uri = vscode.Uri.file(fixturePath);

    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand('vscode.openWith', uri, 'quartz.markdownEditor');
      await new Promise(resolve => setTimeout(resolve, 2000));
    });
  });

  test('Opening a large file (1000 lines) loads within 10 seconds', async function () {
    this.timeout(15000);

    const fixturePath = path.join(
      vscode.workspace.workspaceFolders![0].uri.fsPath,
      'large.md'
    );
    const uri = vscode.Uri.file(fixturePath);

    const start = Date.now();
    await vscode.commands.executeCommand('vscode.openWith', uri, 'quartz.markdownEditor');
    await new Promise(resolve => setTimeout(resolve, 3000));
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 10000, `Loading took ${elapsed}ms, expected < 10000ms`);
  });

  test('Dirty indicator activates when document is modified', async () => {
    // Copy simple.md to temp dir so we can modify it
    const fixturePath = path.join(
      vscode.workspace.workspaceFolders![0].uri.fsPath,
      'simple.md'
    );
    const tempFile = path.join(tempDir, 'dirty-test.md');
    fs.copyFileSync(fixturePath, tempFile);

    const uri = vscode.Uri.file(tempFile);
    const doc = await vscode.workspace.openTextDocument(uri);

    // Initially not dirty
    assert.ok(!doc.isDirty, 'Document should not be dirty initially');

    // Make an edit
    const edit = new vscode.WorkspaceEdit();
    edit.insert(uri, new vscode.Position(0, 0), 'Modified: ');
    await vscode.workspace.applyEdit(edit);

    // Now should be dirty
    assert.ok(doc.isDirty, 'Document should be dirty after edit');
  });

  test('File content is preserved after open and save cycle', async () => {
    const fixturePath = path.join(
      vscode.workspace.workspaceFolders![0].uri.fsPath,
      'simple.md'
    );
    const tempFile = path.join(tempDir, 'save-test.md');
    fs.copyFileSync(fixturePath, tempFile);
    const originalContent = fs.readFileSync(tempFile, 'utf-8');

    const uri = vscode.Uri.file(tempFile);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);

    // Save without changes
    await doc.save();

    const savedContent = fs.readFileSync(tempFile, 'utf-8');
    assert.strictEqual(savedContent, originalContent, 'Content should be unchanged after save');
  });
});
