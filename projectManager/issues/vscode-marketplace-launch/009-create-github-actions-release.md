# [009] Create GitHub Actions Release Workflow

## Metadata
- **Status:** DONE
- **Depends On:** 007, 008
- **Blocks:** 010
- **Scope:** M
- **Design Doc:** [vscode-marketplace-launch](../../design-docs/vscode-marketplace-launch.md)

## Description

Create a GitHub Actions workflow that automatically publishes the extension to the VS Code Marketplace when a GitHub release is created. This enables a simple release process: create a GitHub release with a version tag, and the extension is automatically published.

## Acceptance Criteria

- [ ] `.github/workflows/release.yml` created
- [ ] Workflow triggers on GitHub release publication
- [ ] Builds and packages the extension
- [ ] Publishes to VS Code Marketplace using `vsce publish`
- [ ] Uses `VSCE_PAT` secret for authentication
- [ ] `VSCE_PAT` secret added to repository settings
- [ ] Workflow tested with a pre-release (e.g., v0.9.0-beta)

## Technical Notes

### Workflow Configuration

```yaml
name: Release

on:
  release:
    types: [published]

jobs:
  publish:
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

      - name: Publish to VS Code Marketplace
        run: npx vsce publish -p ${{ secrets.VSCE_PAT }}
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
```

### Adding the VSCE_PAT Secret

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `VSCE_PAT`
4. Value: Personal Access Token from issue 005
5. Click "Add secret"

### Testing the Workflow

1. Create a pre-release to test the workflow:
   - Tag: `v0.9.0-beta`
   - Mark as "pre-release" in GitHub
2. Verify workflow runs and publishes
3. Check Marketplace for the extension listing
4. Verify extension installs correctly from Marketplace

### Version Sync Consideration

The version in `package.json` should match the release tag. Options:
1. Manual: Update package.json version before creating release
2. Automated: Add a step to extract version from tag and update package.json

For v1.0, use the manual approach (simpler).

### Files to Create
- `.github/workflows/release.yml`

### Rollback Plan

If a bad version is published:
1. Unpublish the version via Marketplace management portal
2. Fix the issue
3. Bump version number
4. Create a new release

## Tests Required

### Manual Testing
- [ ] Create a test pre-release (v0.9.0-beta)
- [ ] Verify workflow runs successfully
- [ ] Verify extension appears on Marketplace
- [ ] Install extension from Marketplace and verify it works

## Definition of Done

- [ ] Release workflow file created
- [ ] VSCE_PAT secret added to repository
- [ ] Test release published successfully
- [ ] Extension installable from Marketplace
- [ ] Changes committed to repository
