import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Editor } from './Editor';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { EditorConfig } from './types';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

export function App() {
  const [content, setContent] = useState<string | null>(null);
  const [config, setConfig] = useState<EditorConfig>({
    theme: 'auto',
    fontFamily: 'inherit',
    fontSize: 16,
    pageLayout: true,
    pageWidth: 816,
    pageMargin: 72,
    imageDir: './assets',
    preserveFormatting: true,
    showBlockHandles: true,
    sidebarPosition: 'left',
  });
  const suppressUpdateRef = useRef(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'loadDocument':
          setContent(message.content);
          break;
        case 'configUpdate':
          setConfig(message.config);
          break;
        case 'externalChange':
          setContent(message.content);
          break;
      }
    };

    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'ready' });

    return () => window.removeEventListener('message', handler);
  }, []);

  const handleUpdate = useCallback((markdown: string) => {
    if (suppressUpdateRef.current) return;
    vscode.postMessage({ type: 'update', content: markdown });
  }, []);

  if (content === null) {
    return <div className="quartz-loading">Loading...</div>;
  }

  return (
    <div className="quartz-app">
      <ErrorBoundary>
        <Editor initialContent={content} config={config} onUpdate={handleUpdate} />
      </ErrorBoundary>
    </div>
  );
}
