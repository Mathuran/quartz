# [008] Create GitHub Actions CI Workflow

## Metadata
- **Status:** DONE
- **Depends On:** 005, 007
- **Blocks:** 009
- **Scope:** M
- **Design Doc:** [vscode-marketplace-launch](../../design-docs/vscode-marketplace-launch.md)

## Description

Create a GitHub Actions CI workflow that runs on every push and pull request. The workflow should run all tests (unit, integration, e2e), build the extension, and package it as an artifact. This ensures code quality before merging and provides downloadable builds for testing.

## Acceptance Criteria

- [ ] `.github/workflows/ci.yml` created
- [ ] Workflow triggers on push to main and PRs
- [ ] Runs unit tests (`npm test`)
- [ ] Runs e2e tests (`npm run test:e2e`)
- [ ] Builds the extension (`npm run build`)
- [ ] Packages the extension (`npm run package`)
- [ ] Uploads .vsix as artifact for download
- [ ] Uses Node.js 20
- [ ] Caches npm dependencies for faster runs
- [ ] Workflow passes on current main branch

## Technical Notes

### Workflow Configuration

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run build
      - run: npm test

      # E2E tests require Playwright browsers
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium

      - run: npm run test:e2e

  package:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run build
      - run: npm run package

      - uses: actions/upload-artifact@v4
        with:
          name: vsix
          path: '*.vsix'
          retention-days: 30
```

### E2E Test Considerations

- Playwright needs browser binaries installed
- Use `--with-deps` to install system dependencies on Ubuntu
- Consider using Playwright's GitHub Action for caching

### Alternative E2E Approach (if needed)

```yaml
- name: Install Playwright
  uses: microsoft/playwright-github-action@v1

- run: npm run test:e2e
```

### Files to Create
- `.github/workflows/ci.yml`

### Directory Structure
```
.github/
└── workflows/
    └── ci.yml
```

## Tests Required

### Manual Testing
- [ ] Push to a branch and verify workflow runs
- [ ] Create a PR and verify checks appear
- [ ] Download artifact and verify .vsix works
- [ ] Verify all test jobs pass

## Definition of Done

- [ ] CI workflow file created
- [ ] All tests pass in GitHub Actions
- [ ] Artifact upload works
- [ ] Workflow runs on PRs and pushes
- [ ] Changes committed to repository
