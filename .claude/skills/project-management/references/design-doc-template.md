# Amazon-Style Design Document Template

## Document Header

```markdown
# [Feature Name] Design Document

**Author:** [Name]
**Status:** DRAFT | IN_REVIEW | APPROVED | IMPLEMENTED
**Created:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD
**Reviewers:** [List of reviewers]
```

## Required Sections

### 1. Problem Statement (1 paragraph)

Clearly articulate the problem being solved. Write from the customer's perspective.

**Key questions to answer:**
- What problem does the customer face?
- Why is this problem worth solving now?
- What is the impact of not solving it?

**Example:**
> Users currently cannot export their data in a format compatible with external analytics tools. This forces them to manually copy data, which is error-prone and time-consuming. Customer support receives 50+ tickets per month related to data export issues.

### 2. Goals and Non-Goals

**Goals** - What this project WILL accomplish:
- Be specific and measurable
- Include success metrics
- Prioritize (P0, P1, P2)

**Non-Goals** - What this project will NOT do:
- Explicitly state what's out of scope
- Prevents scope creep
- Sets clear boundaries

**Example:**
```markdown
## Goals
- P0: Enable CSV export of user data within 5 seconds for datasets up to 10MB
- P1: Support scheduled exports with email delivery
- P2: Provide export history for the last 30 days

## Non-Goals
- Real-time streaming exports (future consideration)
- Export to proprietary formats (Excel, etc.)
- Export of audit logs (separate security project)
```

### 3. Background and Context

Provide context a new team member would need:
- Historical context and previous attempts
- Related systems and how they work
- Technical constraints and dependencies
- Business context and stakeholders

### 4. Proposed Solution

**High-Level Approach:**
- Describe the solution in 2-3 paragraphs
- Explain WHY this approach over alternatives
- Include a simple architecture diagram if helpful

**Detailed Design:**
- API contracts and data models
- Component interactions
- Data flow diagrams
- Key algorithms or logic

**Example structure:**
```markdown
## Proposed Solution

### Overview
[2-3 paragraphs explaining the approach]

### Architecture
[Diagram or description of components]

### API Design
[Endpoint definitions, request/response formats]

### Data Model
[New tables, schema changes]

### Key Flows
[Sequence diagrams or flow descriptions]
```

### 5. Alternative Solutions Considered

For each alternative:
- Describe the approach
- List pros and cons
- Explain why it wasn't chosen

This demonstrates thorough thinking and pre-empts reviewer questions.

### 6. Security, Privacy, and Compliance

Address:
- Authentication and authorization
- Data encryption (at rest, in transit)
- PII handling
- Audit logging
- Compliance requirements (GDPR, SOC2, etc.)

### 7. Testing Strategy

- Unit testing approach
- Integration testing approach
- End-to-end testing scenarios
- Performance testing requirements
- Test data requirements

### 8. Rollout Plan

Structure the rollout around **human validation checkpoints**, not coding effort. The AI agent handles implementation; the human gates quality.

For each phase, define:
- **Agent delivers:** What the agent produces (code, tests, artifacts)
- **Human reviews:** What the human validates (behavior, design, edge cases)
- **Approved when:** Concrete criteria for moving to the next phase

**Example:**
```markdown
### Phase 1: Core data model and parser
- **Agent delivers:** Schema, parser implementation, 20+ unit tests all passing
- **Human reviews:** Test coverage adequacy, edge case handling, output format
- **Approved when:** Human confirms test cases cover real-world inputs

### Phase 2: UI integration
- **Agent delivers:** Component implementation, screenshot of rendered output
- **Human reviews:** Visual design, interaction feel, accessibility
- **Approved when:** Human confirms UX matches expectations
```

Additional rollout considerations:
- Feature flags strategy
- Monitoring and alerting
- Rollback plan

### 9. Human Validation Plan

Identify every point where human judgment is required. Minimize these to avoid bottlenecks, but be explicit about what cannot be delegated.

**Decision points:** Choices that require human input before the agent can proceed (e.g., "Which of these 3 API designs should we use?")

**Review checkpoints:** Points where the agent pauses for human quality review (e.g., "Review the rendered callout styles before proceeding to serialization")

**Acceptance gates:** Final validation before a phase is considered done (e.g., "Manually test the 5 core workflows and confirm they match the spec")

| Checkpoint | Agent Produces | Human Validates | Blocks |
|------------|---------------|-----------------|--------|
| ... | ... | ... | ... |

### 10. Dependencies and Risks

**Dependencies:**
- External teams or services
- Infrastructure requirements
- Decisions that block agent progress (list explicitly)

**Risks and Mitigations:**
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| ... | ... | ... | ... |

### 11. Open Questions

List unresolved questions that need input:
- Technical questions
- Product questions
- **Human decision questions** — decisions the agent cannot make autonomously

Mark each with who needs to answer. Resolve blocking questions before issuing work to the agent.

### 12. Implementation Issues

Once the design doc is approved, link to the implementation issues:

```markdown
## Implementation Issues

| # | Title | Status | Scope |
|---|-------|--------|-------|
| [001](../issues/feature-name/001-issue-title.md) | Issue Title | TODO | S |
| [002](../issues/feature-name/002-issue-title.md) | Issue Title | TODO | M |
| ... | ... | ... | ... |

**Progress:** 0/X issues complete (0%)
```

This section is automatically populated when `/create-issues` is run.

### 13. Appendix (Optional)

- Detailed calculations
- Full API specifications
- Research data
- Meeting notes

## Writing Guidelines

### Tone and Style
- Write for a skeptical but supportive reader
- Be specific, not vague ("improve performance" → "reduce p99 latency from 500ms to 100ms")
- Use data to support claims
- Acknowledge unknowns explicitly

### Length
- Target 4-6 pages of substantive content
- Appendix can be longer
- Every sentence should add value

### Review Readiness Checklist
- [ ] Problem statement is clear and compelling
- [ ] Goals are specific and measurable
- [ ] Non-goals prevent scope creep
- [ ] Solution is detailed enough to implement
- [ ] Alternatives show thorough thinking
- [ ] Security considerations addressed
- [ ] Testing strategy is concrete
- [ ] Human validation checkpoints are explicit
- [ ] Scope is expressed in review cycles, not dev-days
- [ ] Blocking human decisions are identified and resolved (or flagged)
- [ ] Risks and mitigations identified
- [ ] Open questions listed with owners
