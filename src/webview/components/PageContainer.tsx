import React, { useEffect, useState, useRef } from 'react';

interface PageContainerProps {
  children: React.ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  const [isNarrow, setIsNarrow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsNarrow(entry.contentRect.width < 900);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`quartz-page-wrapper align-center ${isNarrow ? 'quartz-narrow' : ''}`}>
      <div className="quartz-page">
        {children}
      </div>
    </div>
  );
}
