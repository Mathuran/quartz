# [002] Create Test Harness HTML and Static File Server

## Metadata
- **Status:** DONE
- **Depends On:** 001
- **Blocks:** 003, 004, 005, 006, 007, 008, 009, 010
- **Scope:** M
- **Design Doc:** [e2e-playwright-testing](../../design-docs/e2e-playwright-testing.md)

## Description

Create the standalone HTML test harness (`test/e2e/harness.html`) that mocks `acquireVsCodeApi()` and loads the webview bundle, the static file server with dynamic port allocation (`test/e2e/server.ts`), and the global setup/teardown scripts that build the webview and manage the server lifecycle.

## Acceptance Criteria

- [ ] `test/e2e/harness.html` exists and:
  - Defines `window.acquireVsCodeApi()` mock before bundle loads
  - Tracks messages in `__quartzMessages` array
  - Tracks updates in `__quartzUpdates` queue (not a single variable)
  - Exposes `__loadMarkdown(content, fileName)`, `__getUpdate(index?)`, `__getUpdateCount()`, `__updateConfig(config)` helpers
  - Loads `/dist/webview/index.css` and `/dist/webview/index.js`
  - Has `<div id="root">` mount point
  - Auto-loads pending document when webview sends "ready"
- [ ] `test/e2e/server.ts` exists and:
  - Serves files from the project root
  - Tries port 3100 by default, increments until a free port is found (up to 100 attempts)
  - Returns `{ server, port }` from `startServer()`
  - Has `stopServer(server)` for cleanup
  - Handles `.html`, `.js`, `.css`, `.md` MIME types
- [ ] `test/e2e/global-setup.ts` exists and:
  - Runs `npm run build:webview`
  - Starts the server and stores the port in `process.env.E2E_BASE_URL`
  - Stores server reference on `globalThis` for teardown
- [ ] `test/e2e/global-teardown.ts` exists and stops the server
- [ ] Running `npm run build:webview && npx tsx test/e2e/server.ts` starts a server that serves the harness page correctly

## Technical Notes

### Suggested Approach
1. Create `test/e2e/` directory structure
2. Write `harness.html` based on design doc section 4.1 (use the queue-based update tracking)
3. Write `server.ts` with dynamic port allocation per design doc section 4.4
4. Write `global-setup.ts` and `global-teardown.ts` per design doc section 4.5
5. Manually verify: start the server, open `http://localhost:<port>/test/e2e/harness.html` in a browser, confirm the webview renders (loading state is expected since no document is sent)

### Files to Create
- `test/e2e/harness.html`
- `test/e2e/server.ts`
- `test/e2e/global-setup.ts`
- `test/e2e/global-teardown.ts`

### Key Considerations
- The `acquireVsCodeApi` mock must be defined BEFORE `dist/webview/index.js` loads because `App.tsx` calls it at module scope (line 11)
- The server uses `path.join(ROOT, req.url)` which has a path traversal issue, but this is acceptable for a localhost-only test server (per review decision)
- Dynamic port allocation uses `net.createServer()` to probe port availability
- `global-setup.ts` uses `execSync('npm run build:webview')` — this blocks until the build completes

## Tests Required

### Manual Testing
- [ ] Start server via `npx tsx test/e2e/server.ts`, open harness in browser — page loads without console errors
- [ ] Open browser console, run `__loadMarkdown('# Hello\n\nWorld', 'test.md')` — editor renders heading and paragraph
- [ ] Verify `__getUpdateCount()` returns a number after edits
- [ ] Verify server shuts down cleanly when the process is killed

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Harness loads webview bundle without errors in Chromium
- [ ] Server starts on dynamic port and serves all required files
- [ ] Global setup builds webview and starts server
- [ ] Global teardown stops server cleanly
- [ ] No regressions in existing tests
