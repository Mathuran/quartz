# [003] E2E Tests + Integration Verification

## Metadata
- **Status:** DONE
- **Depends On:** 001, 002
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [editor-visual-polish](../../design-docs/editor-visual-polish.md)

## Description

After issues 001 and 002 are merged, write E2E tests that verify the preset system works end-to-end: CSS classes are applied, computed styles change per preset, and the default `clean` preset produces the expected visual properties.

## Acceptance Criteria

- [ ] E2E test: `.quartz-page` has a non-trivial `box-shadow` (not `none`)
- [ ] E2E test: `.quartz-page` background differs from `.quartz-page-wrapper` background
- [ ] E2E test: `.quartz-app` has `quartz-theme-clean` class by default
- [ ] E2E test: setting `editorTheme: "warm"` results in `quartz-theme-warm` class
- [ ] E2E test: `warm` preset applies serif `font-family` on `.quartz-editor-content`
- [ ] E2E test: `default` preset applies sans-serif font and 900px max-width
- [ ] All existing E2E tests still pass
- [ ] `npm run build` succeeds
- [ ] `npm test` passes

## Human Review Focus

- **Look at:** Test coverage — are the key preset behaviors verified?
- **Test:** Run `npm run test:e2e` and confirm all tests pass
- **Decide:** Nothing

## Agent Autonomy Notes

- **Agent can decide:** Test structure, helper functions, assertion approach
- **Escalate to human:** None

## Technical Notes

### Suggested Approach

1. Create `test/e2e/specs/theme-presets.spec.ts` in the `foundational` project group
2. Use the existing `EditorPage` page object for interactions
3. Tests should use `page.evaluate()` to check `getComputedStyle()` values
4. For preset switching tests, the E2E harness may need a way to pass config — check how existing E2E tests handle config

### Files to Modify
- `test/e2e/specs/theme-presets.spec.ts` — new test file
- `playwright.config.ts` — add new spec to appropriate project group

### Key Considerations
- E2E tests run against the harness HTML, not the full VS Code extension — config may need to be injected differently
- Focus on testing CSS class application and computed style values, not pixel-perfect rendering
- Don't test visual "beauty" — that's for human review

## Tests Required

### E2E Tests
- [ ] Default theme class applied on load
- [ ] Page shadow is non-trivial
- [ ] Page background differs from wrapper
- [ ] Preset class changes when config changes
- [ ] Serif font applied for warm/academic presets
- [ ] Max-width differs between default (900px) and clean (65ch)

## Definition of Done

- [ ] All acceptance criteria met
- [ ] E2E tests written and passing
- [ ] No regressions in existing E2E tests
- [ ] Human review completed
