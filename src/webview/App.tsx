import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Editor } from './Editor';
import { DiffSplitView } from './components/DiffSplitView';
import { ExternalChangeBanner } from './components/ExternalChangeBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { computeDiff } from './diff/diffEngine';
import { computeAlignment } from './diff/alignment';
import type { DiffResult, AlignedRow } from './diff/types';
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
    pageMargin: 72,
    imageDir: './assets',
    preserveFormatting: true,
    showBlockHandles: true,
  });
  const suppressUpdateRef = useRef(false);

  // External change pending state
  const [pendingExternalChange, setPendingExternalChange] = useState<string | null>(null);

  // Diff view state
  const [diffViewState, setDiffViewState] = useState<{
    active: boolean;
    diffResult: DiffResult | null;
    alignedRows: AlignedRow[];
    sourceLabel: string;
  }>({ active: false, diffResult: null, alignedRows: [], sourceLabel: '' });

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
        case 'scrollToHeading':
          window.dispatchEvent(
            new CustomEvent('scrollToHeadingRequest', {
              detail: { line: message.index },
            }),
          );
          break;
        case 'externalChange':
          // Suppress outbound updates while the editor processes the external
          // content — prevents the feedback loop where setContent triggers
          // onUpdate which would send the content back to the extension host.
          suppressUpdateRef.current = true;
          setContent(message.content);
          // Re-enable after the editor has finished processing the update.
          // The 500ms timeout is a safety net — even if the update flow errors,
          // user edits will not be permanently suppressed.
          setTimeout(() => {
            suppressUpdateRef.current = false;
          }, 500);
          break;
        case 'externalChangeAvailable':
          // Diff review enabled: show notification banner instead of silent replace
          setPendingExternalChange(message.content as string);
          break;
        case 'triggerGitDiff':
          vscode.postMessage({ type: 'requestGitDiff' });
          break;
        case 'openDiffView': {
          const { oldContent, newContent, sourceLabel } = message as {
            oldContent: string;
            newContent: string;
            sourceLabel: string;
          };
          const diffResult = computeDiff(oldContent, newContent);
          const alignedRows = computeAlignment(diffResult.diffs);
          // Check if there are actual changes
          if (
            diffResult.summary.added + diffResult.summary.removed + diffResult.summary.modified ===
            0
          ) {
            vscode.postMessage({ type: 'diffNoChanges' });
          } else {
            setDiffViewState({ active: true, diffResult, alignedRows, sourceLabel });
          }
          break;
        }
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

  const handleCloseDiff = useCallback(() => {
    setDiffViewState({ active: false, diffResult: null, alignedRows: [], sourceLabel: '' });
  }, []);

  // External change handlers
  const handleExternalAccept = useCallback(() => {
    if (!pendingExternalChange) return;
    suppressUpdateRef.current = true;
    setContent(pendingExternalChange);
    setPendingExternalChange(null);
    vscode.postMessage({ type: 'applyExternalChange' });
    setTimeout(() => {
      suppressUpdateRef.current = false;
    }, 500);
  }, [pendingExternalChange]);

  const handleExternalDismiss = useCallback(() => {
    setPendingExternalChange(null);
    vscode.postMessage({ type: 'dismissExternalChange' });
  }, []);

  const handleExternalViewChanges = useCallback(() => {
    if (!pendingExternalChange || !content) return;
    const diffResult = computeDiff(content, pendingExternalChange);
    const alignedRows = computeAlignment(diffResult.diffs);
    setPendingExternalChange(null);
    setDiffViewState({
      active: true,
      diffResult,
      alignedRows,
      sourceLabel: 'External change',
    });
  }, [pendingExternalChange, content]);

  if (content === null) {
    return <div className="quartz-loading">Loading...</div>;
  }

  if (diffViewState.active && diffViewState.diffResult) {
    return (
      <div className="quartz-app">
        <ErrorBoundary>
          <DiffSplitView
            diffResult={diffViewState.diffResult}
            alignedRows={diffViewState.alignedRows}
            sourceLabel={diffViewState.sourceLabel}
            onClose={handleCloseDiff}
          />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="quartz-app">
      <ErrorBoundary>
        {pendingExternalChange && (
          <ExternalChangeBanner
            onViewChanges={handleExternalViewChanges}
            onAccept={handleExternalAccept}
            onDismiss={handleExternalDismiss}
          />
        )}
        <Editor initialContent={content} config={config} onUpdate={handleUpdate} />
      </ErrorBoundary>
    </div>
  );
}
