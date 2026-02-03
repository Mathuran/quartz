import React from 'react';

interface RawBlockProps {
  content: string;
}

export function RawBlock({ content }: RawBlockProps) {
  return (
    <div className="quartz-raw-block" contentEditable={false}>
      <span className="quartz-raw-block-label">Unsupported content</span>
      <pre className="quartz-raw-block-content">{content}</pre>
    </div>
  );
}
