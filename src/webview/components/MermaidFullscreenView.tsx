import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ---- Icons ----

const ZoomInIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const FitIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
    <path d="M21 3l-7 7" />
    <path d="M3 21l7-7" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ---- Constants ----

const MAX_SCALE = 4;
const ZOOM_FACTOR = 1.05;

// ---- Styles ----

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 9999,
    background: 'rgba(0, 0, 0, 0.85)',
    overflow: 'hidden',
  },
  svgContainer: {
    transformOrigin: '0 0',
    cursor: 'grab',
    userSelect: 'none' as const,
  },
  svgContainerGrabbing: {
    cursor: 'grabbing',
  },
  toolbar: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    display: 'flex',
    gap: 4,
    zIndex: 10000,
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    border: 'none',
    borderRadius: 4,
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    padding: 0,
  },
  buttonHover: {
    background: 'rgba(255, 255, 255, 0.2)',
  },
  zoomLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 8px',
    height: 32,
    borderRadius: 4,
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 500,
    userSelect: 'none' as const,
    minWidth: 48,
    textAlign: 'center' as const,
  },
} as const;

// ---- Component ----

interface MermaidFullscreenViewProps {
  /** The rendered SVG HTML string */
  svg: string;
  /** Called when user closes the viewer */
  onClose: () => void;
}

