import React, { useEffect, useState, useRef } from 'react';
import type { EditorConfig } from '../types';

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
        <div
          className="quartz-page"
          style={{
            maxWidth: `${config.pageWidth}px`,
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
