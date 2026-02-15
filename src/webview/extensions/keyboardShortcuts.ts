import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode, ResolvedPos } from '@tiptap/pm/model';

/**
 * Find the top-level block node that contains the current selection.
 * Returns the position and the node itself.
 */
function findTopLevelBlock(
  $pos: ResolvedPos
): { pos: number; node: ProseMirrorNode } | null {
  // depth 0 is the doc, depth 1 is the top-level block
  if ($pos.depth < 1) return null;

  const pos = $pos.before(1);
  const node = $pos.node(1);

  return { pos, node };
}

/**
 * Move the current block up (swap with previous sibling).
 */
function moveBlockUp(editor: Editor): boolean {
  const { state, dispatch } = editor.view;
  const { selection, doc } = state;
  const { $from, $to } = selection;

  // Find the top-level block containing the start of selection
  const startBlock = findTopLevelBlock($from);
  if (!startBlock) return false;

  // Find the top-level block containing the end of selection (for multi-block)
  const endBlock = findTopLevelBlock($to);
  if (!endBlock) return false;

  const startPos = startBlock.pos;
  const endPos = endBlock.pos + endBlock.node.nodeSize;

  // Get the resolved position at the start of our block range
  const $startPos = doc.resolve(startPos);

  // Check if there's a previous sibling (index > 0 means there's something before)
  const indexInParent = $startPos.index(0);
  if (indexInParent === 0) {
    // Already at the top of document
    return false;
  }

  // Find the previous sibling block
  const prevBlockPos = $startPos.before(1) - 1;
  const $prevPos = doc.resolve(prevBlockPos);
  const prevBlock = findTopLevelBlock($prevPos);
  if (!prevBlock) return false;

  // Calculate the content slice we want to move
  const movingContent = doc.slice(startPos, endPos);
  const prevContent = doc.slice(prevBlock.pos, prevBlock.pos + prevBlock.node.nodeSize);

  // Create the transaction to swap
  const tr = state.tr;

  // Delete the current block(s) first
  tr.delete(startPos, endPos);

  // Now delete the previous block (its position hasn't changed)
  tr.delete(prevBlock.pos, prevBlock.pos + prevBlock.node.nodeSize);

  // Insert our content at where the previous block was
  tr.insert(prevBlock.pos, movingContent.content);

  // Insert the previous block after our content
  tr.insert(prevBlock.pos + movingContent.size, prevContent.content);

  // Restore cursor position relative to the moved block
  const cursorOffset = $from.pos - startPos;
  const newCursorPos = prevBlock.pos + cursorOffset;

  // Set the selection
  try {
    const $newPos = tr.doc.resolve(Math.min(newCursorPos, tr.doc.content.size - 1));
    tr.setSelection(TextSelection.near($newPos));
  } catch {
    // If we can't set selection, just let it be at the start
  }

  dispatch(tr.scrollIntoView());
  return true;
}

/**
 * Move the current block down (swap with next sibling).
 */
function moveBlockDown(editor: Editor): boolean {
  const { state, dispatch } = editor.view;
  const { selection, doc } = state;
  const { $from, $to } = selection;

  // Find the top-level block containing the start of selection
  const startBlock = findTopLevelBlock($from);
  if (!startBlock) return false;

  // Find the top-level block containing the end of selection (for multi-block)
  const endBlock = findTopLevelBlock($to);
  if (!endBlock) return false;

  const startPos = startBlock.pos;
  const endPos = endBlock.pos + endBlock.node.nodeSize;

  // Check if there's a next sibling
  const $endPos = doc.resolve(endPos);

  // Check if we're at the last block
  if (endPos >= doc.content.size) {
    // Already at the bottom of document
    return false;
  }

  // Find the next sibling block
  const nextBlockPos = endPos;
  const nextBlock = doc.nodeAt(nextBlockPos);
  if (!nextBlock) return false;

  const nextBlockEndPos = nextBlockPos + nextBlock.nodeSize;

  // Calculate the content slices
  const movingContent = doc.slice(startPos, endPos);
  const nextContent = doc.slice(nextBlockPos, nextBlockEndPos);

  // Create the transaction to swap
  const tr = state.tr;

  // Delete the next block first (so positions don't shift for our content)
  tr.delete(nextBlockPos, nextBlockEndPos);

  // Delete our current block(s)
  tr.delete(startPos, endPos);

  // Insert the next block at where our block was
  tr.insert(startPos, nextContent.content);

  // Insert our content after the next block
  tr.insert(startPos + nextContent.size, movingContent.content);

  // Restore cursor position relative to the moved block
  const cursorOffset = $from.pos - startPos;
  const newCursorPos = startPos + nextContent.size + cursorOffset;

  // Set the selection
  try {
    const $newPos = tr.doc.resolve(Math.min(newCursorPos, tr.doc.content.size - 1));
    tr.setSelection(TextSelection.near($newPos));
  } catch {
    // If we can't set selection, just let it be at the start
  }

  dispatch(tr.scrollIntoView());
  return true;
}

