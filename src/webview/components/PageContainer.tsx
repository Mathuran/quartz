import React, { useEffect, useState, useRef } from 'react';
import type { EditorConfig } from '../types';

interface PageContainerProps {
  config: EditorConfig;
  children: React.ReactNode;
}

/**
 * PageContainer - √2 Layout System
 *
 * Uses fixed 800px content width based on √2 (Lichtenberg) ratio.
 * Width and margins are defined in CSS variables, not props.
 *
 * - Content width: 800px (viewport ÷ √2 at ~1132px)
 * - Prose margin: 48px (content ÷ √2⁴)
 * - Prose width: 704px (content - margins)
 */
export function PageContainer({ config, children }: PageContainerProps) {
  const [isNarrow, setIsNarrow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Switch to fluid layout below 600px
        setIsNarrow(entry.contentRect.width < 600);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const usePageLayout = config.pageLayout && !isNarrow;

  return (
    <div ref={containerRef} className="quartz-page-wrapper">
      {usePageLayout ? (
        // Page layout: 800px width, 48px padding (all from CSS variables)
        <div className="quartz-page">
          {children}
        </div>
      ) : (
        // Fluid layout for narrow viewports
        <div className="quartz-fluid">{children}</div>
      )}
    </div>
  );
}
