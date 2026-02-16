# [010] Final QA Pass and v1.0.0 Release

## Metadata
- **Status:** TODO
- **Depends On:** 009
- **Blocks:** —
- **Scope:** M
- **Design Doc:** [vscode-marketplace-launch](../../design-docs/vscode-marketplace-launch.md)

## Description

Execute the final QA checklist, update the version to 1.0.0, update the CHANGELOG with the release date, and create the official GitHub release that triggers publication to the VS Code Marketplace.

## Acceptance Criteria

- [ ] All automated tests pass (unit, integration, e2e)
- [ ] QA checklist (`test/qa/release-checklist.md`) completed
- [ ] Version in package.json updated to `1.0.0`
- [ ] CHANGELOG.md updated with release date
- [ ] GitHub release created with tag `v1.0.0`
- [ ] Extension published to VS Code Marketplace
- [ ] Extension installable and functional from Marketplace
- [ ] Marketplace listing displays correctly (icon, README, screenshots)

## Technical Notes

### Pre-Release Checklist

Run all tests:
```bash
npm test                    # Unit tests
npm run test:e2e            # E2E tests
```

### QA Execution

1. Open `test/qa/release-checklist.md`
2. Execute all 96 test cases
3. Document any failures
4. All blocking issues must be resolved before proceeding

### Version Bump

```bash
# Update version in package.json
npm version 1.0.0 --no-git-tag-version

# Or manually edit package.json
```

### CHANGELOG Update

Replace `YYYY-MM-DD` with actual release date:
```markdown
## [1.0.0] - 2026-02-XX
```

### Creating the Release

1. Commit version bump and CHANGELOG update:
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: bump version to 1.0.0"
   git push origin main
   ```

2. Create GitHub release:
   - Go to repository → Releases → "Create a new release"
   - Tag: `v1.0.0`
   - Title: "Quartz v1.0.0"
   - Description: Copy from CHANGELOG.md
   - Click "Publish release"

3. Monitor the release workflow:
   - Check Actions tab for workflow progress
   - Verify publication succeeds

### Post-Release Verification

1. Go to Marketplace listing
2. Verify:
   - Icon displays correctly
   - README content is correct
   - Screenshots are visible
   - Version shows 1.0.0
3. Install from Marketplace
4. Test basic functionality

### Marketplace URL

After publication:
`https://marketplace.visualstudio.com/items?itemName=<publisher-id>.quartz-markdown-editor`

## Tests Required

### Manual Testing
- [ ] Complete QA checklist (96 test cases)
- [ ] Verify Marketplace listing appearance
- [ ] Install from Marketplace and test core features
- [ ] Test on both macOS and Windows (if possible)

## Definition of Done

- [ ] QA checklist completed with sign-off
- [ ] Version 1.0.0 released
- [ ] Extension live on VS Code Marketplace
- [ ] Marketplace listing verified
- [ ] Installation from Marketplace verified
