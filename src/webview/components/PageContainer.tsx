import React, { useEffect, useState, useRef } from 'react';
import type { EditorConfig } from '../types';

const PAGE_WIDTH = 900;
const NARROW_BREAKPOINT = 900;

interface PageContainerProps {
  config: EditorConfig;
  children: React.ReactNode;
}

export function PageContainer({ config, children }: PageContainerProps) {
  const [isNarrow, setIsNarrow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsNarrow(entry.contentRect.width < NARROW_BREAKPOINT);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const usePageLayout = config.pageLayout && !isNarrow;

  return (
    <div ref={containerRef} className="quartz-page-wrapper align-center">
      {usePageLayout ? (
        <div
          className="quartz-page"
          style={{
            maxWidth: `${PAGE_WIDTH}px`,
            padding: `${config.pageMargin}px`,
          }}
        >
          {children}
        </div>
      ) : (
        <div className="quartz-fluid">{children}</div>
      )}
    </div>
  );
}
