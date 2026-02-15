import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode, ResolvedPos } from '@tiptap/pm/model';

function findTopLevelBlock(
  $pos: ResolvedPos
): { pos: number; node: ProseMirrorNode } | null {
  if ($pos.depth < 1) return null;
  const pos = $pos.before(1);
  const node = $pos.node(1);
  return { pos, node };
}

function moveBlockUp(editor: Editor): boolean {
  const { state, dispatch } = editor.view;
  const { selection, doc } = state;
  const { $from, $to } = selection;

  const startBlock = findTopLevelBlock($from);
  if (!startBlock) return false;

  const endBlock = findTopLevelBlock($to);
  if (!endBlock) return false;

  const startPos = startBlock.pos;
  const endPos = endBlock.pos + endBlock.node.nodeSize;

  const $startPos = doc.resolve(startPos);
  const indexInParent = $startPos.index(0);
  if (indexInParent === 0) return false;

  const prevBlockPos = $startPos.before(1) - 1;
  const $prevPos = doc.resolve(prevBlockPos);
  const prevBlock = findTopLevelBlock($prevPos);
  if (!prevBlock) return false;

  const movingContent = doc.slice(startPos, endPos);
  const prevContent = doc.slice(prevBlock.pos, prevBlock.pos + prevBlock.node.nodeSize);

  const tr = state.tr;
  tr.delete(startPos, endPos);
  tr.delete(prevBlock.pos, prevBlock.pos + prevBlock.node.nodeSize);
  tr.insert(prevBlock.pos, movingContent.content);
  tr.insert(prevBlock.pos + movingContent.size, prevContent.content);

  const cursorOffset = $from.pos - startPos;
  const newCursorPos = prevBlock.pos + cursorOffset;

  try {
    const $newPos = tr.doc.resolve(Math.min(newCursorPos, tr.doc.content.size - 1));
    tr.setSelection(TextSelection.near($newPos));
  } catch {
    // If we can't set selection, just let it be at the start
  }

  dispatch(tr.scrollIntoView());
  return true;
}

function moveBlockDown(editor: Editor): boolean {
  const { state, dispatch } = editor.view;
  const { selection, doc } = state;
  const { $from, $to } = selection;

  const startBlock = findTopLevelBlock($from);
  if (!startBlock) return false;

  const endBlock = findTopLevelBlock($to);
  if (!endBlock) return false;

  const startPos = startBlock.pos;
  const endPos = endBlock.pos + endBlock.node.nodeSize;

  if (endPos >= doc.content.size) return false;

  const nextBlockPos = endPos;
  const nextBlock = doc.nodeAt(nextBlockPos);
  if (!nextBlock) return false;

  const nextBlockEndPos = nextBlockPos + nextBlock.nodeSize;

  const movingContent = doc.slice(startPos, endPos);
  const nextContent = doc.slice(nextBlockPos, nextBlockEndPos);

  const tr = state.tr;
  tr.delete(nextBlockPos, nextBlockEndPos);
  tr.delete(startPos, endPos);
  tr.insert(startPos, nextContent.content);
  tr.insert(startPos + nextContent.size, movingContent.content);

  const cursorOffset = $from.pos - startPos;
  const newCursorPos = startPos + nextContent.size + cursorOffset;

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
      // Clipboard operations
      'Mod-c': () => {
        return false;
      },
      'Mod-x': () => {
        return false;
      },
      'Mod-v': () => {
        return false;
      },

      // Move block up/down
      'Alt-ArrowUp': () => moveBlockUp(this.editor),
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

      // Table editing shortcuts
      'Control-Enter': () => {
        if (!this.editor.isActive('table')) return false;
        return this.editor.commands.addRowAfter();
      },
      'Control-Shift-Enter': () => {
        if (!this.editor.isActive('table')) return false;
        return this.editor.commands.addColumnAfter();
      },
      'Control-Backspace': () => {
        if (!this.editor.isActive('table')) return false;
        return this.editor.commands.deleteRow();
      },
      'Control-Shift-Backspace': () => {
        if (!this.editor.isActive('table')) return false;
        return this.editor.commands.deleteColumn();
      },
    };
  },
});
