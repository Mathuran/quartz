import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { liftListItem, sinkListItem } from '@tiptap/pm/schema-list';
import type { Selection } from '@tiptap/pm/state';
import { Fragment } from '@tiptap/pm/model';
import type { Node as ProseMirrorNode, ResolvedPos } from '@tiptap/pm/model';
interface ListItemInfo {
  depth: number;
  node: ProseMirrorNode;
  pos: number;
  index: number;
  parent: ProseMirrorNode;
  parentPos: number;
}

function findTopLevelBlock($pos: ResolvedPos): { pos: number; node: ProseMirrorNode } | null {
  if ($pos.depth < 1) return null;
  const pos = $pos.before(1);
  const node = $pos.node(1);
  return { pos, node };
}

/**
 * Walk from the resolved position's depth upward to find the closest
 * listItem or taskItem ancestor.
 */
export function findListItemAround($pos: ResolvedPos): ListItemInfo | null {
  for (let d = $pos.depth; d >= 1; d--) {
    const node = $pos.node(d);
    if (node.type.name === 'listItem' || node.type.name === 'taskItem') {
      const parent = $pos.node(d - 1);
      const parentPos = $pos.before(d - 1);
      const index = $pos.index(d - 1);
      const pos = $pos.before(d);
      return { depth: d, node, pos, index, parent, parentPos };
    }
  }
  return null;
}

type MovementContext =
  | { mode: 'list'; fromInfo: ListItemInfo; toInfo: ListItemInfo }
  | { mode: 'block' };

/**
 * Determine whether the current selection is entirely within list items
 * of the same parent list, or should fall back to block-level movement.
 */
export function getMovementContext(selection: Selection): MovementContext {
  const fromInfo = findListItemAround(selection.$from);
  const toInfo = findListItemAround(selection.$to);

  if (fromInfo && toInfo && fromInfo.parentPos === toInfo.parentPos) {
    return { mode: 'list', fromInfo, toInfo };
  }
  return { mode: 'block' };
}

/**
 * Move list item(s) up within their parent list.
 * If already at the top, escalate to block-level movement.
 */
export function moveListItemsUp(
  editor: Editor,
  fromInfo: ListItemInfo,
  toInfo: ListItemInfo,
): boolean {
  const firstIndex = fromInfo.index;

  // Boundary: first item(s) → escalate to block movement
  if (firstIndex === 0) {
    return moveBlockUp(editor);
  }

  const { state, dispatch } = editor.view;
  const { selection } = state;
  const parent = fromInfo.parent;

  // Compute the absolute start of the parent list content
  const listContentStart = fromInfo.parentPos + 1;

  // Compute positions of the previous sibling and moving items
  const prevIndex = firstIndex - 1;
  let prevStart = listContentStart;
  for (let i = 0; i < prevIndex; i++) {
    prevStart += parent.child(i).nodeSize;
  }
  const prevEnd = prevStart + parent.child(prevIndex).nodeSize;

  let movingStart = prevEnd;
  let movingEnd = movingStart;
  for (let i = firstIndex; i <= toInfo.index; i++) {
    movingEnd += parent.child(i).nodeSize;
  }

  // Build fragments from the actual nodes
  const movingNodes: ProseMirrorNode[] = [];
  for (let i = firstIndex; i <= toInfo.index; i++) {
    movingNodes.push(parent.child(i));
  }
  const prevNode = parent.child(prevIndex);

  const newContent = Fragment.from([...movingNodes, prevNode]);

  const tr = state.tr;
  tr.replaceWith(prevStart, movingEnd, newContent);

  // Restore selection — items shifted left by prevNode.nodeSize
  const shift = prevNode.nodeSize;
  try {
    const newFrom = Math.min(Math.max(selection.$from.pos - shift, 0), tr.doc.content.size);
    const newTo = Math.min(Math.max(selection.$to.pos - shift, 0), tr.doc.content.size);
    const $newFrom = tr.doc.resolve(newFrom);
    const $newTo = tr.doc.resolve(newTo);
    tr.setSelection(TextSelection.between($newFrom, $newTo));
  } catch {
    // If we can't set selection, let it be
  }

  dispatch(tr.scrollIntoView());
  return true;
}

