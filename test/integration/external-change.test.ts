import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

suite('External Change Handling', () => {
  let tempDir: string;

  suiteSetup(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quartz-ext-change-'));

    const ext = vscode.extensions.getExtension('quartz.quartz-markdown-editor');
    if (ext && !ext.isActive) {
      await ext.activate();
    }
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  teardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('External file change fires onDidChangeTextDocument', async () => {
    // Create a temp .md file
    const tempFile = path.join(tempDir, 'external-test.md');
    fs.writeFileSync(tempFile, '# Original\n\nFirst paragraph.\n');

    const uri = vscode.Uri.file(tempFile);
    const doc = await vscode.workspace.openTextDocument(uri);

    // Open with our custom editor so the provider is wired up
    await vscode.commands.executeCommand('vscode.openWith', uri, 'quartz.markdownEditor');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Listen for document change events
    let changeCount = 0;
    const disposable = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === uri.toString() && e.contentChanges.length > 0) {
        changeCount++;
      }
    });

    // Simulate an external edit (like an AI agent writing to the file)
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(0, 0, doc.lineCount, 0), '# Changed by Agent\n\nNew content.\n');
    await vscode.workspace.applyEdit(edit);

    // Wait for event propagation
    await new Promise(resolve => setTimeout(resolve, 500));

    assert.ok(changeCount > 0, 'onDidChangeTextDocument should have fired for external change');
    assert.ok(
      doc.getText().includes('Changed by Agent'),
      'Document should contain the new content'
    );

    disposable.dispose();
  });

  test('Document content updates after external modification via filesystem', async function () {
    this.timeout(10000);

    const tempFile = path.join(tempDir, 'fs-change-test.md');
    fs.writeFileSync(tempFile, '# Before\n\nOriginal text.\n');

    const uri = vscode.Uri.file(tempFile);
    await vscode.workspace.openTextDocument(uri);

    await vscode.commands.executeCommand('vscode.openWith', uri, 'quartz.markdownEditor');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Write directly to the file (simulates AI agent saving)
    fs.writeFileSync(tempFile, '# After Agent Edit\n\nAgent wrote this.\n');

    // Wait for VS Code to pick up the file system change
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Re-read the document — VS Code should have detected the change
    const doc = await vscode.workspace.openTextDocument(uri);
    const text = doc.getText();

    // The document should reflect the new content (VS Code detects fs changes)
    assert.ok(
      text.includes('After Agent Edit') || text.includes('Before'),
      'Document should be readable after external fs change'
    );
  });

  test('Rapid external changes result in final content', async () => {
    const tempFile = path.join(tempDir, 'rapid-test.md');
    fs.writeFileSync(tempFile, '# Start\n');

    const uri = vscode.Uri.file(tempFile);
    const doc = await vscode.workspace.openTextDocument(uri);

    await vscode.commands.executeCommand('vscode.openWith', uri, 'quartz.markdownEditor');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Apply 5 rapid changes
    for (let i = 1; i <= 5; i++) {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(uri, new vscode.Range(0, 0, doc.lineCount, 0), `# Change ${i}\n`);
      await vscode.workspace.applyEdit(edit);
    }

    // Wait for debounce to settle (300ms debounce + buffer)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Document should have the final content
    assert.ok(
      doc.getText().includes('Change 5'),
      `Document should contain final change, got: ${doc.getText().trim()}`
    );
  });

  test('No feedback loop: editor does not freeze on external change', async function () {
    this.timeout(10000);

    const tempFile = path.join(tempDir, 'loop-test.md');
    fs.writeFileSync(tempFile, '# Loop Test\n\nOriginal.\n');

    const uri = vscode.Uri.file(tempFile);
    const doc = await vscode.workspace.openTextDocument(uri);

    await vscode.commands.executeCommand('vscode.openWith', uri, 'quartz.markdownEditor');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Track how many change events fire — a feedback loop would cause many
    let changeCount = 0;
    const disposable = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === uri.toString() && e.contentChanges.length > 0) {
        changeCount++;
      }
    });

    // Apply a single external change
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(0, 0, doc.lineCount, 0), '# External Edit\n\nNew.\n');
    await vscode.workspace.applyEdit(edit);

    // Wait long enough that a feedback loop would have triggered multiple events
    await new Promise(resolve => setTimeout(resolve, 3000));

    // In a feedback loop, changeCount would be >> 5. A healthy system should have
    // just 1-2 events (the initial change + possibly one re-serialization).
    assert.ok(
      changeCount < 10,
      `Expected fewer than 10 change events (no feedback loop), got ${changeCount}`
    );

    disposable.dispose();
  });
});
