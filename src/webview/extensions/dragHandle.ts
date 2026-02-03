import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const dragHandleKey = new PluginKey('dragHandle');

/**
 * Creates the drag handle DOM element -- a 6-dot grip icon.
 */
function createDragHandleElement(): HTMLElement {
  const handle = document.createElement('div');
  handle.className = 'quartz-drag-handle';
  handle.setAttribute('draggable', 'true');
  handle.setAttribute('contenteditable', 'false');
  handle.setAttribute('aria-label', 'Drag to reorder');

  // 6-dot grip icon using two columns of three dots
  handle.innerHTML =
    '<svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="4" cy="4" r="1.5"/>' +
    '<circle cx="4" cy="10" r="1.5"/>' +
    '<circle cx="4" cy="16" r="1.5"/>' +
    '<circle cx="10" cy="4" r="1.5"/>' +
    '<circle cx="10" cy="10" r="1.5"/>' +
    '<circle cx="10" cy="16" r="1.5"/>' +
    '</svg>';

  return handle;
}

/**
 * Builds a DecorationSet with a widget decoration at the start of each
 * top-level block node in the document.
 */
function buildDecorations(doc: any): DecorationSet {
  const decorations: Decoration[] = [];

  doc.forEach((node: any, offset: number) => {
    decorations.push(
      Decoration.widget(offset, () => createDragHandleElement(), {
        side: -1,
        key: `drag-handle-${offset}`,
      })
    );
  });

  return DecorationSet.create(doc, decorations);
}

export const dragHandleExtension = Extension.create({
  name: 'dragHandle',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: dragHandleKey,

        state: {
          init(_, { doc }) {
            return buildDecorations(doc);
          },
          apply(tr, oldDecorations) {
            if (tr.docChanged) {
              return buildDecorations(tr.doc);
            }
            return oldDecorations;
          },
        },

        props: {
          decorations(state) {
            return dragHandleKey.getState(state);
          },

          handleDOMEvents: {
            mousedown(view, event) {
              const target = event.target as HTMLElement;
              const handle = target.closest('.quartz-drag-handle');
              if (!handle) return false;

              event.preventDefault();

              // Find which top-level node this handle belongs to.
              // Walk up from the handle to locate the block wrapper that
              // ProseMirror rendered, then resolve its position.
              const blockEl = handle.parentElement;
              if (!blockEl) return false;

              const pos = view.posAtDOM(blockEl, 0);
              if (pos == null) return false;

              // Resolve to the start of the top-level node
              const $pos = view.state.doc.resolve(pos);
              const nodePos = $pos.before($pos.depth);

              // Set a NodeSelection on the block so ProseMirror's built-in
              // drag-and-drop knows what to move.
              const tr = view.state.tr.setSelection(
                NodeSelection.create(view.state.doc, nodePos)
              );
              view.dispatch(tr);

              return false;
            },

            dragstart(view, event) {
              const target = event.target as HTMLElement;
              const handle = target.closest('.quartz-drag-handle');
              if (!handle) return false;

              // If we already have a NodeSelection (set in mousedown),
              // let ProseMirror handle the native drag with that selection.
              const { selection } = view.state;
              if (!(selection instanceof NodeSelection)) return false;

              if (event.dataTransfer) {
                // Serialize the selected node to text for the drag image
                const node = selection.node;
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', node.textContent);

                // Create a lightweight drag image from the block element
                const blockEl = handle.parentElement;
                if (blockEl) {
                  const rect = blockEl.getBoundingClientRect();
                  event.dataTransfer.setDragImage(
                    blockEl,
                    rect.width / 2,
                    rect.height / 2
                  );
                }
              }

              return false;
            },
          },
        },
      }),
    ];
  },
});
