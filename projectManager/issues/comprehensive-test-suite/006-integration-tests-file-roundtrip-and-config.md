# [006] Integration Tests: File Round-Trip and Configuration

## Metadata
- **Status:** TODO
- **Depends On:** 004
- **Blocks:** 007
- **Scope:** M
- **Design Doc:** [comprehensive-test-suite](../../design-docs/comprehensive-test-suite.md)

## Description

Write integration tests for file I/O round-trips and configuration handling using `@vscode/test-cli`. These tests verify that opening, editing, and saving `.md` files through the custom editor produces correct results, and that VS Code configuration changes are forwarded to the webview.

## Acceptance Criteria

- [ ] `test/integration/file-roundtrip.test.ts` with 6 passing tests
- [ ] `test/integration/configuration.test.ts` with 5 passing tests
- [ ] All tests pass via `npm run test:integration`

## Technical Notes

### File Round-Trip Tests (`file-roundtrip.test.ts`)
1. Open a simple `.md` file → editor opens without error
2. Open a file with frontmatter → no errors
3. Open an empty `.md` file → no errors, editor loads
4. Open a large file (1000 lines) → editor loads within 5 seconds
5. Edit via webview `update` message → save → file on disk contains modified content
6. Dirty indicator activates when content changes

### Configuration Tests (`configuration.test.ts`)
1. Default configuration values match `package.json` defaults
2. Changing `quartz.editor.fontSize` is accepted without error
3. Changing `quartz.editor.pageLayout` is accepted without error
4. Setting `quartz.editor.theme` to `"dark"` is accepted
5. Configuration changes do not require extension reload

### Files to Create
- `test/integration/file-roundtrip.test.ts`
- `test/integration/configuration.test.ts`

### Key Considerations
- File round-trip tests need to:
  1. Open the file with `vscode.commands.executeCommand('vscode.openWith', ...)`
  2. Wait for the editor to be ready
  3. Simulate a webview `update` message (or modify the document via `WorkspaceEdit`)
  4. Save via `vscode.commands.executeCommand('workbench.action.files.save')`
  5. Read the file back and verify content
- Use `vscode.workspace.getConfiguration('quartz.editor').update()` for config tests
- Create temp copies of fixture files so tests don't modify the originals
- Clean up temp files in `afterEach`

## Tests Required

### Integration Tests
- [ ] 6 file round-trip tests
- [ ] 5 configuration tests

## Definition of Done

- [ ] All acceptance criteria met
- [ ] 11 new integration tests passing
- [ ] No regressions in existing unit tests
