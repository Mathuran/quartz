import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Editor } from './Editor';
import type { EditorConfig } from './types';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; content: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Quartz editor error:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="quartz-error">
          <h3>Failed to render document</h3>
          <p>{this.state.error.message}</p>
          <p>Try opening this file with the default text editor.</p>
          <details>
            <summary>Raw content</summary>
            <pre>{this.props.content}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const [content, setContent] = useState<string | null>(null);
  // √2 Layout System: width (800px) and margin (48px) are CSS constants
  const [config, setConfig] = useState<EditorConfig>({
    theme: 'auto',
    fontFamily: 'inherit',
    fontSize: 16,
    pageLayout: true,
    imageDir: './assets',
    preserveFormatting: true,
    showBlockHandles: true,
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

  const handleUpdate = useCallback(
    (markdown: string) => {
      if (suppressUpdateRef.current) return;
      vscode.postMessage({ type: 'update', content: markdown });
    },
    []
  );

  if (content === null) {
    return <div className="quartz-loading">Loading...</div>;
  }

  return (
    <div className="quartz-app">
      <ErrorBoundary content={content}>
        <Editor
          initialContent={content}
          config={config}
          onUpdate={handleUpdate}
        />
      </ErrorBoundary>
    </div>
  );
}
