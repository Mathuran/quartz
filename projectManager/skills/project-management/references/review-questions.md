# Design Document Review Questions

## Purpose

During the review phase, ask targeted questions to:
1. Clarify ambiguous requirements
2. Surface hidden assumptions
3. Identify edge cases and error scenarios
4. Validate technical approach
5. Ensure completeness before implementation

## Question Categories

### Requirements Clarification

**Scope Questions:**
- What user types/roles need this feature?
- What's the expected usage volume (requests/day, data size)?
- Are there geographic or regulatory constraints?
- What's the minimum viable version vs. full vision?

**Priority Questions:**
- What's the deadline or target release?
- Are there dependencies on other projects?
- What happens if we can't deliver all goals?
- Which features are must-have vs. nice-to-have?

**Success Metrics:**
- How will we measure success?
- What's the baseline we're improving from?
- What's the target improvement percentage?
- How long after launch do we evaluate?

### Technical Deep-Dive

**Architecture Questions:**
- Why this architecture over alternatives?
- What are the scaling limits of this approach?
- How does this integrate with existing systems?
- Are there single points of failure?

**Data Questions:**
- What's the expected data volume?
- How long do we retain data?
- What's the data access pattern (read vs. write heavy)?
- How do we handle data migrations?

**Performance Questions:**
- What are the latency requirements (p50, p99)?
- What's the expected throughput?
- How do we handle traffic spikes?
- What's the degradation strategy under load?

### Edge Cases and Error Handling

**Failure Scenarios:**
- What happens if external service X is unavailable?
- How do we handle partial failures?
- What's the retry strategy?
- How do we recover from data corruption?

**Edge Cases:**
- What about empty inputs?
- What about extremely large inputs?
- What about concurrent requests?
- What about malformed data?

**User Experience During Errors:**
- What does the user see when things fail?
- How specific are error messages?
- Is there a graceful degradation path?
- How does the user recover from errors?

### Security and Compliance

**Authentication/Authorization:**
- Who can access this feature?
- How is access controlled?
- Are there admin-only functions?
- How do we audit access?

**Data Protection:**
- Is PII involved? How is it protected?
- What's the encryption strategy?
- How long is data retained?
- Can users request data deletion?

**Compliance:**
- What regulations apply (GDPR, CCPA, SOC2)?
- Do we need third-party audits?
- Are there data residency requirements?
- What documentation is needed?

### Operations and Maintenance

**Monitoring:**
- What metrics should we track?
- What alerts do we need?
- How do we detect issues proactively?
- What's the on-call impact?

**Deployment:**
- Can this be feature-flagged?
- What's the rollback plan?
- How do we do canary releases?
- What's the blast radius if something goes wrong?

**Maintenance:**
- Who owns this long-term?
- What's the expected maintenance burden?
- How do we handle versioning?
- What documentation is needed for future maintainers?

### Dependencies and Risks

**External Dependencies:**
- What external services does this depend on?
- What's our SLA with those services?
- Do we have fallback options?
- What's the cost of those dependencies?

**Internal Dependencies:**
- What teams do we need to coordinate with?
- Are there shared components we're modifying?
- What's the communication plan?
- Are there competing priorities?

**Timeline Risks:**
- What could delay this project?
- What's the critical path?
- Do we have enough expertise on the team?
- Are there knowledge silos?

## Review Conversation Flow

### Initial Review (After First Draft)

1. **Summarize Understanding**: "Let me make sure I understand the proposal..."
2. **Clarify Scope**: Ask about boundaries and non-goals
3. **Probe Alternatives**: "Why X approach over Y?"
4. **Identify Gaps**: "What happens when...?"

### Deep Dive (After Updates)

1. **Validate Changes**: Confirm previous feedback addressed
2. **Technical Drill-Down**: Ask about implementation details
3. **Edge Cases**: Walk through failure scenarios
4. **Security Review**: Cover data protection and access control

### Final Review (Before Approval)

1. **Completeness Check**: All sections filled out?
2. **Risk Assessment**: Are risks and mitigations clear?
3. **Open Questions**: Are they all resolved?
4. **Implementation Readiness**: Can someone implement from this doc?

## Red Flags to Watch For

### Vague Language
- "Improve performance" (how much?)
- "Handle errors gracefully" (how exactly?)
- "Support large datasets" (what size?)
- "Make it secure" (what specific protections?)

### Missing Sections
- No alternatives considered
- No rollback plan
- No testing strategy
- No success metrics

### Scope Creep Indicators
- "While we're at it..."
- "It would be nice to also..."
- "Future consideration" items mixed with goals
- Goals that don't trace to the problem statement

### Unrealistic Assumptions
- No error handling mentioned
- Assumes 100% availability of dependencies
- No consideration of data migrations
- No performance testing mentioned

## Question Templates

**For unclear requirements:**
> "When you say [X], do you mean [interpretation A] or [interpretation B]? This affects how we design [component]."

**For missing edge cases:**
> "What should happen when [edge case]? I don't see this addressed in the current design."

**For alternative approaches:**
> "I notice you chose [approach A]. Did you consider [approach B]? What made you prefer A?"

**For risk identification:**
> "If [dependency/assumption] fails, what's our fallback? This seems like a significant risk."

**For scope clarification:**
> "Is [feature] a P0 requirement or a nice-to-have? It affects whether we can hit [deadline]."
