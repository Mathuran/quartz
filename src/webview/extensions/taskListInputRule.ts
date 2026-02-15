import { Extension } from '@tiptap/core';
import { InputRule } from '@tiptap/pm/inputrules';

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
        handler: ({ state, range, match }) => {
          const { tr, schema } = state;
          const checked = match[1] === 'x';

          // Check if we have the necessary node types
          const taskItemType = schema.nodes.taskItem;
          const taskListType = schema.nodes.taskList;

          if (!taskItemType || !taskListType) {
            return;
          }

          // Delete the typed text "- [ ] " or "- [x] "
          tr.delete(range.from, range.to);

          // Create a task item with a paragraph inside
          const paragraphType = schema.nodes.paragraph;
          const paragraph = paragraphType.create();
          const taskItem = taskItemType.create({ checked }, paragraph);
          const taskList = taskListType.create(null, taskItem);

          // Insert the task list
          tr.insert(range.from, taskList);

          // Position cursor inside the paragraph of the task item
          // The structure is: taskList > taskItem > paragraph
          // We want to place cursor at the start of paragraph content
          const newPos = range.from + 3; // taskList(1) + taskItem(1) + paragraph(1)
          tr.setSelection(state.selection.constructor.near(tr.doc.resolve(newPos)));
        },
      }),
    ];
  },
});
