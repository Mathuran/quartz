---
name: commit
description: Stage, lint, format, test, and commit changes with a well-crafted message
arguments: []
---

# Commit Changes

Stage, validate, and commit the current changes following project best practices.

## Instructions

### Step 1: Understand the Changes

Run these commands in parallel to understand the current state:

1. `git status` — see all modified, staged, and untracked files (never use `-uall`)
2. `git diff` — see unstaged changes
3. `git diff --cached` — see already-staged changes
4. `git log --oneline -5` — see recent commits for message style reference

### Step 2: Run Lint and Format

Run these before committing to ensure code quality:

1. `npm run format` — auto-format all source files with Prettier
2. `npm run lint:fix` — auto-fix ESLint issues

If lint produces **errors** (not warnings), fix them before proceeding. Pre-existing warnings (e.g., `security/detect-object-injection`) can be ignored.

If formatting or lint changed any files, include those changes in the commit.

### Step 3: Run Tests

Run tests to verify nothing is broken:

1. `npm test` — unit tests (must all pass)
2. `npm run test:e2e` — E2E tests (must all pass, 1 skipped image test is OK)

If tests fail, **stop and fix the failures** before committing. Do not commit broken code.

### Step 4: Stage Files

Stage files selectively — prefer naming specific files over `git add -A`:

```bash
git add file1.ts file2.tsx file3.test.ts
```

**Never stage:**
- `.env`, credentials, or secrets
- `node_modules/`, `dist/`, or build artifacts
- Large binary files

**Group related changes** into logical commits when possible:
- Feature code + its tests = one commit
- Formatting/lint fixes = separate commit (or combined if they're part of the feature)
- Design doc/issue updates = separate commit

### Step 5: Write the Commit Message

Follow these conventions:

**Format:**
```
<type>: <concise summary of why, not what>

<optional body — extra context, what changed and why>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

**Types:**
- `feat` — new feature or capability
- `fix` — bug fix
- `docs` — documentation only (design docs, issues, README)
- `test` — adding or updating tests
- `refactor` — code restructuring without behavior change
- `chore` — tooling, config, dependencies
- `style` — formatting, lint fixes (no logic change)

**Guidelines:**
- First line under 72 characters
- Focus on **why**, not **what** (the diff shows what)
- Use imperative mood: "add callout support" not "added callout support"
- If multiple logical changes exist, make multiple commits
- Always end with the `Co-Authored-By` trailer

**Always use a HEREDOC** to pass the message:
```bash
git commit -m "$(cat <<'EOF'
feat: add callout support with 8 types

Parser detects [!type] in blockquotes, TipTap extension renders
with colored borders and icons, slash commands for all 8 types.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### Step 6: Verify

After committing, run `git status` to confirm the working tree is clean (or only has intentionally unstaged files).

## Important Rules

- **NEVER** force push, reset --hard, or amend unless explicitly asked
- **NEVER** skip pre-commit hooks (no `--no-verify`)
- **NEVER** commit if tests are failing
- **NEVER** push to remote unless explicitly asked
- If a pre-commit hook fails, fix the issue and create a **new** commit (don't amend)
- When in doubt about what to include, ask the user

## Quality Checklist

Before the final commit:
- [ ] `npm run format` ran (Prettier)
- [ ] `npm run lint` has 0 errors (warnings OK)
- [ ] `npm test` all passing
- [ ] `npm run test:e2e` all passing (1 skipped OK)
- [ ] No secrets or credentials staged
- [ ] Commit message follows type convention
- [ ] Co-Authored-By trailer included
- [ ] Related design docs/issues updated if applicable
