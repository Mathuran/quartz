---
name: release
description: Bump version, tag, push, and create a GitHub release with generated notes
arguments:
  - name: version
    description: "Semantic version to release (e.g. 0.2.0). If omitted, auto-determine from commits."
    required: false
---

# Create Release

Bump the version, tag, push, and create a GitHub release.

## Instructions

### Step 1: Determine the Version

1. Run `git log --oneline` to see commits since the last tag:
   ```bash
   git log --oneline $(git describe --tags --abbrev=0 2>/dev/null || echo HEAD~20)..HEAD
   ```
2. Read `package.json` to find the current version.
3. If a version argument was provided (`$ARGUMENTS`), use that. Otherwise, determine the bump:
   - **Major** (x.0.0) — breaking changes
   - **Minor** (0.x.0) — new features (any `feat:` commits)
   - **Patch** (0.0.x) — bug fixes only (`fix:` commits)
4. Confirm the version with the user before proceeding.

### Step 2: Update package.json

Update the `"version"` field in `package.json` to the new version.

### Step 3: Commit the Version Bump

```bash
git add package.json
git commit -m "chore: bump version to <version>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Step 4: Create the Git Tag

```bash
git tag v<version>
```

### Step 5: Generate Release Notes

Categorize all commits since the previous tag into sections:

- **New Features** — `feat:` commits. Write a user-facing bullet for each with a bold title and short description.
- **Bug Fixes** — `fix:` commits. Write a concise bullet for each.
- **Maintenance** — `chore:`, `refactor:`, `style:`, `docs:`, `test:` commits. Summarize briefly.

Omit any empty sections. Use markdown formatting.

### Step 6: Generate a Release Title

Format: `v<version> — <short summary of highlights>`

Keep it concise (under 60 characters after the version). Highlight the 1-2 most important changes.

### Step 7: Push and Create Release

1. Push commits and tag:
   ```bash
   git push origin main --tags
   ```
2. Create the GitHub release:
   ```bash
   gh release create v<version> --title "<title>" --notes "<notes>"
   ```
3. Return the release URL to the user.

## Important Rules

- **NEVER** push without confirming the version with the user first
- **NEVER** force push or delete remote tags
- If `package.json` was already updated, skip Step 2 and just tag + release
- If the tag already exists locally, delete and recreate it on the version bump commit
- Always move the tag to the version bump commit, not an earlier one
