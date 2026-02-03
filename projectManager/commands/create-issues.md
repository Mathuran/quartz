---
name: create-issues
description: Break an approved design document into numbered implementation issues
arguments:
  - name: feature-name
    description: Name of the approved feature (kebab-case)
    required: true
---

# Create Implementation Issues

Break down the approved design document into implementation issues for: **$ARGUMENTS.feature-name**

## Prerequisites

1. **Verify the design document is approved**:
   - Read `projectManager/design-docs/$ARGUMENTS.feature-name.md`
   - Check that Status is APPROVED
   - If not approved, suggest using `/review-doc $ARGUMENTS.feature-name` first

2. **Read the issue template** at:
   `$CLAUDE_PLUGIN_ROOT/skills/project-management/references/issue-template.md`

## Instructions

1. **Create the issues directory**:
   `projectManager/issues/$ARGUMENTS.feature-name/`

2. **Analyze the design document** to identify:
   - Core components that need to be built
   - Logical implementation order
   - Dependencies between components
   - Testing requirements

3. **Break into smallest testable pieces**:
   - Each issue should be independently testable
   - Each issue should be completable in a single focused session
   - Prefer many small issues over few large ones
   - Scope should be S or M (rarely L, never XL)

4. **Number issues in implementation order**:
   - `001-first-thing.md`
   - `002-second-thing.md`
   - Use dependencies to enforce order when not strictly linear

5. **For each issue, include**:
   - Clear title and description
   - Dependencies (what must be done first)
   - Blocks (what waits for this)
   - Acceptance criteria (how to verify completion)
   - Technical notes (implementation guidance)
   - Tests required (unit and integration)
   - Scope estimate (XS/S/M/L/XL)

6. **Update the design doc with issue links**:
   - Add "Implementation Issues" section to the design doc
   - Include a table with: issue number, title (as link), status, scope
   - Add progress tracker (X/Y issues complete)
   - Format links as: `[001](../issues/FEATURE-NAME/001-issue-name.md)`

7. **Validate the issue set**:
   - Run dependency check: `bash $CLAUDE_PLUGIN_ROOT/skills/project-management/scripts/check-dependencies.sh projectManager/issues/$ARGUMENTS.feature-name/`
   - Ensure no circular dependencies
   - Ensure all issues are reachable
   - Verify bidirectional links (design doc ↔ issues)

## Issue Breakdown Patterns

### For API Features
1. Database schema/migrations
2. Data models and repositories
3. API endpoints
4. Input validation
5. Business logic
6. Integration tests
7. Documentation

### For UI Features
1. Component structure/layout
2. State management
3. API integration
4. User interactions
5. Error handling
6. Visual polish
7. E2E tests

### For Infrastructure
1. Configuration/setup
2. Core functionality
3. Monitoring/alerting
4. Documentation
5. Runbook

## Quality Checklist

Before presenting issues:
- [ ] Each issue is independently testable
- [ ] Dependencies form a DAG (no cycles)
- [ ] Scope is S or M for most issues
- [ ] Every issue has test requirements
- [ ] Acceptance criteria are verifiable
- [ ] Technical notes provide implementation guidance
- [ ] Each issue links to parent design doc
- [ ] Design doc updated with Implementation Issues section
- [ ] All issue links in design doc are valid

## Output Format

After creating issues, present:

1. **Summary table**:
   | # | Title | Scope | Depends On | Tests |
   |---|-------|-------|------------|-------|
   | 001 | ... | S | - | Unit, Integration |
   | 002 | ... | M | 001 | Unit |

2. **Dependency graph** (text visualization)

3. **Suggested implementation order** based on dependencies

4. **Ask for confirmation**:
   - "Does this breakdown make sense?"
   - "Should any issues be split further or combined?"
   - "Are the dependencies correct?"

## After Issue Creation

- Issues are ready to be worked on in order
- Use `/issue-status` to track progress
- Update issue status as work progresses
- Mark issues DONE when acceptance criteria met
