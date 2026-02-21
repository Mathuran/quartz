---
name: feature-request
description: Create a new feature request in the backlog with duplicate detection
arguments:
  - name: title
    description: Short descriptive title for the feature request
    required: true
---

# Create Feature Request

Create a new feature request in the backlog: **$ARGUMENTS.title**

## Instructions

### Step 1: Check for Duplicates

Before creating anything, search for existing backlog items and design docs that overlap:

1. **Read all existing backlog items** in `projectManager/backlog/`
2. **Read all existing design docs** in `projectManager/design-docs/`
3. **Compare** the requested feature against existing items for overlap
4. **If a duplicate or near-duplicate exists**, report it to the user:
   - Show the matching item(s) with file path and summary
   - Ask whether to: update the existing item, merge concepts, or proceed with a new request
   - Do NOT create a new file until the user confirms

### Step 2: Gather Requirements

Ask the user these questions (skip any already answered in their initial request):

1. **What problem does this solve?** - Who experiences this problem and how often?
2. **What does success look like?** - How would a user describe the feature working correctly?
3. **Priority** - How urgent is this relative to current work?
4. **Any constraints or preferences?** - Technical limitations, UX expectations, etc.

Keep the conversation user-focused and high-level. Do NOT dive into implementation details.

### Step 3: Generate Kebab-Case ID

Convert the title to a kebab-case filename:
- `"Dark mode support"` → `dark-mode-support`
- `"Better error messages"` → `better-error-messages`

### Step 4: Create the Backlog Item

Create the file at: `projectManager/backlog/<kebab-case-id>.md`

Use this exact template:

```markdown
# <Title>

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P0 / P1 / P2 / P3           |
| **Tags**       | <comma-separated tags>       |
| **Related**    | <links to related items>     |
| **Created**    | <YYYY-MM-DD>                 |

## Problem

<1-3 paragraphs describing the user-facing problem. Who is affected? How often? What is the current workaround?>

## Desired Outcome

<What the user experience should look like when this is done. Write from the user's perspective. Be concrete — describe what the user sees, does, and feels.>

## Scope & Boundaries

**In scope:**
- <What this feature includes>

**Out of scope:**
- <What this explicitly does NOT cover>

## Open Questions

- <Unresolved questions that would need answers before creating a design doc>

## Notes

<Any additional context, references, screenshots, or links>
```

### Field Definitions

**Status** — always `BACKLOG` for new items. Other valid statuses:
- `BACKLOG` — captured, not yet planned
- `PLANNED` — approved for design doc creation
- `IN_DESIGN` — design doc in progress
- `IN_PROGRESS` — implementation underway
- `DONE` — shipped

**Priority:**
- `P0` — Critical, blocking other work or users
- `P1` — Important, should be addressed soon
- `P2` — Nice to have, do when bandwidth allows
- `P3` — Wishlist, revisit later

**Tags** — Use existing tags when possible. Common tags:
- `ux`, `performance`, `bug-adjacent`, `infrastructure`, `editor`, `parsing`, `testing`, `devex`, `accessibility`

**Related** — Link to:
- Existing design docs: `[design-doc](../design-docs/feature-name.md)`
- Existing backlog items: `[item](./other-item.md)`
- Existing issues: `[issue](../issues/feature-name/001-issue.md)`

## Quality Checklist

Before saving the file:
- [ ] Duplicate check completed against backlog and design docs
- [ ] Problem section is user-focused, not technical
- [ ] Desired outcome is concrete and observable
- [ ] Scope boundaries are explicit
- [ ] Priority is assigned with rationale
- [ ] At least one relevant tag applied
- [ ] Related items linked if any exist
- [ ] Open questions captured for anything unresolved
- [ ] Scoped enough that it could become a design doc next

## Output

After creating the backlog item, present:

1. **Summary** of what was captured
2. **Related items** found during duplicate check (if any)
3. **Next step**: "When ready to plan this, run `/design-doc <kebab-case-id>` to create a full design document."