export const keyboardShortcutsExtension = Extension.create({
  name: 'quartzKeyboardShortcuts',

  addKeyboardShortcuts() {
    return {
      // =========================================================
      // Clipboard operations - ensure they work in VS Code webview
      // TipTap/ProseMirror handles these by default, but we explicitly
      // define them here to ensure the shortcuts reach the editor
      // and are not intercepted by VS Code's own clipboard handling.
      // =========================================================

      // Copy: Cmd/Ctrl+C
      // Let the browser handle this - return false to allow default behavior
      'Mod-c': () => {
        // Return false to let the native clipboard handling work
        // ProseMirror's clipboard plugin will intercept the copy event
        return false;
      },

      // Cut: Cmd/Ctrl+X
      // Let the browser handle this - return false to allow default behavior
      'Mod-x': () => {
        // Return false to let the native clipboard handling work
        // ProseMirror's clipboard plugin will intercept the cut event
        return false;
      },

      // Paste: Cmd/Ctrl+V
      // Let the browser handle this - return false to allow default behavior
      'Mod-v': () => {
        // Return false to let the native clipboard handling work
        // ProseMirror's clipboard plugin will intercept the paste event
        return false;
      },

      // Move block up: Alt+ArrowUp (Option+↑ on Mac)
      'Alt-ArrowUp': () => moveBlockUp(this.editor),

      // Move block down: Alt+ArrowDown (Option+↓ on Mac)
      'Alt-ArrowDown': () => moveBlockDown(this.editor),

      // Strikethrough: Cmd/Ctrl+Shift+S
      'Mod-Shift-s': () => this.editor.chain().focus().toggleStrike().run(),

      // Link: Cmd/Ctrl+K - prompt user for URL
      'Mod-k': () => {
        const previousUrl = this.editor.getAttributes('link').href ?? '';
        const url = window.prompt('Enter URL:', previousUrl);

        if (url === null) {
          // User cancelled the prompt
          return true;
        }

        if (url === '') {
          // Empty URL removes the link
          this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
          return true;
        }

        this.editor
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: url })
          .run();

        return true;
      },

      // Heading 1: Cmd/Ctrl+Alt+1
      'Mod-Alt-1': () =>
        this.editor.chain().focus().toggleHeading({ level: 1 }).run(),

      // Heading 2: Cmd/Ctrl+Alt+2
      'Mod-Alt-2': () =>
        this.editor.chain().focus().toggleHeading({ level: 2 }).run(),

      // Heading 3: Cmd/Ctrl+Alt+3
      'Mod-Alt-3': () =>
        this.editor.chain().focus().toggleHeading({ level: 3 }).run(),

      // Bullet List: Cmd/Ctrl+Shift+8
      'Mod-Shift-8': () =>
        this.editor.chain().focus().toggleBulletList().run(),

      // Numbered List: Cmd/Ctrl+Shift+7
      'Mod-Shift-7': () =>
        this.editor.chain().focus().toggleOrderedList().run(),

      // Task List: Cmd/Ctrl+Shift+9
      'Mod-Shift-9': () =>
        this.editor.chain().focus().toggleTaskList().run(),

      // Code Block: Cmd/Ctrl+Alt+C
      'Mod-Alt-c': () =>
        this.editor.chain().focus().toggleCodeBlock().run(),

      // Blockquote: Cmd/Ctrl+Shift+.
      'Mod-Shift-.': () =>
        this.editor.chain().focus().toggleBlockquote().run(),

      // Highlight: Cmd/Ctrl+Shift+H
      'Mod-Shift-h': () =>
        this.editor.chain().focus().toggleHighlight().run(),

      // Table editing shortcuts (only work when cursor is inside a table)
      // Using Ctrl+Enter/Backspace to avoid conflicts with VS Code and table cell navigation
      // Add row below: Ctrl+Enter
      'Control-Enter': () => {
        if (!this.editor.isActive('table')) return false;
        return this.editor.commands.addRowAfter();
      },

      // Add column right: Ctrl+Shift+Enter
      'Control-Shift-Enter': () => {
        if (!this.editor.isActive('table')) return false;
        return this.editor.commands.addColumnAfter();
      },

      // Delete current row: Ctrl+Backspace
      'Control-Backspace': () => {
        if (!this.editor.isActive('table')) return false;
        return this.editor.commands.deleteRow();
      },

      // Delete current column: Ctrl+Shift+Backspace
      'Control-Shift-Backspace': () => {
        if (!this.editor.isActive('table')) return false;
        return this.editor.commands.deleteColumn();
      },
    };
  },
});
