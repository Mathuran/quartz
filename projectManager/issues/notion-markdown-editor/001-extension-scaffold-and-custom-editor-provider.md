# [001] Extension Scaffold and Custom Editor Provider

## Metadata
- **Status:** TODO
- **Depends On:** None
- **Blocks:** 002, 003, 005
- **Scope:** M
- **Design Doc:** [notion-markdown-editor](../../design-docs/notion-markdown-editor.md)

## Description

Set up the VS Code extension project structure, build tooling, and register a `CustomTextEditorProvider` for `.md` files. This is the foundation every other issue builds on.

The extension host must be able to open a `.md` file, create a webview panel, and establish bidirectional message passing between the extension host and the webview. The webview should render a minimal React app (empty page) to prove the pipeline works.

## Acceptance Criteria

- [ ] Extension project scaffolded with TypeScript, esbuild/webpack for bundling
- [ ] `package.json` declares `customEditors` contribution for `.md` files with editor type `quartz.markdownEditor`
- [ ] `CustomTextEditorProvider` registered in `extension.ts` — opening a `.md` file with "Open With..." shows the Quartz editor option
- [ ] Webview panel renders a minimal React app with VS Code theme-aware CSS
- [ ] Bidirectional `postMessage` communication works (extension host sends file content to webview, webview sends ack back)
- [ ] Content Security Policy applied to webview (script nonce, no external resources)
- [ ] Extension activates only for `.md` files (`activationEvents`)
- [ ] Configuration settings registered in `package.json` (all settings from design doc §4 Configuration)
- [ ] Build produces a `.vsix` file that installs in VS Code

## Technical Notes

### Suggested Approach
1. Scaffold with `yo code` or manual setup: `src/extension.ts`, `src/webview/`, `package.json`
2. Configure esbuild for two entry points: extension host (`src/extension.ts`) and webview (`src/webview/index.tsx`)
3. Implement `QuartzEditorProvider` class implementing `vscode.CustomTextEditorProvider`
4. In `resolveCustomTextEditor`, create webview HTML with React mount point and CSP headers
5. Set up `postMessage` handlers on both sides
6. Add all `quartz.editor.*` settings to `package.json` contributes.configuration
7. Test by installing `.vsix` and opening a `.md` file

### Files to Create
- `src/extension.ts` — Extension entry point, registers provider
- `src/QuartzEditorProvider.ts` — CustomTextEditorProvider implementation
- `src/webview/index.tsx` — React entry point
- `src/webview/App.tsx` — Root React component
- `package.json` — Extension manifest with contributions
- `tsconfig.json` — TypeScript config
- `esbuild.js` or `webpack.config.js` — Build config
- `.vscodeignore` — Files to exclude from .vsix

### Key Considerations
- Webview scripts must use nonces for CSP compliance
- React must be bundled into the webview, not loaded from CDN
- Use `webview.asWebviewUri()` to convert local file paths to webview-safe URIs
- Theme detection: read `document.body.dataset.vscodeThemeKind` in the webview
- The webview cannot directly access the filesystem — all data flows through `postMessage`

## Tests Required

### Unit Tests
- [ ] `QuartzEditorProvider` resolves and creates webview with correct HTML
- [ ] CSP header includes nonce and restricts sources
- [ ] Configuration defaults are set correctly

### Integration Tests
- [ ] Extension activates when opening `.md` file
- [ ] "Open With..." shows Quartz editor option
- [ ] Webview renders without console errors
- [ ] Message passing round-trip works (send content, receive ack)

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] No regressions in existing functionality
