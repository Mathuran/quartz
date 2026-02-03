import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const virtualRenderingKey = new PluginKey('virtualRendering');

const BLOCK_THRESHOLD = 1000;
const VIEWPORT_BUFFER = 500; // px above and below viewport to pre-render

interface VirtualState {
  enabled: boolean;
  visibleRange: { from: number; to: number } | null;
}

/**
 * Virtual rendering extension that hides off-screen blocks for large documents.
 * Activates only when the document exceeds BLOCK_THRESHOLD top-level blocks.
 * Uses CSS visibility:hidden to hide off-screen blocks while preserving layout.
 */
export const virtualRenderingExtension = Extension.create({
  name: 'virtualRendering',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: virtualRenderingKey,

        state: {
          init(): VirtualState {
            return { enabled: false, visibleRange: null };
          },
          apply(tr, state): VirtualState {
            if (tr.docChanged) {
              const blockCount = tr.doc.childCount;
              return {
                ...state,
                enabled: blockCount > BLOCK_THRESHOLD,
              };
            }
            return state;
          },
        },

        view(editorView) {
          let rafId: number | null = null;
          let lastScrollTop = -1;

          function updateVisibility() {
            const state = virtualRenderingKey.getState(editorView.state) as VirtualState;
            if (!state?.enabled) return;

            const scrollContainer = editorView.dom.closest('.quartz-page-wrapper') || editorView.dom.parentElement;
            if (!scrollContainer) return;

            const scrollTop = scrollContainer.scrollTop;
            if (Math.abs(scrollTop - lastScrollTop) < 50) return; // skip minor scrolls
            lastScrollTop = scrollTop;

            const viewportTop = scrollTop - VIEWPORT_BUFFER;
            const viewportBottom = scrollTop + scrollContainer.clientHeight + VIEWPORT_BUFFER;

            const children = editorView.dom.children;
            for (let i = 0; i < children.length; i++) {
              const child = children[i] as HTMLElement;
              const top = child.offsetTop;
              const bottom = top + child.offsetHeight;

              if (bottom < viewportTop || top > viewportBottom) {
                child.style.visibility = 'hidden';
                child.style.contentVisibility = 'auto';
              } else {
                child.style.visibility = '';
                child.style.contentVisibility = '';
              }
            }
          }

          const onScroll = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(updateVisibility);
          };

          const scrollContainer = editorView.dom.closest('.quartz-page-wrapper') || editorView.dom.parentElement;
          scrollContainer?.addEventListener('scroll', onScroll, { passive: true });

          // Initial check
          setTimeout(updateVisibility, 100);

          return {
            update() {
              updateVisibility();
            },
            destroy() {
              if (rafId) cancelAnimationFrame(rafId);
              scrollContainer?.removeEventListener('scroll', onScroll);
            },
          };
        },
      }),
    ];
  },
});
