# [005] Integration Tests: Activation and Custom Editor

## Metadata
- **Status:** TODO
- **Depends On:** 004
- **Blocks:** 007
- **Scope:** M
- **Design Doc:** [comprehensive-test-suite](../../design-docs/comprehensive-test-suite.md)

## Description

Write integration tests for extension activation and custom editor registration using `@vscode/test-cli`. These tests verify the extension activates correctly, registers the `quartz.markdownEditor` view type, opens `.md` files in the custom editor, and produces valid webview HTML.

Also includes a unit test for `getHtmlForWebview` (extracted or tested via the HTML string output) to verify CSP, nonce, and script tag structure — since integration tests cannot read webview HTML back after creation.

## Acceptance Criteria

- [ ] `test/integration/activation.test.ts` with 5 passing tests
- [ ] `test/integration/custom-editor.test.ts` with 4+ passing tests
- [ ] Webview HTML validation covered (via unit test of `getHtmlForWebview` output or integration proxy)
- [ ] All tests pass via `npm run test:integration`

## Technical Notes

### Activation Tests (`activation.test.ts`)
1. Extension activates without error when a `.md` file is in workspace
2. `quartz.markdownEditor` view type is registered after activation
3. Extension exports are defined (`activate` function returns)
4. Extension does not activate for non-markdown workspaces
5. `deactivate()` runs without error

### Custom Editor Tests (`custom-editor.test.ts`)
1. Opening a `.md` file with `vscode.commands.executeCommand('vscode.openWith', uri, 'quartz.markdownEditor')` succeeds
2. The webview panel is created (verify via `vscode.window.tabGroups`)
3. Closing the editor disposes the webview panel
4. Opening the same file twice reuses the existing editor

### HTML Validation (unit or integration)
- Verify the HTML string from `getHtmlForWebview` contains:
  - CSP meta tag with `nonce-` and `script-src`
  - `<div id="root">`
  - Script tag with nonce attribute
- This may be a Vitest unit test if `getHtmlForWebview` can be called directly, or tested indirectly via the integration `ready` message

### Files to Create
- `test/integration/activation.test.ts`
- `test/integration/custom-editor.test.ts`

### Key Considerations
- Use `vscode.extensions.getExtension()` to verify activation
- Use `vscode.commands.executeCommand('vscode.openWith', ...)` to open the custom editor
- Webview HTML cannot be read back from integration tests — test indirectly via successful `ready` message or extract `getHtmlForWebview` for a unit test
- Set Mocha timeout to 30s for VS Code startup

## Tests Required

### Integration Tests
- [ ] 5 activation tests
- [ ] 4+ custom editor tests
- [ ] HTML structure validation (unit or integration)

## Definition of Done

- [ ] All acceptance criteria met
- [ ] 9+ new integration tests passing
- [ ] No regressions in existing unit tests
