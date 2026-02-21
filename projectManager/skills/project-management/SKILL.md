---
name: Project Management
description: This skill should be used when the user asks to "create a design doc", "write a design document", "plan a feature", "create an issue", "split into issues", "review design", "create project plan", "amazon style doc", "6-pager", "start a new feature", "break down tasks", or mentions design documents, feature planning, issue creation, or project management workflows. Provides CTO-style project management with Amazon-style design docs and structured issue tracking.
version: 1.0.0
---

# Project Management Skill

## Overview

This skill enables CTO-style project management workflows using the `/projectManager` folder structure. It supports Amazon-style design documents, structured review processes, and systematic issue breakdown.

## Folder Structure

The projectManager folder uses this structure:

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

## Commands Available

- `/feature-request <title>` - Create a new backlog item with duplicate detection
- `/design-doc <feature-name>` - Create a new design document
- `/review-doc <feature-name>` - Review and iterate on a design doc
- `/create-issues <feature-name>` - Break approved doc into issues
- `/issue-status` - Show status of all issues

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
