# [013] Add Task List Input Rule

## Metadata
- **Status:** TODO
- **Depends On:** —
- **Blocks:** —
- **Scope:** S
- **Design Doc:** [markdown-parsing-fixes](../../design-docs/markdown-parsing-fixes.md)

## Description

The syntax `- [ ]` and `- [x]` shows as literal text in bullet points instead of rendering as interactive checkboxes. Need to add input rules to convert these patterns to task list items.

## Acceptance Criteria

- [ ] Typing `- [ ] ` (with space after) creates an unchecked task item
- [ ] Typing `- [x] ` creates a checked task item
- [ ] Checkbox is clickable to toggle state
- [ ] Clicking checkbox updates the underlying markdown on save
- [ ] Works with nested task lists
- [ ] TaskList and TaskItem extensions are properly configured

## Technical Notes

### Files to Investigate
- `src/webview/Editor.tsx` — Are TaskList/TaskItem extensions loaded?

### Suggested Approach

1. First verify extensions are loaded:

```typescript
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

// In extensions array:
TaskList,
TaskItem.configure({
  nested: true,
}),
```

2. Add input rules if not already present:

```typescript
const taskItemInputRule = new InputRule({
  find: /^- \[([ x])\] $/,
  handler: ({ state, range, match }) => {
    const checked = match[1] === 'x';
    const { tr } = state;

    // Replace with task list item
    tr.delete(range.from, range.to);
    const taskItem = state.schema.nodes.taskItem.create({ checked });
    const taskList = state.schema.nodes.taskList.create(null, taskItem);
    tr.insert(range.from, taskList);

    return tr;
  },
});
```

3. Ensure checkbox styling:

```css
.quartz-task-item {
  display: flex;
  align-items: flex-start;
}

.quartz-task-item input[type="checkbox"] {
  margin-right: 8px;
  margin-top: 4px;
}

.quartz-task-item[data-checked="true"] {
  text-decoration: line-through;
  opacity: 0.6;
}
```

### Key Considerations
- TipTap's TaskItem extension should handle checkbox clicks
- Ensure serializer outputs `- [ ]` / `- [x]` correctly
- Test nested task lists (task item containing another task list)

## Tests Required

### Unit Tests
- [ ] `- [ ] ` input rule creates unchecked task item
- [ ] `- [x] ` input rule creates checked task item
- [ ] Clicking checkbox toggles `checked` attribute
- [ ] Serializer outputs correct markdown syntax

### E2E Tests
- [ ] Type `- [ ] Task` — checkbox appears
- [ ] Click checkbox — becomes checked

### Manual Testing
- [ ] Type `- [ ] Buy groceries` — checkbox appears
- [ ] Click checkbox — gets checked, text may be strikethrough
- [ ] Save file — outputs `- [x] Buy groceries`

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Code reviewed
- [ ] Round-trip fidelity verified
- [ ] No regressions in existing functionality
