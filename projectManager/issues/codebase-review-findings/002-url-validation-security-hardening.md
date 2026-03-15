# [002] URL Validation Security Hardening

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** —
- **Scope:** M
- **Design Doc:** [codebase-review-findings](../../design-docs/codebase-review-findings.md)

## Description

Multiple URL input paths lack validation or have bypassable validation, allowing `javascript:` and malicious `data:` URLs to be injected into the editor. This affects the link input rule, the Mod-K keyboard shortcut, and the image slash command.

**Findings:** 5.1, 5.2, 4.29

## Acceptance Criteria

- [x] `isValidUrl()` in `linkInputRule.ts` strips control characters (0x00-0x1F, 0x7F) before comparison
- [x] `data:image/svg+xml` is blocked (only `data:image/png`, `data:image/jpeg`, `data:image/gif`, `data:image/webp` allowed)
- [x] Mod-K link handler (`keyboardShortcuts.ts:358-376`) validates URL via `isValidUrl()` before calling `setLink()`
- [x] Image slash command (`slashCommands.ts:188-194`) validates URL via `isValidUrl()` before calling `setImage()`
- [x] `isValidUrl()` is extracted to a shared utility so all code paths use the same function
- [x] `LinkDialog.tsx` URL validation is consistent with the shared `isValidUrl()`
- [x] Tests cover: `javascript:` URLs, `data:image/svg+xml`, control character bypass attempts, valid URLs

## Human Review Focus

- **Look at:** The hardened `isValidUrl()` implementation — ensure no bypass paths remain
- **Test:** Try entering `javascript:alert(1)`, `java\x09script:alert(1)`, `data:image/svg+xml,<svg onload=alert(1)>` via Mod-K and slash command
- **Decide:** Whether `data:` URLs should be allowed at all, or only specific image MIME types

## Agent Autonomy Notes

- **Agent can decide:** File location for shared utility, exact control character stripping regex, test structure
- **Escalate to human:** Whether to block all `data:` URLs or allowlist specific image types

## Technical Notes

### Suggested Approach
1. Extract `isValidUrl()` from `linkInputRule.ts` to a shared utility (e.g., `src/webview/utils/urlValidation.ts`)
2. Harden: strip control chars, block `data:image/svg+xml`, allowlist safe `data:image/*` types
3. Import and use in `keyboardShortcuts.ts` Mod-K handler
4. Import and use in `slashCommands.ts` image command
5. Update `LinkDialog.tsx` to use the same function
6. Add comprehensive tests

### Files to Modify
- `src/webview/extensions/linkInputRule.ts` — Extract `isValidUrl()`, import from shared utility
- `src/webview/extensions/keyboardShortcuts.ts` — Add URL validation to Mod-K handler
- `src/webview/commands/slashCommands.ts` — Add URL validation to image command
- `src/webview/components/LinkDialog.tsx` — Use shared `isValidUrl()`
- New: `src/webview/utils/urlValidation.ts` — Shared URL validation utility

### Key Considerations
- Control characters like `\x09` (tab), `\x0a` (newline), `\x00` (null) can break `startsWith` checks but some browsers strip them before navigating
- `data:image/svg+xml` is particularly dangerous because SVG can contain `<script>` and event handlers
- The VS Code webview CSP provides a second layer of defense, but defense-in-depth is important

## Tests Required

### Unit Tests
- [x] `isValidUrl` rejects `javascript:alert(1)`
- [x] `isValidUrl` rejects `JavaScript:alert(1)` (case variation)
- [x] `isValidUrl` rejects `java\x09script:alert(1)` (control char bypass)
- [x] `isValidUrl` rejects `java\x00script:alert(1)` (null byte bypass)
- [x] `isValidUrl` rejects `vbscript:msgbox`
- [x] `isValidUrl` rejects `data:image/svg+xml,<svg onload=alert(1)>`
- [x] `isValidUrl` rejects `data:text/html,<script>alert(1)</script>`
- [x] `isValidUrl` allows `https://example.com`
- [x] `isValidUrl` allows `http://localhost:3000`
- [x] `isValidUrl` allows `data:image/png;base64,...`
- [x] `isValidUrl` allows `data:image/jpeg;base64,...`
- [x] `isValidUrl` allows relative paths `/path/to/file`
- [x] `isValidUrl` allows fragment identifiers `#section`

## Definition of Done

- [x] All acceptance criteria met
- [x] Unit tests written and passing
- [ ] Human review completed (see Human Review Focus above)
- [x] No regressions in existing link/image functionality