export function MermaidFullscreenView({ svg, onClose }: MermaidFullscreenViewProps) {
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [initialFitDone, setInitialFitDone] = useState(false);

  // Refs for pan tracking (high-frequency, no re-renders during drag)
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const currentTranslate = useRef({ x: 0, y: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fitScaleRef = useRef(1);

  // Track which buttons are hovered
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  // Keep currentTranslate ref in sync when state changes (e.g. reset)
  useEffect(() => {
    currentTranslate.current = { x: translateX, y: translateY };
  }, [translateX, translateY]);

  // ---- Fit diagram to viewport on mount ----
  useEffect(() => {
    if (initialFitDone) return;
    const id = requestAnimationFrame(() => {
      const svgEl = svgContainerRef.current?.querySelector('svg');
      const overlay = overlayRef.current;
      if (!svgEl || !overlay) return;

      const padding = 80; // breathing room around edges
      const vw = overlay.clientWidth - padding * 2;
      const vh = overlay.clientHeight - padding * 2;
      const dw = svgEl.scrollWidth;
      const dh = svgEl.scrollHeight;

      if (dw <= 0 || dh <= 0) return;

      const fitScale = Math.min(vw / dw, vh / dh, MAX_SCALE);
      fitScaleRef.current = fitScale;

      // Center the diagram
      const scaledW = dw * fitScale;
      const scaledH = dh * fitScale;
      const tx = (overlay.clientWidth - scaledW) / 2;
      const ty = (overlay.clientHeight - scaledH) / 2;

      setScale(fitScale);
      setTranslateX(tx);
      setTranslateY(ty);
      currentTranslate.current = { x: tx, y: ty };

      if (svgContainerRef.current) {
        svgContainerRef.current.style.transform = `translate(${tx}px, ${ty}px) scale(${fitScale})`;
      }
      setInitialFitDone(true);
    });
    return () => cancelAnimationFrame(id);
  }, [initialFitDone]);

  // ---- Escape key + body scroll lock ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  // ---- Focus trap ----
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    // Focus the overlay itself so keyboard events work
    overlay.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = overlay.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab, true);
    return () => document.removeEventListener('keydown', handleTab, true);
  }, []);

  // ---- Compute min scale so diagram fits viewport height ----
  const getMinScale = useCallback(() => {
    const svgEl = svgContainerRef.current?.querySelector('svg');
    if (!svgEl) return 0.1;
    const diagramHeight = svgEl.getBoundingClientRect().height / (scale || 1);
    const viewportHeight = window.innerHeight;
    if (diagramHeight <= 0) return 0.1;
    return Math.min(1, viewportHeight / diagramHeight);
  }, [scale]);

  // ---- Zoom helpers ----
  const clampScale = useCallback(
    (s: number) => Math.min(MAX_SCALE, Math.max(getMinScale(), s)),
    [getMinScale],
  );

  const zoomIn = useCallback(() => {
    setScale((s) => clampScale(s * ZOOM_FACTOR));
  }, [clampScale]);

  const zoomOut = useCallback(() => {
    setScale((s) => clampScale(s / ZOOM_FACTOR));
  }, [clampScale]);

  const resetView = useCallback(() => {
    // Reset to initial fit-to-viewport state
    setInitialFitDone(false);
  }, []);

  // ---- Wheel zoom (toward cursor) ----
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      // Ignore pinch-to-zoom (ctrlKey wheel events from trackpad)
      if (e.ctrlKey) return;

      e.preventDefault();
      e.stopPropagation();

      const direction = e.deltaY < 0 ? 1 : -1;
      const factor = direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;

      // Capture rect and cursor position synchronously before state updater
      const overlay = overlayRef.current;
      if (!overlay) return;
      const rect = overlay.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      setScale((prevScale) => {
        const newScale = clampScale(prevScale * factor);
        if (newScale === prevScale) return prevScale;

        const tx = currentTranslate.current.x;
        const ty = currentTranslate.current.y;

        // Adjust translate so the point under the cursor stays fixed
        const ratio = newScale / prevScale;
        const newTx = cursorX - ratio * (cursorX - tx);
        const newTy = cursorY - ratio * (cursorY - ty);

        setTranslateX(newTx);
        setTranslateY(newTy);
        currentTranslate.current = { x: newTx, y: newTy };

        if (svgContainerRef.current) {
          svgContainerRef.current.style.transform = `translate(${newTx}px, ${newTy}px) scale(${newScale})`;
        }

        return newScale;
      });
    },
    [clampScale],
  );

  // ---- Pan handlers ----
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only start pan on left click, and only on the backdrop/svg area (not toolbar buttons)
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;

    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };

    if (svgContainerRef.current) {
      svgContainerRef.current.style.cursor = 'grabbing';
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;

    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };

    currentTranslate.current.x += dx;
    currentTranslate.current.y += dy;

    // Update transform directly for smooth performance (no re-render)
    if (svgContainerRef.current) {
      const { x, y } = currentTranslate.current;
      svgContainerRef.current.style.transform = `translate(${x}px, ${y}px) scale(${svgContainerRef.current.dataset.scale || '1'})`;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (svgContainerRef.current) {
      svgContainerRef.current.style.cursor = 'grab';
    }

    // Commit translate to state
    setTranslateX(currentTranslate.current.x);
    setTranslateY(currentTranslate.current.y);
  }, []);

  // ---- Backdrop click to close ----
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Close only if clicking directly on the overlay backdrop, not the SVG or toolbar
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  // Store current scale on the container so the mousemove handler can read it
  // without depending on state
  const transformStyle = `translate(${translateX}px, ${translateY}px) scale(${scale})`;

  const makeButtonStyle = (id: string): React.CSSProperties => ({
    ...styles.button,
    ...(hoveredBtn === id ? styles.buttonHover : {}),
  });

  const content = (
    <div
      ref={overlayRef}
      style={styles.overlay}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleBackdropClick}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen diagram viewer"
    >
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.zoomLabel}>{Math.round(scale * 100)}%</div>
        <button
          style={makeButtonStyle('zoom-in')}
          onMouseEnter={() => setHoveredBtn('zoom-in')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={zoomIn}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <ZoomInIcon />
        </button>
        <button
          style={makeButtonStyle('zoom-out')}
          onMouseEnter={() => setHoveredBtn('zoom-out')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={zoomOut}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <ZoomOutIcon />
        </button>
        <button
          style={makeButtonStyle('reset')}
          onMouseEnter={() => setHoveredBtn('reset')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={resetView}
          title="Fit to screen"
          aria-label="Fit to screen"
        >
          <FitIcon />
        </button>
        <button
          style={makeButtonStyle('close')}
          onMouseEnter={() => setHoveredBtn('close')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={onClose}
          title="Close (Escape)"
          aria-label="Close fullscreen view"
        >
          <CloseIcon />
        </button>
      </div>

      {/* SVG container */}
      <div
        ref={svgContainerRef}
        data-scale={scale}
        style={{
          ...styles.svgContainer,
          transform: transformStyle,
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );

  return createPortal(content, document.body);
}
