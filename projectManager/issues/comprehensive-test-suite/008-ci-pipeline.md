# [008] CI Pipeline Configuration

## Metadata
- **Status:** TODO
- **Depends On:** 007
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [comprehensive-test-suite](../../design-docs/comprehensive-test-suite.md)

## Description

Create a GitHub Actions workflow that runs unit tests and integration tests on every push to main and on pull requests. The pipeline should build the project, run Vitest unit tests, then run `@vscode/test-cli` integration tests.

## Acceptance Criteria

- [ ] `.github/workflows/test.yml` exists with a working workflow
- [ ] Workflow triggers on push to `main` and on pull requests
- [ ] Pipeline runs: install → build → unit tests → integration tests
- [ ] Integration tests run on `ubuntu-latest` with `xvfb-run` (VS Code needs a display)
- [ ] Pipeline completes in under 5 minutes
- [ ] `test:all` script is used or both test commands run sequentially

## Technical Notes

### Workflow Structure
```yaml
name: Tests
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
          node-version: 18
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: xvfb-run -a npm run test:integration
```

### Files to Create
- `.github/workflows/test.yml`

### Key Considerations
- `@vscode/test-cli` requires a display server on Linux — use `xvfb-run -a` prefix
- Use `npm ci` (not `npm install`) for reproducible CI builds
- Cache `node_modules` via `actions/setup-node` cache option
- `@vscode/test-cli` downloads VS Code on first run — this adds ~30s to CI time. The download is cached across runs by default.
- If the integration test step fails, the unit test results should still be visible (use separate steps, not `test:all`)

## Tests Required

### Manual Testing
- [ ] Push a branch and verify the GitHub Actions workflow runs successfully
- [ ] Verify a failing test produces a red build

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Workflow runs green on current codebase
- [ ] A deliberately failing test produces a red build
