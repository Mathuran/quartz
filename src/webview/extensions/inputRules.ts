import { Extension, InputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

// ─── List Input Rule (ProseMirror plugin) ────────────────────────────────────
//
// Handles markdown list markers typed inside existing list items.
//
// Problem: When users press Enter in a list and then type "- Item 2" or "2. Second",
// TipTap's built-in input rules don't trigger (they only create NEW lists from paragraphs).
// This leaves the list marker as literal text: "- Item 2" instead of "Item 2".
//
// Solution: Detect when a list marker is typed at the start of a list item and strip it.

const listInputRuleKey = new PluginKey('listInputRule');

// ─── Combined Marks Input Rules ──────────────────────────────────────────────
//
// Input rules for combined bold+italic syntax.
// When the user types ***text*** or ___text___, it applies both bold and italic marks.

/**
 * Regex for combined bold+italic with asterisks: ***text***
 * - (?:^|\s) - Start of line or whitespace (non-capturing group)
 * - \*\*\* - Three asterisks to open
 * - ([^*]+) - Capture the text content (one or more non-asterisk characters)
 * - \*\*\*$ - Three asterisks at the end
 */
const boldItalicAsteriskRegex = /(?:^|\s)\*\*\*([^*]+)\*\*\*$/;

/**
 * Regex for combined bold+italic with underscores: ___text___
 */
const boldItalicUnderscoreRegex = /(?:^|\s)___([^_]+)___$/;

// ─── Task List Input Rule ────────────────────────────────────────────────────
//
// Input rule for markdown task list syntax.
// When the user types "- [ ] " or "- [x] ", it converts to a task list item.

/**
 * Regex for markdown task list syntax: - [ ] or - [x]
 * - ^- \[ - Start of line with "- ["
 * - ([ x]) - Captures space (unchecked) or x (checked)
 * - \] $ - Ends with "] " (the trailing space triggers the rule)
 */
const taskListRegex = /^- \[([ x])\] $/;

/**
 * Consolidated extension that combines list, marks, and task list input rules.
 *
 * This merges three previously separate extensions:
 * - listInputRule: Strips redundant list markers inside existing list items
 * - combinedMarksInputRule: Converts ***text*** and ___text___ to bold+italic
 * - taskListInputRule: Converts "- [ ] " and "- [x] " to task list items
 */
export const inputRulesExtension = Extension.create({
  name: 'quartzInputRules',

  // High priority to ensure combined marks rules run before Bold/Italic
  priority: 200,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: listInputRuleKey,
        props: {
          handleTextInput(view, from, to, text) {
            const { state } = view;
            const { $from } = state.selection;

            // Only apply inside list items
            const listItem = $from.node($from.depth);
            const parentOfListItem = $from.depth > 1 ? $from.node($from.depth - 1) : null;

            const isInListItem =
              listItem?.type.name === 'listItem' ||
              listItem?.type.name === 'taskItem' ||
              parentOfListItem?.type.name === 'listItem' ||
              parentOfListItem?.type.name === 'taskItem';

            if (!isInListItem) {
              return false;
            }

            // Get text content before cursor in current block
            const textBeforeCursor = $from.parent.textContent.slice(0, $from.parentOffset);
            const fullText = textBeforeCursor + text;

            // Check for bullet list marker: "- " at start of text
            const bulletMatch = fullText.match(/^[-*+]\s$/);
            if (bulletMatch) {
              // Delete the marker
              const { tr } = state;
              const startOfBlock = from - textBeforeCursor.length;
              tr.delete(startOfBlock, to);
              // Don't insert the space (which would complete "- ")
              view.dispatch(tr);
              return true;
            }

            // Check for ordered list marker: "1. ", "2. ", etc. at start of text
            const orderedMatch = fullText.match(/^\d+\.\s$/);
            if (orderedMatch) {
              // Delete the marker
              const { tr } = state;
              const startOfBlock = from - textBeforeCursor.length;
              tr.delete(startOfBlock, to);
              view.dispatch(tr);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },

  addInputRules() {
    return [
      // ── Combined bold+italic with asterisks: ***text*** ──
      new InputRule({
        find: boldItalicAsteriskRegex,
        handler: ({ state, range, match, chain }) => {
          const text = match[1];
          const fullMatch = match[0];
          const hasLeadingSpace = fullMatch.startsWith(' ');

          const boldMark = state.schema.marks.bold?.create();
          const italicMark = state.schema.marks.italic?.create();

          if (!boldMark || !italicMark) {
            chain().deleteRange(range).insertContent(text).run();
            return;
          }

          // Build the replacement content
          const content = hasLeadingSpace
            ? [' ', { type: 'text', text, marks: [{ type: 'bold' }, { type: 'italic' }] }]
            : [{ type: 'text', text, marks: [{ type: 'bold' }, { type: 'italic' }] }];

          chain().deleteRange(range).insertContent(content).run();
        },
      }),

      // ── Combined bold+italic with underscores: ___text___ ──
      new InputRule({
        find: boldItalicUnderscoreRegex,
        handler: ({ state, range, match, chain }) => {
          const text = match[1];
          const fullMatch = match[0];
          const hasLeadingSpace = fullMatch.startsWith(' ');

          const boldMark = state.schema.marks.bold?.create();
          const italicMark = state.schema.marks.italic?.create();

          if (!boldMark || !italicMark) {
            chain().deleteRange(range).insertContent(text).run();
            return;
          }

          // Build the replacement content
          const content = hasLeadingSpace
            ? [' ', { type: 'text', text, marks: [{ type: 'bold' }, { type: 'italic' }] }]
            : [{ type: 'text', text, marks: [{ type: 'bold' }, { type: 'italic' }] }];

          chain().deleteRange(range).insertContent(content).run();
        },
      }),

      // ── Task list: "- [ ] " or "- [x] " ──
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
