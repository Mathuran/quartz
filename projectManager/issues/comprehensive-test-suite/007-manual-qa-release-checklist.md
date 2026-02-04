# [007] Manual QA Release Checklist

## Metadata
- **Status:** TODO
- **Depends On:** 001, 002, 003, 005, 006
- **Blocks:** 008
- **Scope:** M
- **Design Doc:** [comprehensive-test-suite](../../design-docs/comprehensive-test-suite.md)

## Description

Create a comprehensive manual QA checklist at `test/qa/release-checklist.md` with 70+ test cases across 16 feature areas. This is the primary validation layer for all webview/UI interactions that are not covered by automated tests. The checklist is designed to be copied per release, executed by a human tester, and committed with pass/fail results.

## Acceptance Criteria

- [ ] `test/qa/release-checklist.md` exists with 70+ test cases
- [ ] All 16 feature areas from the design doc are covered
- [ ] Each test case has: ID, title, steps, expected result, pass/fail field
- [ ] Test cases are numbered by feature area (TC-01.01, TC-01.02, etc.)
- [ ] Checklist includes a header section for tester name, date, build version, and OS
- [ ] Checklist has been executed once against the current build to validate it works

## Technical Notes

### Feature Areas (from design doc §4, Layer 3)

1. **Extension Lifecycle** (5 cases)
2. **Document Loading** (5 cases)
3. **Basic Editing** (8 cases)
4. **Block Types** (13 cases)
5. **Block Input Rules** (8 cases)
6. **Slash Commands** (7 cases)
7. **Formatting Toolbar** (7 cases)
8. **Keyboard Shortcuts** (11 cases)
9. **Drag-and-Drop** (4 cases)
10. **Table Editing** (5 cases)
11. **File I/O** (5 cases)
12. **Configuration** (5 cases)
13. **Page Layout** (4 cases)
14. **Round-Trip Fidelity** (4 cases)
15. **Performance** (3 cases)
16. **Debounce Behavior** (2 cases)

### Test Case Format
```markdown
### TC-XX.YY: Title

**Steps:**
1. Do this
2. Then this

**Expected:** What should happen.

**Pass/Fail:** ___
**Notes:** ___
```

### Files to Create
- `test/qa/release-checklist.md`

### Key Considerations
- Keep steps concrete and unambiguous — a tester unfamiliar with the codebase should be able to follow them
- Include setup instructions (how to install the extension in dev mode, which test files to use)
- For keyboard shortcut tests, list both macOS and Windows/Linux variants
- For round-trip tests, provide specific fixture files to test with
- The first execution of the checklist will likely find bugs — document them as issues

## Tests Required

### Manual Testing
- [ ] Execute the full checklist once against the current build
- [ ] Document any bugs found as separate issues or notes

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Checklist executed once with results documented
- [ ] Any blocking bugs found are filed
