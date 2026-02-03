---
name: review-doc
description: Review and iterate on a design document with follow-up questions
arguments:
  - name: feature-name
    description: Name of the feature to review (kebab-case)
    required: true
---

# Review Design Document

Conduct a thorough review of the design document for: **$ARGUMENTS.feature-name**

## Instructions

1. **Read the design document** at:
   `projectManager/design-docs/$ARGUMENTS.feature-name.md`

2. **Read the review questions guide** at:
   `projectManager/skills/project-management/references/review-questions.md`

3. **Analyze the document** for:
   - Completeness: Are all required sections present and substantive?
   - Clarity: Is the problem statement clear and compelling?
   - Specificity: Are goals measurable? Are metrics concrete?
   - Technical soundness: Is the proposed solution feasible?
   - Risk coverage: Are risks identified with mitigations?
   - Gaps: What edge cases or scenarios are missing?

4. **Ask targeted follow-up questions** based on analysis:
   - Start with the most critical gaps or ambiguities
   - Ask 2-3 questions at a time (don't overwhelm)
   - Focus on questions that affect implementation decisions
   - Reference specific sections when asking

5. **Update the document** based on user responses:
   - Incorporate new information into relevant sections
   - Add new sections if needed
   - Update the "Last Updated" date
   - Move resolved open questions to main content

6. **Iterate until approved**:
   - After each round of updates, summarize changes made
   - Ask if there are remaining concerns
   - When user is satisfied, change status to APPROVED

## Review Focus Areas

### First Pass: Requirements
- Is the problem statement customer-focused?
- Are success metrics defined?
- Are non-goals explicit enough?

### Second Pass: Technical
- Is the architecture sound?
- Are there scaling concerns?
- What about failure modes?

### Third Pass: Operations
- How will this be monitored?
- What's the rollback plan?
- Who owns this long-term?

### Final Pass: Completeness
- All open questions resolved?
- Security review complete?
- Testing strategy concrete?

## Question Templates

Use these patterns when asking questions:

**For unclear requirements:**
> "In the Goals section, you mention [X]. Could you clarify whether this means [A] or [B]? This affects the API design."

**For missing edge cases:**
> "What should happen when [scenario]? I don't see this addressed in the error handling section."

**For technical concerns:**
> "The proposed approach uses [X]. Have you considered the implications for [Y]? This could affect [Z]."

**For scope clarification:**
> "Is [feature] a P0 requirement for launch, or could it be a fast-follow? This affects the timeline estimate."

## Approval Checklist

Before changing status to APPROVED:
- [ ] Problem statement is clear and compelling
- [ ] Goals are specific and measurable
- [ ] Non-goals prevent scope creep
- [ ] Solution is detailed enough to implement
- [ ] Alternatives show thorough thinking
- [ ] Security considerations complete
- [ ] Testing strategy is actionable
- [ ] Risks have mitigations
- [ ] All open questions resolved
- [ ] User explicitly approves

## After Approval

Once the document is approved:
- Status changed to APPROVED
- Ready for `/create-issues $ARGUMENTS.feature-name`
- Document becomes the source of truth for implementation
