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

## Scoping Model: AI-Agent-First Development

Issues are executed by AI coding agents that are ~10x faster than human developers. The bottleneck is never writing code — it's human validation.

**How this changes issue breakdown:**
- **Scope** is measured in human review cycles, not hours of coding
- **Issue boundaries** should be drawn at natural **human validation points** — where a human needs to review, approve, or make a judgment call before proceeding
- **Batch agent work between reviews** — group related code changes that can be validated together into a single issue, even if a human would split them into separate tasks
- **Never split purely mechanical work** — if an agent can do steps A, B, and C without human input between them, that's one issue, not three
- **Always split at decision points** — if step B requires a human choice before step C can begin, those are separate issues

**The question for each issue boundary is:** "Does the human need to see and approve this output before the agent continues?"

## Prerequisites

1. **Verify the design document is approved**:
   - Read `projectManager/design-docs/$ARGUMENTS.feature-name.md`
   - Check that Status is APPROVED
   - If not approved, suggest using `/review-doc $ARGUMENTS.feature-name` first

2. **Read the issue template** at:
   `$CLAUDE_PLUGIN_ROOT/skills/project-management/references/issue-template.md`

3. **Read the Human Validation Plan** from the design doc:
   - Use the validation checkpoints as the primary guide for issue boundaries
   - Each checkpoint typically maps to one or more issues

## Instructions

1. **Create the issues directory**:
   `projectManager/issues/$ARGUMENTS.feature-name/`

2. **Analyze the design document** to identify:
   - Human validation checkpoints from the design doc
   - Core components that need to be built
   - Decision points where human judgment is required
   - Natural review boundaries (where a human can meaningfully evaluate output)

3. **Break into issues at human validation boundaries**:
   - Each issue ends with a **reviewable artifact** — tests passing, visible UI, working behavior
   - An agent should be able to complete each issue **without needing human input mid-issue**
   - If the agent will need to ask a human a question partway through, split there
   - Prefer fewer, larger issues over many tiny ones — agent speed means granularity is less valuable than clear review points

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
   - Scope estimate (XS/S/M/L — see definitions below)
   - **Human review focus**: what specifically the human should validate when this issue is done
   - **Agent autonomy notes**: decisions the agent can make vs. must escalate

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

## Issue Breakdown Patterns (Agent-First)

### For UI Features
1. Core data model + parser + tests (agent validates with tests)
2. UI component + visual output (human reviews look and feel)
3. Interactions + keyboard shortcuts (human reviews UX)
4. Edge cases + polish (human does final acceptance)

### For API Features
1. Schema + models + repository + tests (agent validates with tests)
2. Endpoints + validation + integration tests (human reviews API contract)
3. Business logic + edge cases (human reviews behavior)

### For Infrastructure
1. Configuration + core functionality + tests (agent validates with tests)
2. Integration + monitoring (human reviews operational readiness)

**Pattern:** Agent runs until it produces something a human needs to see. That's the issue boundary.

## Scope Definitions (Review-Cycle Based)

**XS:** Agent completes in one pass. Human review is a quick sanity check (< 5 min). Example: config change, simple rename across files.

**S:** Agent completes in one pass. Human review takes 5-15 min to validate output. Example: new utility function with tests, straightforward UI component.

**M:** Agent may need 1-2 internal iterations. Human review takes 15-30 min and may require one round of feedback. Example: feature component with interactions, new parser extension.

**L:** Agent needs multiple passes. Human review involves testing behavior, not just reading code. May need 1-2 rounds of feedback. Example: complex interactive feature, new subsystem. Consider splitting if there's a natural review point in the middle.

**XL:** Do not create XL issues. If the scope feels XL, find the human validation point in the middle and split there.

## Quality Checklist

Before presenting issues:
- [ ] Issue boundaries align with human validation points
- [ ] Each issue produces a reviewable artifact (tests, UI, behavior)
- [ ] No issue requires human input mid-execution
- [ ] Dependencies form a DAG (no cycles)
- [ ] Scope is S or M for most issues
- [ ] Every issue has test requirements
- [ ] Acceptance criteria are verifiable
- [ ] Human review focus is specified per issue
- [ ] Each issue links to parent design doc
- [ ] Design doc updated with Implementation Issues section
- [ ] All issue links in design doc are valid

## Output Format

After creating issues, present:

1. **Summary table**:
   | # | Title | Scope | Depends On | Human Reviews |
   |---|-------|-------|------------|---------------|
   | 001 | ... | S | - | Tests pass, output format correct |
   | 002 | ... | M | 001 | Visual design, interaction UX |

2. **Dependency graph** (text visualization)

3. **Suggested implementation order** based on dependencies

4. **Review effort estimate**: Total number of human review cycles and estimated review time

5. **Ask for confirmation**:
   - "Does this breakdown make sense?"
   - "Are the human review points at the right boundaries?"
   - "Should any issues be split further or combined?"

## After Issue Creation

- Issues are ready to be worked on in order
- Use `/issue-status` to track progress
- Agent executes each issue autonomously, then pauses for human review
- Human reviews, provides feedback, and marks DONE or requests changes
- Update issue status as work progresses
