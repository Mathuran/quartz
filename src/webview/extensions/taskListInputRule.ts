import { Extension, InputRule } from '@tiptap/core';

/**
 * Regex for markdown task list syntax: - [ ] or - [x]
 * - ^- \[ - Start of line with "- ["
 * - ([ x]) - Captures space (unchecked) or x (checked)
 * - \] $ - Ends with "] " (the trailing space triggers the rule)
 */
const taskListRegex = /^- \[([ x])\] $/;

/**
 * Extension that adds input rules for markdown task list syntax.
 * When the user types "- [ ] " or "- [x] ", it converts to a task list item.
 */
export const taskListInputRuleExtension = Extension.create({
  name: 'taskListInputRule',

  addInputRules() {
    return [
      new InputRule({
        find: taskListRegex,
        handler: ({ state, range, match, chain }) => {
          const checked = match[1] === 'x';

          // Check if we have the necessary node types
          const taskItemType = state.schema.nodes.taskItem;
          const taskListType = state.schema.nodes.taskList;

          if (!taskItemType || !taskListType) {
            return;
          }

          // Use TipTap's chain API to create the task list
          chain()
            .deleteRange(range)
            .toggleTaskList()
            .command(({ tr, state }) => {
              // If checked, set the task item as checked
              if (checked) {
                const { selection } = state;
                const taskItem = selection.$from.node(-1);
                if (taskItem?.type.name === 'taskItem') {
                  const pos = selection.$from.before(-1);
                  tr.setNodeMarkup(pos, undefined, { ...taskItem.attrs, checked: true });
                }
              }
              return true;
            })
            .run();
        },
      }),
    ];
  },
});
