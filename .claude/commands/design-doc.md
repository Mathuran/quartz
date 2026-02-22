---
name: design-doc
description: Create a new Amazon-style design document for a feature
arguments:
  - name: feature-name
    description: Name of the feature (kebab-case)
    required: true
---

# Create Design Document

Create a new Amazon-style design document for the feature: **$ARGUMENTS.feature-name**

## Scoping Model: AI-Agent-First Development

This project is built by AI coding agents that are ~10x faster than human developers. Scope and timelines should reflect this reality.

**Core principle:** The bottleneck is never writing code — it's human validation. Every scope estimate and rollout plan should be measured in **human review cycles**, not engineering days.

**What this means in practice:**
- A feature that would take a human team 2 weeks of coding takes 1-2 days of agent work
- The real timeline is driven by: how many review checkpoints are needed, how long each review takes, and how many iterations of feedback occur
- "Large" scope means many validation steps or ambiguous requirements that need human judgment — not that there's a lot of code to write
- Prefer breaking work into chunks that produce **reviewable, testable output** at each step, since that's what gates progress

**Scope sizing:**
- **XS/S:** Agent completes in one pass, 1 human review cycle
- **M:** Agent needs 2-3 passes with human review between each
- **L:** Multiple agent passes with design decisions that require human input at each stage
- **XL:** Ambiguous requirements requiring extensive human-agent dialogue to clarify before coding can begin — consider splitting

## Instructions

1. **Check for an existing backlog item** at:
   `projectManager/backlog/$ARGUMENTS.feature-name.md`
   If one exists, use it as the starting point for requirements. Skip re-asking questions the backlog item already answers.

2. **Create the design document file** at:
   `projectManager/design-docs/$ARGUMENTS.feature-name.md`

3. **Use the Amazon 6-pager structure** from the project-management skill.
   Read the template at: `.claude/skills/project-management/references/design-doc-template.md`

4. **Gather requirements from the user** before writing (skip what's already known from backlog):
   - Ask what problem this feature solves
   - Ask about target users and use cases
   - Ask about any technical constraints
   - Ask which decisions require human judgment vs. can be delegated to the agent

5. **Write substantive content** for each section:
   - Problem Statement: Clear, customer-focused description
   - Goals: Specific, measurable, prioritized (P0/P1/P2)
   - Non-Goals: Explicit scope boundaries
   - Proposed Solution: Detailed technical design
   - Alternatives: At least 2 alternatives considered
   - Security: Authentication, data protection, compliance
   - Testing: Unit, integration, and e2e strategy
   - Rollout: Phased plan structured around **human validation checkpoints**
   - Risks: Risk matrix with mitigations
   - **Human Validation Plan**: Where human review is required and what to review at each checkpoint

6. **Scope the rollout around review cycles, not coding effort:**
   - Identify the minimum set of human validation checkpoints
   - For each checkpoint, specify: what the agent produces, what the human reviews, and what "approved" looks like
   - Minimize blocking reviews — prefer async, reviewable artifacts (tests passing, screenshots, demo files)
   - Flag decisions that MUST be made by a human before the agent can proceed

7. **Mark initial status as DRAFT**

8. **After creating**, present the document summary and ask:
   - "Would you like me to explain any section in more detail?"
   - "Are there aspects of the problem I should explore further?"
   - "Should we discuss the technical approach before finalizing?"

## Quality Checklist

Before presenting the document:
- [ ] All required sections present
- [ ] Goals are measurable (include numbers)
- [ ] At least 2 alternatives discussed
- [ ] Security considerations addressed
- [ ] Testing strategy is concrete
- [ ] No vague language ("improve", "better", "as needed")
- [ ] Open questions listed with owners
- [ ] Human validation checkpoints are explicit
- [ ] Scope is expressed in review cycles, not dev-days
- [ ] Blocking human decisions are identified upfront

## Next Steps

After the design doc is created, the user can:
- Use `/review-doc $ARGUMENTS.feature-name` to iterate on the design
- Use `/create-issues $ARGUMENTS.feature-name` once approved to break into tasks
