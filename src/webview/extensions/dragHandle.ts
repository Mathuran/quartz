import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state';

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
 * Walk up from target to find the direct child of the ProseMirror editor.
 */
function findTopLevelBlock(target: HTMLElement, prosemirrorEl: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = target;
  while (el && el.parentElement !== prosemirrorEl) {
    el = el.parentElement;
  }
  return el;
}

/**
 * Drag handle extension using a single floating handle element.
 *
 * Instead of using ProseMirror widget decorations (which create DOM siblings
 * of blocks and are hard to style with CSS hover), this approach appends a
 * single absolutely-positioned handle to the editor wrapper. On mousemove
 * we detect which top-level block is being hovered and reposition the handle
 * next to it.
 */
export const dragHandleExtension = Extension.create({
  name: 'dragHandle',

  addProseMirrorPlugins() {
    let handle: HTMLElement | null = null;
    let currentBlockEl: HTMLElement | null = null;
    let wrapper: HTMLElement | null = null;

    function positionHandle(blockEl: HTMLElement) {
      if (!handle || !wrapper) return;
      handle.style.display = 'flex';
      // Position relative to the wrapper using offset calculations
      const wrapperRect = wrapper.getBoundingClientRect();
      const blockRect = blockEl.getBoundingClientRect();
      handle.style.top = `${blockRect.top - wrapperRect.top + wrapper.scrollTop + 2}px`;
    }

    function hideHandle() {
      if (handle) handle.style.display = 'none';
      currentBlockEl = null;
    }

    return [
      new Plugin({
        key: dragHandleKey,

        view(editorView) {
          handle = createDragHandleElement();
          handle.style.position = 'absolute';
          handle.style.left = '8px';
          handle.style.display = 'none';
          handle.style.zIndex = '10';

          wrapper = editorView.dom.parentElement as HTMLElement;
          if (wrapper) {
            wrapper.style.position = 'relative';
            wrapper.appendChild(handle);
          }

          // Keep handle visible when mouse moves onto it
          handle.addEventListener('mouseleave', (e) => {
            const related = e.relatedTarget as HTMLElement | null;
            // Hide only if not going back to the editor
            if (!related || !related.closest('.ProseMirror')) {
              hideHandle();
            }
          });

          return {
            destroy() {
              handle?.remove();
              handle = null;
              wrapper = null;
              currentBlockEl = null;
            },
          };
        },

        props: {
          handleDOMEvents: {
            mousemove(view, event) {
              const target = event.target as HTMLElement;

              // Don't reposition if hovering the handle itself
              if (target.closest('.quartz-drag-handle')) return false;

              const blockEl = findTopLevelBlock(target, view.dom);
              if (!blockEl) {
                hideHandle();
                return false;
              }

              // Same block — skip
              if (blockEl === currentBlockEl) return false;

              currentBlockEl = blockEl;
              positionHandle(blockEl);
              return false;
            },

            mouseleave(view, event) {
              const related = (event as MouseEvent).relatedTarget as HTMLElement | null;
              // Don't hide if mouse moved onto the drag handle
              if (related?.closest('.quartz-drag-handle')) return false;
              hideHandle();
              return false;
            },

            mousedown(view, event) {
              const target = event.target as HTMLElement;
              if (!target.closest('.quartz-drag-handle')) return false;

              event.preventDefault();

              if (!currentBlockEl) return false;

              const pos = view.posAtDOM(currentBlockEl, 0);
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
              if (!target.closest('.quartz-drag-handle')) return false;

              const { selection } = view.state;
              if (!(selection instanceof NodeSelection)) return false;

              if (event.dataTransfer) {
                const node = selection.node;
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', node.textContent);

                if (currentBlockEl) {
                  const rect = currentBlockEl.getBoundingClientRect();
                  event.dataTransfer.setDragImage(
                    currentBlockEl,
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
