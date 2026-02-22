---
name: Project Management
description: This skill should be used when the user asks to "create a design doc", "write a design document", "plan a feature", "create an issue", "split into issues", "review design", "create project plan", "amazon style doc", "6-pager", "start a new feature", "break down tasks", "evaluate features", "prioritize backlog", "review feature ideas", "think of features", "brainstorm features", or mentions design documents, feature planning, issue creation, backlog management, feature evaluation, or project management workflows. Provides CTO-style project management with Amazon-style design docs, structured issue tracking, and product engineering principles.
version: 2.0.0
---

# Project Management Skill

## Overview

This skill enables CTO-style project management workflows using the `/projectManager` folder structure. It combines Amazon-style design documents, structured review processes, systematic issue breakdown, and product engineering principles for evaluating and prioritizing work.

## Folder Structure

```
/projectManager/
├── backlog/               # Feature requests and ideas
│   └── feature-name.md    # One file per request
├── design-docs/           # Amazon-style design documents
│   └── FEATURE-NAME.md    # One doc per feature
├── issues/                # Implementation issues
│   └── FEATURE-NAME/      # Issues grouped by feature
│       ├── 001-issue-name.md
│       ├── 002-issue-name.md
│       └── ...
└── .claude-plugin/        # Plugin configuration
```

---

## Product Engineering Principles

These principles govern how features are evaluated, scoped, and prioritized. Apply them whenever brainstorming, reviewing feature ideas, or triaging the backlog.

### 1. Ruthless Consolidation

When presented with a list of feature ideas, always ask: "Which of these are actually the same feature at different zoom levels?" Merge aggressively.

**Pattern:** If feature A is a subset of feature B, or if A and B are two sides of the same coin, they are one feature. Examples:
- "Diff preview" + "Accept/reject changes" = one feature (block-level diff review)
- "Document scaffolding" + "Structure validation" = one feature (document templates)
- "Paste cleanup for AI" + "Paste cleanup for web" = one feature (smart paste pipeline)

### 2. Cut What Already Exists

Before proposing a feature, check whether VS Code, git, or the existing ecosystem already solves it. Don't rebuild:
- **Git history** — GitLens exists. Don't build a version timeline.
- **Multi-file diffs** — VS Code Source Control view does this. Don't build a batch preview panel.
- **Commit messages** — Tangential to the editor. Multiple tools exist.
- **File attribution** — Git blame exists. Don't track "who edited what" inside the editor.

**Test:** If removing this feature means the user just uses an existing tool they already have, cut it.

### 3. Simple Primitives Over Complex Features

One well-designed primitive that covers 10 use cases beats 10 narrow features. Prefer building capabilities, not features.

**Good:** A paste pipeline that normalizes any source format (covers AI chat, web, terminal, other editors)
**Bad:** "AI paste cleanup" + "Web paste cleanup" + "Terminal paste cleanup" as separate features

**Good:** A template system that defines structure, scaffolds, and validates
**Bad:** "Scaffold command" + "Conformance checker" + "Section generator" as separate features

### 4. Scope by Human Review Effort, Not Coding Effort

A feature that takes 2 hours to code but requires 30 minutes of careful review is **larger** than a feature that takes 8 hours to code but is obviously correct. Scope reflects the cost of getting it wrong.

### 5. Priority Framework

| Priority | Criteria | Action |
|----------|----------|--------|
| **P0** | Blocking users or causing data loss | Drop everything, fix now |
| **P1** | Daily friction in primary workflows | Address in current cycle |
| **P2** | Valuable but has workarounds | Do when bandwidth allows |
| **P3** | Nice to have, speculative value | Revisit quarterly |

**Escalation rule:** If 3+ users report the same P2, it's a P1.

### 6. The Senior Engineer Review

When evaluating any feature proposal, apply this filter:

1. **Is it over-engineered?** Can it be simpler and still solve 80% of use cases?
2. **Does it duplicate existing tools?** Would users just use VS Code / git / existing extensions instead?
3. **Is it a primitive or a one-off?** Does it compose into other workflows, or is it a dead end?
4. **What's the blast radius?** How many files does it touch? How many existing behaviors does it change?
5. **Can it ship incrementally?** Can v1 be useful on its own, or does it require the full vision to be valuable?

---

## Quartz-Specific Best Practices

### Architecture Rules

1. **Markdown processing stays in `src/markdown/`** — Never put parsing or serialization logic in webview components. The parser and serializer are the source of truth.
2. **Every new block type needs a roundtrip test** — `parse(serialize(parse(md))) === parse(md)` is the invariant. No exceptions.
3. **Extensions go in `src/webview/extensions/`** — One file per TipTap extension. Keep them self-contained.
4. **Debounce at 300ms** — All updates from the webview to VS Code go through the debounce utility. Don't create new timers.
5. **External content loads skip undo history** — Use `tr.setMeta('addToHistory', false)` for any content that didn't come from user keystrokes.

### Testing Requirements

Every feature ships with tests at the appropriate levels:

| Level | What it proves | Required for |
|-------|---------------|-------------|
| **Parser test** | Markdown → JSON structure is correct | Any new block type or syntax |
| **Serializer test** | JSON → Markdown output is correct | Any new block type or syntax |
| **Roundtrip test** | Parse → serialize → parse is stable | Any new block type (mandatory) |
| **Feature test** | Feature-specific behavior works | Keyboard shortcuts, slash commands, interactions |
| **E2E test** | Works in the browser end-to-end | User-facing features |

### Test Execution Order

Tests run in dependency order — foundational tests fail fast before expensive tests execute:

```
Unit (parser → serializer → roundtrip → features → edge cases)
  → Integration (activation → editor → config → file roundtrip)
    → E2E (foundational → interactions → features → integration)
```

