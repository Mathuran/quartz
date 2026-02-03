# Project Manager Plugin

A Claude Code plugin for CTO-style project management with Amazon-style design documents and structured issue tracking.

## Overview

This plugin teaches Claude Code how to use the `/projectManager` folder for structured feature development:

1. **Design Documents** - Amazon-style 6-pagers for feature planning
2. **Review Process** - Iterative Q&A to refine requirements
3. **Issue Breakdown** - Smallest testable pieces with dependencies
4. **Progress Tracking** - Status monitoring across features

## Folder Structure

```
projectManager/
├── design-docs/           # Amazon-style design documents
│   └── feature-name.md    # One doc per feature
├── issues/                # Implementation issues
│   └── feature-name/      # Issues grouped by feature
│       ├── 001-setup.md
│       ├── 002-implement.md
│       └── ...
└── .claude-plugin/        # Plugin configuration
```

## Commands

### `/design-doc <feature-name>`
Create a new Amazon-style design document.

```
/design-doc user-authentication
```

Creates `projectManager/design-docs/user-authentication.md` with:
- Problem Statement
- Goals & Non-Goals
- Proposed Solution
- Alternatives Considered
- Security Considerations
- Testing Strategy
- Rollout Plan
- Risks & Mitigations

### `/review-doc <feature-name>`
Review and iterate on a design document.

```
/review-doc user-authentication
```

Conducts a thorough review asking:
- Requirements clarification questions
- Technical deep-dive questions
- Edge case and error handling questions
- Security and compliance questions

Updates the document based on responses until approved.

### `/create-issues <feature-name>`
Break an approved design document into numbered issues.

```
/create-issues user-authentication
```

Creates `projectManager/issues/user-authentication/` with:
- Numbered issues in implementation order
- Dependencies between issues
- Acceptance criteria for each
- Test requirements (unit + integration)

### `/issue-status [feature-name]`
Show status of all issues or a specific feature.

```
/issue-status                    # All features
/issue-status user-authentication  # Specific feature
```

Shows:
- Progress percentage
- Issues by status (TODO, IN_PROGRESS, BLOCKED, DONE)
- Dependency graph
- Recommended next actions

## Hooks

The plugin includes hooks that automatically:

### SessionStart
- Loads project context (design docs, issues, progress)
- Surfaces draft documents and blocked issues

### UserPromptSubmit
- Detects feature requests
- Suggests using `/design-doc` for new features

### PreToolUse (Write/Edit)
- Validates design doc structure when writing to `design-docs/`
- Validates issue structure when writing to `issues/`

### Stop
- Verifies design docs are complete before ending session
- Checks issues have acceptance criteria and tests

## Workflow

### 1. Feature Request
User: "I want to add user data export functionality"

Claude suggests: "This sounds like a feature that would benefit from a design document. Would you like me to create one using `/design-doc user-data-export`?"

### 2. Design Document Creation
```
/design-doc user-data-export
```

Claude:
- Asks clarifying questions about requirements
- Creates comprehensive design document
- Marks status as DRAFT

### 3. Review & Iteration
```
/review-doc user-data-export
```

Claude:
- Reviews document for completeness
- Asks targeted follow-up questions
- Updates document based on responses
- Changes status to APPROVED when ready

### 4. Issue Breakdown
```
/create-issues user-data-export
```

Claude:
- Analyzes approved design doc
- Creates numbered issues (001, 002, ...)
- Establishes dependencies
- Includes tests for each issue

### 5. Implementation
Work through issues in order:
- Check `/issue-status` for what's ready
- Update status as you complete work
- Dependencies auto-unlock next issues

## Issue Structure

Each issue includes:

```markdown
# [001] Issue Title

## Metadata
- **Status:** TODO | IN_PROGRESS | BLOCKED | DONE
- **Design Doc:** [feature-name](../../design-docs/feature-name.md)
- **Depends On:** [list of issue numbers]
- **Blocks:** [list of issue numbers]
- **Scope:** XS | S | M | L | XL

## Description
[What needs to be built]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Notes
[Implementation guidance]

## Tests Required
### Unit Tests
- [ ] Test case 1

### Integration Tests
- [ ] Test case 1
```

## Design Doc Structure

Based on Amazon's 6-pager format:

1. **Problem Statement** - Customer-focused problem description
2. **Goals & Non-Goals** - Specific, measurable, prioritized
3. **Background** - Context and previous attempts
4. **Proposed Solution** - Detailed technical design
5. **Alternatives** - Other approaches considered
6. **Security** - Auth, data protection, compliance
7. **Testing** - Unit, integration, e2e strategy
8. **Rollout** - Phased release plan
9. **Dependencies & Risks** - Risk matrix with mitigations
10. **Open Questions** - Unresolved items with owners
11. **Implementation Issues** - Links to all related issues (added by `/create-issues`)

## Bidirectional Linking

Design docs and issues are linked in both directions:

**Design Doc → Issues:**
```markdown
## Implementation Issues

| # | Title | Status | Scope |
|---|-------|--------|-------|
| [001](../issues/feature-name/001-setup.md) | Setup Database | DONE | S |
| [002](../issues/feature-name/002-api.md) | Create API | TODO | M |

**Progress:** 1/2 issues complete (50%)
```

**Issue → Design Doc:**
```markdown
## Metadata
- **Design Doc:** [feature-name](../../design-docs/feature-name.md)
```

This allows easy navigation between planning documents and implementation tasks.

## Installation

1. Copy the `projectManager` folder to your project root
2. Add to your Claude Code settings:
   ```json
   {
     "plugins": [
       "./projectManager"
     ]
   }
   ```
3. Restart Claude Code

## Customization

### Modify Templates
Edit the reference files in `skills/project-management/references/`:
- `design-doc-template.md` - Design document structure
- `issue-template.md` - Issue file format
- `review-questions.md` - Questions asked during review

### Adjust Hooks
Modify `hooks/hooks.json` to:
- Change when hooks trigger
- Adjust validation prompts
- Add new automation