/**
 * Move list item(s) down within their parent list.
 * If already at the bottom, escalate to block-level movement.
 */
export function moveListItemsDown(
  editor: Editor,
  fromInfo: ListItemInfo,
  toInfo: ListItemInfo,
): boolean {
  const lastIndex = toInfo.index;
  const parent = fromInfo.parent;

  // Boundary: last item(s) → escalate to block movement
  if (lastIndex >= parent.childCount - 1) {
    return moveBlockDown(editor);
  }

  const { state, dispatch } = editor.view;
  const { selection } = state;

  const listContentStart = fromInfo.parentPos + 1;

  // Compute positions
  let movingStart = listContentStart;
  for (let i = 0; i < fromInfo.index; i++) {
    movingStart += parent.child(i).nodeSize;
  }
  let movingEnd = movingStart;
  for (let i = fromInfo.index; i <= lastIndex; i++) {
    movingEnd += parent.child(i).nodeSize;
  }

  // Next sibling
  const nextIndex = lastIndex + 1;
  const nextEnd = movingEnd + parent.child(nextIndex).nodeSize;

  // Build fragments from the actual nodes
  const movingNodes: ProseMirrorNode[] = [];
  for (let i = fromInfo.index; i <= lastIndex; i++) {
    movingNodes.push(parent.child(i));
  }
  const nextNode = parent.child(nextIndex);

  const newContent = Fragment.from([nextNode, ...movingNodes]);

  const tr = state.tr;
  tr.replaceWith(movingStart, nextEnd, newContent);

  // Restore selection — items shifted right by nextNode.nodeSize
  const shift = nextNode.nodeSize;
  try {
    const newFrom = Math.min(Math.max(selection.$from.pos + shift, 0), tr.doc.content.size);
    const newTo = Math.min(Math.max(selection.$to.pos + shift, 0), tr.doc.content.size);
    const $newFrom = tr.doc.resolve(newFrom);
    const $newTo = tr.doc.resolve(newTo);
    tr.setSelection(TextSelection.between($newFrom, $newTo));
  } catch {
    // If we can't set selection, let it be
  }

  dispatch(tr.scrollIntoView());
  return true;
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

  // Restore selection — blocks shifted left by prevBlock.node.nodeSize
  const shift = prevBlock.node.nodeSize;
  try {
    const newFrom = Math.min(Math.max($from.pos - shift, 0), tr.doc.content.size);
    const newTo = Math.min(Math.max($to.pos - shift, 0), tr.doc.content.size);
    const $newFrom = tr.doc.resolve(newFrom);
    const $newTo = tr.doc.resolve(newTo);
    tr.setSelection(TextSelection.between($newFrom, $newTo));
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

  // Restore selection — blocks shifted right by nextBlock.nodeSize
  const shift = nextBlock.nodeSize;
  try {
    const newFrom = Math.min(Math.max($from.pos + shift, 0), tr.doc.content.size);
    const newTo = Math.min(Math.max($to.pos + shift, 0), tr.doc.content.size);
    const $newFrom = tr.doc.resolve(newFrom);
    const $newTo = tr.doc.resolve(newTo);
    tr.setSelection(TextSelection.between($newFrom, $newTo));
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
      // Tab / Shift-Tab: override TaskItem's global handler
      Tab: () => {
        if (this.editor.isActive('table')) return false;
        if (this.editor.isActive('taskItem')) {
          return sinkListItem(this.editor.state.schema.nodes.taskItem)(
            this.editor.state,
            this.editor.view.dispatch,
          );
        }
        if (this.editor.isActive('listItem')) {
          return sinkListItem(this.editor.state.schema.nodes.listItem)(
            this.editor.state,
            this.editor.view.dispatch,
          );
        }
        if (this.editor.isActive('codeBlock')) {
          return this.editor.commands.insertContent('  ');
        }
        return false;
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('table')) return false;
        if (this.editor.isActive('taskItem')) {
          return liftListItem(this.editor.state.schema.nodes.taskItem)(
            this.editor.state,
            this.editor.view.dispatch,
          );
        }
        if (this.editor.isActive('listItem')) {
          return liftListItem(this.editor.state.schema.nodes.listItem)(
            this.editor.state,
            this.editor.view.dispatch,
          );
        }
        return false;
      },

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

      // Move block/list-item up/down
      'Alt-ArrowUp': () => {
        const ctx = getMovementContext(this.editor.state.selection);
        if (ctx.mode === 'list') {
          return moveListItemsUp(this.editor, ctx.fromInfo, ctx.toInfo);
        }
        return moveBlockUp(this.editor);
      },
      'Alt-ArrowDown': () => {
        const ctx = getMovementContext(this.editor.state.selection);
        if (ctx.mode === 'list') {
          return moveListItemsDown(this.editor, ctx.fromInfo, ctx.toInfo);
        }
        return moveBlockDown(this.editor);
      },

      // Strikethrough: Cmd/Ctrl+Shift+S
      'Mod-Shift-s': () => this.editor.chain().focus().toggleStrike().run(),

      // Link: Cmd/Ctrl+K - open link dialog
      // Note: On VS Code, Cmd+K is intercepted as a chord prefix, so the
      // extension registers a keybinding that sends an 'insertLink' message
      // to the webview. This handler is a fallback for non-VS Code contexts.
      'Mod-k': () => {
        window.dispatchEvent(new CustomEvent('quartz:insertLink'));
        return true;
      },

      // Heading 1: Cmd/Ctrl+Alt+1
      'Mod-Alt-1': () => this.editor.chain().focus().toggleHeading({ level: 1 }).run(),

      // Heading 2: Cmd/Ctrl+Alt+2
      'Mod-Alt-2': () => this.editor.chain().focus().toggleHeading({ level: 2 }).run(),

      // Heading 3: Cmd/Ctrl+Alt+3
      'Mod-Alt-3': () => this.editor.chain().focus().toggleHeading({ level: 3 }).run(),

      // Bullet List: Cmd/Ctrl+Shift+8
      'Mod-Shift-8': () => this.editor.chain().focus().toggleBulletList().run(),

      // Numbered List: Cmd/Ctrl+Shift+7
      'Mod-Shift-7': () => this.editor.chain().focus().toggleOrderedList().run(),

      // Task List: Cmd/Ctrl+Shift+9
      'Mod-Shift-9': () => this.editor.chain().focus().toggleTaskList().run(),

      // Code Block: Cmd/Ctrl+Alt+C
      'Mod-Alt-c': () => this.editor.chain().focus().toggleCodeBlock().run(),

      // Blockquote: Cmd/Ctrl+Shift+.
      'Mod-Shift-.': () => this.editor.chain().focus().toggleBlockquote().run(),

      // Highlight: Cmd/Ctrl+Shift+H
      'Mod-Shift-h': () => this.editor.chain().focus().toggleHighlight().run(),

      // Find: Cmd/Ctrl+F
      'Mod-f': () => {
        window.dispatchEvent(new CustomEvent('quartz:openSearch', { detail: { replace: false } }));
        return true;
      },

      // Find and Replace: Cmd/Ctrl+H
      'Mod-h': () => {
        window.dispatchEvent(new CustomEvent('quartz:openSearch', { detail: { replace: true } }));
        return true;
      },

      // Table of Contents: Cmd/Ctrl+/
      'Mod-/': () => {
        window.dispatchEvent(new CustomEvent('tableOfContents', { detail: { type: 'open' } }));
        return true;
      },

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
