import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

const virtualRenderingKey = new PluginKey('virtualRendering');

/**
 * Minimum number of top-level blocks before virtualization activates.
 * ~100 blocks corresponds roughly to a 500-line markdown document.
 * Below this threshold the extension is a no-op.
 */
const BLOCK_THRESHOLD = 100;

/** Extra pixels above and below the viewport to keep rendered. */
const VIEWPORT_BUFFER = 500;

/** Default estimated height for a block whose real height is unknown. */
const DEFAULT_BLOCK_HEIGHT = 28;

/**
 * Virtual rendering extension for large documents.
 *
 * Strategy:
 *  - Only activates when the document has >= BLOCK_THRESHOLD top-level blocks.
 *  - Uses `content-visibility: hidden` on off-screen top-level blocks via
 *    direct DOM styling. This tells the browser to skip layout, paint, and
 *    hit-testing for those subtrees while keeping them in the DOM (so
 *    ProseMirror's document model stays intact).
 *  - Tracks measured heights so that hidden blocks retain their space via
 *    `contain-intrinsic-size`, preventing layout shift.
 *  - Listens on the correct scroll ancestor (the VS Code webview scrolls on
 *    `document.documentElement`; we walk up to find the first scrollable
 *    ancestor, falling back to `window`).
 *  - Uses IntersectionObserver as a secondary signal to catch blocks that
 *    become visible outside of scroll events (e.g. programmatic scrolling).
 *  - Re-evaluates on content updates, resize, and scroll.
 *  - Automatically disables itself for small documents, so normal editing
 *    is completely unaffected.
 */
export const virtualRenderingExtension = Extension.create({
  name: 'virtualRendering',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: virtualRenderingKey,

        view(editorView: EditorView) {
          return new VirtualRenderingView(editorView);
        },
      }),
    ];
  },
});

// ---------------------------------------------------------------------------
// View plugin that manages visibility of top-level blocks
// ---------------------------------------------------------------------------

class VirtualRenderingView {
  private view: EditorView;
  private enabled = false;
  private rafId: number | null = null;
  private scrollRafId: number | null = null;
  private lastScrollY = -1;
  private heightCache: Map<number, number> = new Map(); // block index -> measured px height
  private observer: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private scrollContainer: Element | Window;