### Commit Hygiene

- **One logical change per commit.** Feature code + its tests = one commit. Formatting fixes = separate commit.
- **Design doc and issue updates get committed together** with their code changes when completing a feature.
- **Never leave project management files uncommitted.** If you update issue statuses, commit them.
- **Commit message focuses on why, not what.** The diff shows what changed. The message explains the intent.

### Feature Development Workflow

The standard flow for any non-trivial feature:

```
/feature-request → /design-doc → /review-doc → /create-issues → implement → /commit
```

1. **Backlog** (`/feature-request`): Capture the idea with problem, desired outcome, scope boundaries
2. **Design** (`/design-doc`): Write the Amazon-style 6-pager with full technical detail
3. **Review** (`/review-doc`): Iterate with targeted questions until approved
4. **Issues** (`/create-issues`): Break into smallest testable pieces with dependencies
5. **Implement**: Work through issues in dependency order, one at a time
6. **Commit** (`/commit`): Stage, lint, test, commit with proper messages

### When to Skip Steps

- **Trivial bug fix** (typo, off-by-one, missing null check): Skip straight to implement + commit
- **Small enhancement** (<3 files, obvious approach): `/feature-request` → implement → `/commit`
- **New block type** (table, callout, etc.): Always needs the full workflow — parser, serializer, extension, roundtrip tests, and E2E tests are all required

---

## Design Document Workflow

### Phase 1: Create Design Document

When a new feature is requested, create an Amazon-style design document:

1. Create file at `projectManager/design-docs/FEATURE-NAME.md`
2. Use the Amazon 6-pager structure (see `references/design-doc-template.md`)
3. Include all required sections with substantive content
4. Mark status as `DRAFT`

### Phase 2: Review Process

After creating the design doc:

1. Present the document to the user for review
2. Ask targeted follow-up questions about:
   - Unclear requirements
   - Technical constraints not mentioned
   - Edge cases and error handling
   - Dependencies on external systems
   - Success metrics and acceptance criteria
3. Update the document based on feedback
4. Iterate until user approves (status changes to `APPROVED`)

### Phase 3: Issue Breakdown

Once the design doc is approved:

1. Create issues directory: `projectManager/issues/FEATURE-NAME/`
2. Break the feature into smallest testable pieces
3. Number issues in implementation order (001, 002, 003...)
4. Each issue includes dependencies, tests, and acceptance criteria
5. **Bidirectional Linking:**
   - Each issue links back to its parent design doc
   - Design doc updated with "Implementation Issues" section listing all issues

---

## Issue Structure

Each issue file follows this format (see `references/issue-template.md`):

- **Title**: Clear, actionable description
- **Status**: TODO | IN_PROGRESS | BLOCKED | DONE
- **Design Doc**: Link to parent design document
- **Dependencies**: List of issue numbers this depends on
- **Description**: What needs to be built
- **Acceptance Criteria**: How to verify completion
- **Technical Notes**: Implementation guidance
- **Tests Required**: Unit and integration tests needed
- **Estimated Scope**: XS | S | M | L | XL

---

## Key Principles

### Smallest Testable Pieces

Each issue should be:
- Independently testable
- Completable in a single focused session
- Verifiable with automated tests when possible
- Clear about what "done" means

### Dependency Tracking

Issues explicitly declare dependencies:
- `depends_on: [001, 002]` - Cannot start until these complete
- `blocks: [005, 006]` - These issues wait for this one
- Dependency graph should be acyclic

### Test Requirements

Every issue specifies:
- **Unit tests**: Test the component in isolation
- **Integration tests**: Test interaction with other components
- Mark as "N/A" only when truly not applicable (e.g., documentation-only)

---

## Backlog Management

### Creating Feature Requests

When capturing new ideas:

1. **Always check for duplicates first** — Read all existing backlog items and design docs before creating
2. **Problem-first, not solution-first** — Describe what's broken, not what to build
3. **Explicit scope boundaries** — State what's in scope AND out of scope
4. **Link related items** — Connect to existing backlog items and design docs

### Evaluating Feature Batches

When brainstorming or reviewing multiple feature ideas:

1. **Generate broadly** — Start with many ideas without filtering
2. **Review critically** — Apply the Senior Engineer Review filter to each
3. **Merge aggressively** — Consolidate overlapping ideas into primitives
4. **Cut ruthlessly** — Remove anything that duplicates existing tools
5. **Prioritize by friction** — P1 for daily pain points, P2 for nice-to-haves

### Backlog Hygiene

- Review the backlog monthly — close stale items, re-prioritize based on what you've learned
- A backlog item that's been P3 for 3 months should be either promoted (if still relevant) or deleted
- When completing a design doc project, always update issue statuses and commit everything together

---

## Commands Available

- `/feature-request <title>` - Create a new backlog item with duplicate detection
- `/design-doc <feature-name>` - Create a new design document
- `/review-doc <feature-name>` - Review and iterate on a design doc
- `/create-issues <feature-name>` - Break approved doc into issues
- `/issue-status` - Show status of all design docs, backlog items, and issues
- `/commit` - Stage, lint, format, test, and commit changes with best practices

---

## Additional Resources

### Reference Files

For detailed templates and examples:
- **`references/design-doc-template.md`** - Complete Amazon-style template
- **`references/issue-template.md`** - Issue file structure
- **`references/review-questions.md`** - Questions to ask during review

### Example Files

Working examples:
- **`examples/design-doc-example.md`** - Sample completed design doc
- **`examples/issue-example.md`** - Sample issue file

### Scripts

Utility scripts:
- **`scripts/validate-design-doc.sh`** - Validate design doc structure
- **`scripts/check-dependencies.sh`** - Verify issue dependency graph
