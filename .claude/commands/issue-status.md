---
name: issue-status
description: Show status of all issues across all features
arguments:
  - name: feature-name
    description: Optional feature name to filter issues (kebab-case)
    required: false
---

# Issue Status Report

Display the status of implementation issues by running the issue-status script.

## Instructions

1. **Run the status script**:

```bash
bash $CLAUDE_PLUGIN_ROOT/skills/project-management/scripts/issue-status.sh $ARGUMENTS.feature-name
```

If `feature-name` is not provided, omit the argument to show all features.

2. **Present the script output as-is** — it is already formatted as markdown.

3. **Add recommendations** after the script output based on the results:
   - If there are "Ready to Start" issues: suggest which to work on next (prefer smallest scope first)
   - If there are blocked issues: suggest how to unblock them
   - If there are in-progress issues: ask if the user wants to continue them
   - If all issues are done: suggest marking the feature as IMPLEMENTED
   - If any features in "Completed Features" look stale (original planning issues superseded by actual work): suggest archiving them
