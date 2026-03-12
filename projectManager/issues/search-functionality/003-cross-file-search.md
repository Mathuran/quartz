# [003] Default Editor Association for Cross-File Search

## Metadata
- **Status:** DONE
- **Depends On:** 001, 002
- **Blocks:** None
- **Scope:** XS
- **Design Doc:** [search-functionality](../../design-docs/search-functionality.md)

## Description

Make VS Code's built-in `Cmd+Shift+F` search work with Quartz by setting Quartz as the default editor for `.md` files via `workbench.editorAssociations`.

The original design considered building a custom Quick Pick cross-file search with a `Cmd+Shift+F` override. This was rejected because overriding a universally known shortcut to do something different in one editor context would confuse experienced VS Code users. The root problem is simply that search results open in the text editor instead of Quartz — setting the default editor association fixes this at the source.

## Acceptance Criteria

- [ ] On first extension activation, `workbench.editorAssociations` is updated to map `*.md` → `quartz.markdownEditor`
- [ ] If the user has already configured an association for `*.md`, the existing preference is preserved (not overwritten)
- [ ] `Cmd+Shift+F` search results for `.md` files open in Quartz mode
- [ ] Users can still switch to text mode via the existing `quartz.toggleEditor` command
- [ ] No visible notification or popup when the association is set (silent setup)

## Human Review Focus

- **Test:** Open a workspace with several `.md` files. Use `Cmd+Shift+F` to search. Click a result. Does it open in Quartz?
- **Test:** Manually set a different editor association for `*.md` in VS Code settings. Reload. Confirm Quartz does not override it.
- **Look at:** Is the association set at the right scope (Global vs Workspace)?

## Agent Autonomy Notes

- **Agent can decide:** Configuration scope (Global vs Workspace), implementation placement within `extension.ts`, guard logic structure
- **Escalate to human:** If setting Global config could affect other VS Code workspaces in unexpected ways

## Technical Notes

### Suggested Approach

1. In `extension.ts` `activate()` function, call a setup function after registering the editor provider
2. Read current `workbench.editorAssociations` config
3. If `*.md` is not already mapped, add `'*.md': 'quartz.markdownEditor'`
4. Use `ConfigurationTarget.Global` so it persists across workspaces

### Files to Modify
- `src/extension.ts` — Add default editor association setup in `activate()`

### Key Considerations
- Check for both `*.md` and `**/*.md` patterns when detecting existing associations
- The `quartz.toggleEditor` command already exists for users who want text mode on a per-file basis
- This is a one-time setup; subsequent activations should detect the existing association and skip

## Tests Required

### Integration Tests
- [ ] Editor association is set after extension activation when none exists
- [ ] Editor association is NOT overwritten when user has an existing `*.md` association

### Manual Testing
- [ ] `Cmd+Shift+F` → search → click `.md` result → opens in Quartz
- [ ] Fresh VS Code install: association gets set on first activation
- [ ] User with custom `.md` association: Quartz does not override

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Integration tests written and passing
- [ ] Human review completed (see Human Review Focus above)
- [ ] No regressions in existing functionality
