# [001] Audit Obfuscated Preinstall Script

## Metadata
- **Status:** DONE
- **Depends On:** —
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [codebase-review-findings](../../design-docs/codebase-review-findings.md)

## Description

The `preinstall.js` file is 36KB of obfuscated JavaScript that uses Unicode variation selectors to hide code, decoded via `Buffer.from()` and executed with `eval()`. It runs automatically on every `npm install` via the `"preinstall"` script in `package.json`. This matches the exact pattern used in supply chain attacks (event-stream, ua-parser-js). The content uses Unicode tag characters (U+E0100-U+E01EF range) that are zero-width/invisible in most editors.

**Finding:** 6.1

## Acceptance Criteria

- [x] `preinstall.js` decoded and its actual behavior fully documented
- [ ] If benign: rewritten in readable, auditable JavaScript
- [x] If malicious: removed entirely, git history investigated, and dependencies audited
- [x] `package.json` `"preinstall"` script updated or removed accordingly
- [x] No use of `eval()` in the replacement

## Human Review Focus

- **Look at:** The decoded output of `preinstall.js` to determine what it actually does
- **Test:** Run `npm install` and verify extension still works correctly
- **Decide:** Whether the script is needed at all, or should be removed entirely

## Agent Autonomy Notes

- **Agent can decide:** How to decode the file, how to restructure readable replacement
- **Escalate to human:** Whether the decoded behavior is intentional/benign, whether to keep or remove the script entirely

## Technical Notes

### Suggested Approach
1. Decode the Unicode-hidden content by reading the raw bytes and extracting the encoded payload
2. Document what the decoded code does
3. If benign (e.g., license check, telemetry), rewrite in plain JS
4. If unnecessary or malicious, remove `preinstall.js` and the `"preinstall"` script from `package.json`
5. Investigate git blame to see when/how this file was introduced

### Files to Modify
- `preinstall.js` — Rewrite or delete
- `package.json` — Update or remove `"preinstall"` script

### Key Considerations
- This is the highest-priority security item in the entire review
- The file imports `require('crypto')` which suggests it may be doing some form of validation or hashing
- Even if benign, obfuscated `eval()` in a lifecycle script is unacceptable for an open-source project

## Tests Required

### Unit Tests
- N/A (this is a build script, not runtime code)

### Manual Testing
- [ ] Run `npm install` after changes — verify no errors
- [ ] Run `npm run build` — verify extension builds correctly
- [ ] Run `npm test` — verify all tests pass

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Human review completed (see Human Review Focus above)
- [ ] No regressions in build or install process
