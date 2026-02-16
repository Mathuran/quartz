# [005] Create VS Code Marketplace Publisher Account

## Metadata
- **Status:** TODO
- **Depends On:** —
- **Blocks:** 006, 008
- **Scope:** S
- **Design Doc:** [vscode-marketplace-launch](../../design-docs/vscode-marketplace-launch.md)

## Description

Create a publisher account on the VS Code Marketplace. This is required before any extension can be published. The publisher ID will be used in package.json and becomes part of the extension's permanent identifier.

## Acceptance Criteria

- [ ] Microsoft account created or existing account identified
- [ ] Publisher account created at marketplace.visualstudio.com/manage
- [ ] Publisher ID chosen and registered (e.g., "quartz-editor")
- [ ] Publisher display name set
- [ ] Personal Access Token (PAT) generated with Marketplace (Publish) scope
- [ ] PAT stored securely (not committed to repo)

## Technical Notes

### Publisher Registration Steps

1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with Microsoft account
3. Click "Create Publisher"
4. Choose a publisher ID:
   - Must be unique across all Marketplace publishers
   - Becomes permanent (cannot be changed)
   - Suggested: `quartz-editor` or `quartz-md`
   - Have 2-3 backup names ready
5. Set display name: "Quartz"
6. Optionally add description and links

### Personal Access Token (PAT) Generation

1. Go to https://dev.azure.com
2. Sign in with the same Microsoft account
3. Click User Settings → Personal Access Tokens
4. Click "New Token"
5. Configure:
   - Name: "Quartz Marketplace Publish"
   - Organization: "All accessible organizations"
   - Expiration: Choose appropriate duration (max 1 year)
   - Scopes: Custom defined → Marketplace → Manage (check the box)
6. Click Create and **copy the token immediately** (it won't be shown again)

### PAT Storage

- Store PAT in a password manager
- Will be added as `VSCE_PAT` secret in GitHub repository (issue 008)
- Never commit PAT to source control

### Open Question from Design Doc
- Final publisher ID needs to be decided by maintainer

## Tests Required

### Manual Testing
- [ ] Can log in to marketplace.visualstudio.com/manage
- [ ] Publisher appears in the publishers list
- [ ] PAT works: `npx vsce login <publisher-id>` with PAT

## Definition of Done

- [ ] Publisher account created
- [ ] Publisher ID documented
- [ ] PAT generated and stored securely
- [ ] PAT tested with `vsce login`