  constructor(view: EditorView) {
    this.view = view;
    this.scrollContainer = this.findScrollContainer();
    this.checkShouldEnable();

    // Scroll listener — always bound, but the handler early-returns when disabled
    this.scrollContainer.addEventListener('scroll', this.onScroll, { passive: true });

    // Resize observer so we re-evaluate when the viewport changes size
    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleUpdate();
    });
    this.resizeObserver.observe(view.dom);

    if (this.enabled) {
      this.activate();
    }
  }

  // -- ProseMirror view plugin interface ------------------------------------

  update() {
    const wasEnabled = this.enabled;
    this.checkShouldEnable();

    if (this.enabled && !wasEnabled) {
      this.activate();
    } else if (!this.enabled && wasEnabled) {
      this.deactivate();
    }

    if (this.enabled) {
      // Content changed — cached heights may be stale
      this.heightCache.clear();
      this.scheduleUpdate();
    }
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.scrollRafId) cancelAnimationFrame(this.scrollRafId);
    this.scrollContainer.removeEventListener('scroll', this.onScroll);
    this.teardownIntersectionObserver();
    this.resizeObserver?.disconnect();
    this.showAllBlocks();
  }

  // -----------------------------------------------------------------------
  // Enable / disable
  // -----------------------------------------------------------------------

  private checkShouldEnable() {
    this.enabled = this.view.state.doc.childCount >= BLOCK_THRESHOLD;
  }

  private activate() {
    this.setupIntersectionObserver();
    // Let ProseMirror finish rendering, then do the first visibility pass
    setTimeout(() => this.updateVisibility(), 50);
  }

  private deactivate() {
    this.teardownIntersectionObserver();
    this.showAllBlocks();
    this.heightCache.clear();
  }

  // -----------------------------------------------------------------------
  // Scroll container detection
  // -----------------------------------------------------------------------

  /**
   * Walk up from the editor DOM to find the first ancestor with scrollable
   * overflow. In VS Code webviews this is usually `document.documentElement`.
   * Falls back to `window`.
   */
  private findScrollContainer(): Element | Window {
    let el: Element | null = this.view.dom.parentElement;
    while (el) {
      const style = getComputedStyle(el);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        return el;
      }
      el = el.parentElement;
    }
    return window;
  }

  private getScrollTop(): number {
    if (this.scrollContainer instanceof Window) {
      return window.scrollY || document.documentElement.scrollTop;
    }
    return (this.scrollContainer as Element).scrollTop;
  }

  private getViewportHeight(): number {
    if (this.scrollContainer instanceof Window) {
      return window.innerHeight;
    }
    return (this.scrollContainer as Element).clientHeight;
  }

  // -----------------------------------------------------------------------
  // IntersectionObserver
  // -----------------------------------------------------------------------

  private setupIntersectionObserver() {
    if (this.observer) return;

    const root = this.scrollContainer instanceof Window ? null : (this.scrollContainer as Element);

    this.observer = new IntersectionObserver(
      (_entries) => {
        // Any intersection change means something scrolled into or out of
        // view — schedule a full recalculation.
        this.scheduleUpdate();
      },
      {
        root,
        rootMargin: `${VIEWPORT_BUFFER}px 0px ${VIEWPORT_BUFFER}px 0px`,
        threshold: 0,
      },
    );

    this.observeCurrentBlocks();
  }

  private teardownIntersectionObserver() {
    this.observer?.disconnect();
    this.observer = null;
  }

  /** (Re-)observe all current top-level block DOM nodes. */
  private observeCurrentBlocks() {
    if (!this.observer) return;
    this.observer.disconnect();
    const children = this.view.dom.children;
    for (let i = 0; i < children.length; i++) {
      this.observer.observe(children[i]);
    }
  }

  // -----------------------------------------------------------------------
  // Scroll handling
  // -----------------------------------------------------------------------

  private onScroll = () => {
    if (!this.enabled) return;
    if (this.scrollRafId) cancelAnimationFrame(this.scrollRafId);
    this.scrollRafId = requestAnimationFrame(() => {
      this.scrollRafId = null;
      this.updateVisibility();
    });
  };

  private scheduleUpdate() {
    if (this.rafId) return; // already scheduled
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (this.enabled) {
        this.updateVisibility();
        // ProseMirror may have recreated DOM nodes — re-observe
        this.observeCurrentBlocks();
      }
    });
  }

  // -----------------------------------------------------------------------
  // Core visibility update
  // -----------------------------------------------------------------------

  private updateVisibility() {
    if (!this.enabled) return;

    const scrollTop = this.getScrollTop();
    const viewportHeight = this.getViewportHeight();

    // The visible band including the buffer zone
    const visibleTop = scrollTop - VIEWPORT_BUFFER;
    const visibleBottom = scrollTop + viewportHeight + VIEWPORT_BUFFER;

    const children = this.view.dom.children;

    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      if (!child || !child.style) continue;

      const isCurrentlyHidden = child.style.contentVisibility === 'hidden';

      // Use getBoundingClientRect for accurate viewport-relative positions.
      // For hidden blocks, estimate position from cached height to avoid
      // forcing layout on the hidden subtree.
      let blockTop: number;
      let blockBottom: number;

      if (isCurrentlyHidden) {
        // The element still occupies space because of contain-intrinsic-size,
        // so getBoundingClientRect still returns meaningful values.
        const rect = child.getBoundingClientRect();
        blockTop = rect.top + scrollTop;
        blockBottom = rect.bottom + scrollTop;
      } else {
        const rect = child.getBoundingClientRect();
        blockTop = rect.top + scrollTop;
        blockBottom = rect.bottom + scrollTop;

        // Cache the real measured height while the element is fully rendered
        if (rect.height > 0) {
          this.heightCache.set(i, rect.height);
        }
      }

      const isInViewport = blockBottom >= visibleTop && blockTop <= visibleBottom;

      if (isInViewport) {
        if (isCurrentlyHidden) {
          child.style.contentVisibility = '';
          child.style.containIntrinsicSize = '';
        }
      } else {
        if (!isCurrentlyHidden) {
          const cachedHeight = this.heightCache.get(i) ?? DEFAULT_BLOCK_HEIGHT;
          child.style.contentVisibility = 'hidden';
          child.style.containIntrinsicSize = `auto ${cachedHeight}px`;
        }
      }
    }

    this.lastScrollY = scrollTop;
  }

  // -----------------------------------------------------------------------
  // Cleanup: un-hide all blocks (used when disabling or destroying)
  // -----------------------------------------------------------------------

  private showAllBlocks() {
    const children = this.view.dom.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      if (child?.style) {
        child.style.contentVisibility = '';
        child.style.containIntrinsicSize = '';
      }
    }
  }
}
