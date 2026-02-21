# CI/CD Guide

## Overview

Quartz uses a single GitHub Actions workflow (`.github/workflows/ci.yml`) with three stages:

```
push/PR to main          GitHub Release published
       │                          │
       ▼                          ▼
    ┌──────┐                   ┌──────┐
    │ test │                   │ test │
    └──┬───┘                   └──┬───┘
       ▼                          ▼
   ┌─────────┐              ┌─────────┐
   │ package │              │ package │
   └─────────┘              └────┬────┘
       │                         ▼
       │                    ┌─────────┐
       │                    │ publish │  → VS Code Marketplace
       │                    └─────────┘
       ▼
   VSIX artifact (30-day retention)
```

## Stages

### 1. Test

Runs on every push to `main` and every PR targeting `main`.

- Installs dependencies (`npm ci`)
- Builds the extension (`npm run build`)
- Runs unit tests via Vitest (`npm test`)
- Compiles and runs VS Code integration tests (`xvfb-run -a npx vscode-test`)
- Runs Playwright E2E tests (`npm run test:e2e`)

### 2. Package

Runs after tests pass. Builds a `.vsix` artifact and uploads it to GitHub (retained for 30 days). Useful for manual testing before a release.

### 3. Publish

Runs **only** when a GitHub Release is published. After tests and packaging pass, it publishes to the VS Code Marketplace using `vsce publish`.

**Requires:** A `VSCE_PAT` secret configured in the `prod` GitHub environment.

## How to Make a Release

### 1. Bump the version

```bash
# Update version in package.json
npm version patch   # 0.1.2 → 0.1.3
# or
npm version minor   # 0.1.2 → 0.2.0
# or
npm version major   # 0.1.2 → 1.0.0
```

`npm version` updates `package.json` and creates a git commit + tag automatically.

### 2. Push the commit and tag

```bash
git push origin main --tags
```

Wait for CI to pass on the push.

### 3. Create a GitHub Release

```bash
gh release create v0.1.3 --title "v0.1.3" --generate-notes
```

Or use the GitHub UI: **Releases → Draft a new release → Choose the tag → Publish**.

This triggers the full pipeline: test → package → publish to marketplace.

### 4. Verify

- Check the [Actions tab](https://github.com/Mathuran/quartz/actions) for a green publish job
- Confirm the new version appears on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=quartz.quartz-markdown-editor)

## How to Roll Back a Release

### Option A: Publish a patch (preferred)

The safest approach — fix the issue and release a new version:

```bash
# Fix the issue on main
git cherry-pick <fix-commit>   # or make the fix directly
npm version patch
git push origin main --tags
gh release create v0.1.4 --title "v0.1.4" --notes "Reverts issue introduced in v0.1.3"
```

### Option B: Re-publish a previous version

If you need to immediately revert to a known-good version:

```bash
# Check out the previous release tag
git checkout v0.1.2

# Publish that version directly (bumps to a new version number)
npx vsce publish patch -p <YOUR_PAT>
```

Note: The marketplace requires a strictly increasing version number, so you can't re-publish the exact same old version. This publishes the old code under a new version.

### Option C: Unpublish the broken version

As a last resort, you can unpublish from the marketplace:

```bash
npx vsce unpublish quartz.quartz-markdown-editor
```

**Warning:** This removes the extension entirely for all users. Only use this for critical issues (security vulnerabilities, data loss). You'll need to re-publish afterward.

## Secrets

| Secret | Where | Purpose |
|--------|-------|---------|
| `VSCE_PAT` | GitHub environment `prod` | Personal Access Token for VS Code Marketplace publishing |

To generate a PAT: [Azure DevOps → User Settings → Personal Access Tokens](https://dev.azure.com/) → create a token with **Marketplace: Manage** scope.

## Running Tests Locally

```bash
npm test                 # Unit tests (Vitest)
npm run test:integration # VS Code integration tests
npm run test:e2e         # Playwright E2E tests
npm run test:all         # All test suites
```
