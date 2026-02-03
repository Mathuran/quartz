---
name: issue-status
description: Show status of all issues across all features
arguments:
  - name: feature-name
    description: Optional feature name to filter issues (kebab-case)
    required: false
---

# Issue Status Report

Display the status of implementation issues.

## Instructions

1. **Scan for issues**:
   - If feature-name provided: `projectManager/issues/$ARGUMENTS.feature-name/`
   - Otherwise: `projectManager/issues/*/`

2. **For each issue file found**, extract:
   - Issue number (from filename)
   - Title (from first heading)
   - Status (from metadata)
   - Dependencies (from metadata)
   - Scope (from metadata)

3. **Generate status report** with:

### Summary Statistics
```
Total Issues: X
- TODO: X
- IN_PROGRESS: X
- BLOCKED: X
- DONE: X

Progress: XX% complete
```

### Issues by Status

**🔴 BLOCKED**
| # | Title | Blocked By | Feature |
|---|-------|------------|---------|

**🟡 IN_PROGRESS**
| # | Title | Started | Feature |
|---|-------|---------|---------|

**⚪ TODO (Ready)**
Issues with all dependencies met:
| # | Title | Scope | Feature |
|---|-------|-------|---------|

**⚪ TODO (Waiting)**
Issues waiting on dependencies:
| # | Title | Waiting On | Feature |
|---|-------|------------|---------|

**🟢 DONE**
| # | Title | Completed | Feature |
|---|-------|-----------|---------|

### Dependency Graph

Show which issues are blocking others:
```
[001] ✓ DONE
  └─> [002] 🔄 IN_PROGRESS
      └─> [005] ⏳ TODO
[003] ✓ DONE
  └─> [004] ⏳ TODO
      └─> [005] ⏳ TODO
```

### Recommendations

Based on the current status, suggest:
- What to work on next (highest priority ready issue)
- Any blocked issues that need attention
- Issues that might be parallelizable

## Output Examples

### All Features
```
📊 Project Status Report
========================

Features: 2 active
Total Issues: 15

user-data-export (8 issues)
  ✓ Done: 3 | 🔄 In Progress: 1 | ⏳ Todo: 4
  Progress: ████░░░░░░ 37%

payment-integration (7 issues)
  ✓ Done: 0 | 🔄 In Progress: 1 | ⏳ Todo: 6
  Progress: ░░░░░░░░░░ 0%

Next Actions:
1. [user-data-export/004] Implement job queue - Ready to start
2. [payment-integration/001] Still in progress, check for blockers
```

### Single Feature
```
📊 user-data-export Status
==========================

Progress: ████████░░ 75% (6/8 issues done)

✓ [001] Create database schema - DONE
✓ [002] Implement data model - DONE
✓ [003] Create API endpoints - DONE
✓ [004] Implement job queue - DONE
✓ [005] Add S3 upload - DONE
✓ [006] Write integration tests - DONE
🔄 [007] Add rate limiting - IN_PROGRESS
⏳ [008] Documentation - TODO (waiting on 007)

Blocked: None
Next: Complete [007], then [008] is ready
```

## After Status Check

Suggest next actions:
- If blocked issues: "Issue X is blocked by Y. Should we discuss unblocking?"
- If all done: "All issues complete! Ready to mark feature as IMPLEMENTED?"
- If in progress: "Continue working on X, or start Y which is now ready?"
