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

## Instructions

1. **Create the design document file** at:
   `projectManager/design-docs/$ARGUMENTS.feature-name.md`

2. **Use the Amazon 6-pager structure** from the project-management skill.
   Read the template at: `$CLAUDE_PLUGIN_ROOT/skills/project-management/references/design-doc-template.md`

3. **Gather requirements from the user** before writing:
   - Ask what problem this feature solves
   - Ask about target users and use cases
   - Ask about any technical constraints
   - Ask about timeline and priority

4. **Write substantive content** for each section:
   - Problem Statement: Clear, customer-focused description
   - Goals: Specific, measurable, prioritized (P0/P1/P2)
   - Non-Goals: Explicit scope boundaries
   - Proposed Solution: Detailed technical design
   - Alternatives: At least 2 alternatives considered
   - Security: Authentication, data protection, compliance
   - Testing: Unit, integration, and e2e strategy
   - Rollout: Phased release plan with monitoring
   - Risks: Risk matrix with mitigations

5. **Mark initial status as DRAFT**

6. **After creating**, present the document summary and ask:
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

## Next Steps

After the design doc is created, the user can:
- Use `/review-doc $ARGUMENTS.feature-name` to iterate on the design
- Use `/create-issues $ARGUMENTS.feature-name` once approved to break into tasks
