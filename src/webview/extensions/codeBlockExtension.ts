import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { CodeBlockNodeView } from '../components/CodeBlockNodeView';

const codeBlockExitKey = new PluginKey('codeBlockExit');

/**
 * Custom CodeBlock extension that extends CodeBlockLowlight with:
 * - Exit code block when typing ``` on its own line
 *
 * This fixes the issue where closing backticks don't close the code block
 * and content leaks into it.
 *
 * Note: We use a ProseMirror plugin instead of TipTap's InputRule because
 * TipTap's input rule system explicitly skips nodes with `spec.code = true`,
 * which includes code blocks.
 */
export const CustomCodeBlockLowlight = CodeBlockLowlight.extend({
  addProseMirrorPlugins() {
    const parentPlugins = this.parent?.() || [];
    const codeBlockType = this.type;

    const exitPlugin = new Plugin({
      key: codeBlockExitKey,
      props: {
        handleTextInput(view, from, to, text) {
          // Only handle when typing a backtick
          if (text !== '`') {
            return false;
          }

          const { state } = view;
          const { $from } = state.selection;

          // Only apply if we're inside a code block
          if ($from.parent.type !== codeBlockType) {
            return false;
          }

          // Get the text content up to the cursor position
          const codeBlockStart = $from.before() + 1; // +1 to get inside the code block
          const textBeforeCursor = $from.parent.textContent.slice(0, $from.parentOffset);

          // Check if typing this backtick would complete ``` on its own line
          // We need to check if the last two characters are ``
          if (!textBeforeCursor.endsWith('``')) {
            return false;
          }

          // Find the start of the current line
          const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
          const currentLineStart = lastNewlineIndex + 1;
          const textOnCurrentLine = textBeforeCursor.slice(currentLineStart);

          // Check if the current line is exactly `` (about to become ```)
          if (textOnCurrentLine !== '``') {
            return false;
          }

          // We're about to complete ``` on its own line - exit the code block!
          const { tr } = state;

          // Calculate positions
          // Delete the `` and the newline before it (if any)
          const deleteFrom =
            lastNewlineIndex >= 0 ? codeBlockStart + lastNewlineIndex : codeBlockStart;
          const deleteTo = from; // Current cursor position (before the third `)

          // Delete the partial fence and any trailing newline
          if (deleteFrom < deleteTo) {
            tr.delete(deleteFrom, deleteTo);
          }

          // Get the updated position after the code block
          const mappedCodeBlockEnd = tr.mapping.map($from.after());

          // Insert a new paragraph after the code block
          const paragraphType = state.schema.nodes.paragraph;
          tr.insert(mappedCodeBlockEnd, paragraphType.create());

          // Move cursor to the new paragraph
          const newParagraphPos = mappedCodeBlockEnd + 1;
          tr.setSelection(TextSelection.create(tr.doc, newParagraphPos));

          view.dispatch(tr);
          return true;
        },
      },
    });

    return [...parentPlugins, exitPlugin];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },

  addKeyboardShortcuts() {
    const parentShortcuts = this.parent?.() || {};

    return {
      ...parentShortcuts,

      // Also allow Mod-Enter to exit the code block (common editor pattern)
      'Mod-Enter': () => {
        if (this.editor.isActive('codeBlock')) {
          return this.editor.commands.exitCode();
        }
        return false;
      },
    };
  },
});
