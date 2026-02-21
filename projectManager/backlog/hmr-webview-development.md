# Hot Module Replacement for Webview Development

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P2                           |
| **Tags**       | devex, infrastructure        |
| **Related**    | [developer-experience-improvements](../design-docs/developer-experience-improvements.md) |
| **Created**    | 2026-02-21                   |

## Problem

When developing the Quartz webview (React + TipTap editor), every code change requires a full extension reload (~3 seconds). This slow feedback loop slows down UI development and iteration. The DX design doc identified this as a P2 improvement that wasn't implemented in the initial pass.

## Desired Outcome

A developer runs a dev mode command and gets near-instant (~300ms) hot reloads when editing webview code. The editor state (document content, cursor position) is preserved across reloads where possible.

## Scope & Boundaries

**In scope:**
- Development mode that serves webview from a local dev server
- HMR for React components and CSS
- Fallback to current behavior in production builds

**Out of scope:**
- HMR for extension host code (Node.js side)
- Production bundle changes
- Vite migration (use esbuild serve or minimal dev overlay)

## Open Questions

- Can `vscode.env.asExternalUri` reliably proxy a local dev server into the webview?
- Does VS Code webview CSP allow connections to localhost dev servers?
- Is the complexity worth it given the current project size?

## Notes

- VS Code webview security model may complicate this — needs a proof-of-concept first
- esbuild's `serve` mode or a lightweight Vite dev-only setup are both viable approaches
- This was scoped but deferred from the DX design doc implementation
