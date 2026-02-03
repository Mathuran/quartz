# Quartz Project

## Project Management

This project uses structured project management via the `projectManager/` folder. See `projectManager/skills/project-management/SKILL.md` for the full workflow.

### Available Commands

- `/design-doc <feature-name>` - Create an Amazon-style design document
- `/review-doc <feature-name>` - Review and iterate on a design document
- `/create-issues <feature-name>` - Break an approved design doc into numbered issues
- `/issue-status [feature-name]` - Show status of all issues

### Folder Structure

```
projectManager/
├── design-docs/           # Amazon-style design documents (one per feature)
├── issues/                # Implementation issues grouped by feature
│   └── feature-name/      # 001-issue.md, 002-issue.md, ...
└── skills/project-management/
    ├── references/        # Templates for design docs, issues, review questions
    ├── examples/          # Example design doc and issue files
    └── scripts/           # Validation scripts (validate-design-doc.sh, check-dependencies.sh)
```

### Workflow

1. **Plan**: `/design-doc feature-name` creates a comprehensive design doc (DRAFT)
2. **Review**: `/review-doc feature-name` iterates until APPROVED
3. **Break down**: `/create-issues feature-name` generates numbered implementation issues
4. **Track**: `/issue-status feature-name` shows progress and next actions
