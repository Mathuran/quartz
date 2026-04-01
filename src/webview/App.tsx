import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Editor } from './Editor';
import { DiffSplitView } from './components/DiffSplitView';
import { ExternalChangeBanner } from './components/ExternalChangeBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { computeDiff } from './diff/diffEngine';
import { computeAlignment } from './diff/alignment';
import type { DiffResult, AlignedRow } from './diff/types';
import { EDITOR_THEMES } from './types';
import type { EditorConfig } from './types';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

// Expose the VS Code API on window so components like FrontmatterBanner
// can persist state via vscode.getState()/setState() without prop drilling.
(window as unknown as { vscodeApi: typeof vscode }).vscodeApi = vscode;

const scheduleIdleCallback =
  typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 0);

export function App() {
  const [content, setContent] = useState<string | null>(null);
  const [config, setConfig] = useState<EditorConfig>({
    editorTheme: 'clean',
    imageDir: './assets',
    preserveFormatting: true,
    showBlockHandles: true,
  });
  const suppressUpdateRef = useRef(false);
  const suppressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // External change pending state
  const [pendingExternalChange, setPendingExternalChange] = useState<string | null>(null);

  // Diff view state
  const [diffViewState, setDiffViewState] = useState<{
    active: boolean;
    diffResult: DiffResult | null;
    alignedRows: AlignedRow[];
    sourceLabel: string;
  }>({ active: false, diffResult: null, alignedRows: [], sourceLabel: '' });

  // Helper to set suppressUpdateRef with proper timeout cleanup
  const setSuppressUpdate = useCallback((value: boolean, delayMs?: number) => {
    if (value) {
      suppressUpdateRef.current = true;
      // Clear any previous timeout to prevent race conditions
      if (suppressTimeoutRef.current) {
        clearTimeout(suppressTimeoutRef.current);
        suppressTimeoutRef.current = null;
      }
      if (delayMs !== undefined) {
        suppressTimeoutRef.current = setTimeout(() => {
          suppressUpdateRef.current = false;
          suppressTimeoutRef.current = null;
        }, delayMs);
      }
    } else {
      suppressUpdateRef.current = false;
      if (suppressTimeoutRef.current) {
        clearTimeout(suppressTimeoutRef.current);
        suppressTimeoutRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      // Validate message has the expected shape before processing
      if (!message || typeof message.type !== 'string') return;

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
          setSuppressUpdate(true, 500);
          setContent(message.content);
          break;
        case 'externalChangeAvailable':
          // Diff review enabled: show notification banner instead of silent replace
          setPendingExternalChange(message.content as string);
          break;
        case 'insertLink':
          window.dispatchEvent(new CustomEvent('quartz:insertLink'));
          break;
        case 'triggerGitDiff':
          // Toggle: if diff is already open, close it; otherwise request diff
          setDiffViewState((prev) => {
            if (prev.active) {
              vscode.postMessage({ type: 'diffViewClosed' });
              return { active: false, diffResult: null, alignedRows: [], sourceLabel: '' };
            }
            vscode.postMessage({ type: 'requestGitDiff' });
            return prev;
          });
          break;
        case 'openDiffView': {
          const { oldContent, newContent, sourceLabel } = message as {
            oldContent: string;
            newContent: string;
            sourceLabel: string;
          };
          // Run diff computation asynchronously to avoid blocking the main thread
          scheduleIdleCallback(() => {
            const diffResult = computeDiff(oldContent, newContent);
            const alignedRows = computeAlignment(diffResult.diffs);
            // Check if there are actual changes
            if (
              diffResult.summary.added +
                diffResult.summary.removed +
                diffResult.summary.modified ===
              0
            ) {
              vscode.postMessage({ type: 'diffNoChanges' });
            } else {
              setDiffViewState({ active: true, diffResult, alignedRows, sourceLabel });
              vscode.postMessage({ type: 'diffViewOpened' });
            }
          });
          break;
        }
      }
    };

    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'ready' });

    return () => window.removeEventListener('message', handler);
  }, [setSuppressUpdate]);

  const handleUpdate = useCallback((markdown: string) => {
    if (suppressUpdateRef.current) return;
    vscode.postMessage({ type: 'update', content: markdown });
  }, []);

  const handleCloseDiff = useCallback(() => {
    setDiffViewState({ active: false, diffResult: null, alignedRows: [], sourceLabel: '' });
    vscode.postMessage({ type: 'diffViewClosed' });
  }, []);

  // External change handlers
  const handleExternalAccept = useCallback(() => {
    if (!pendingExternalChange) return;
    setSuppressUpdate(true, 500);
    setContent(pendingExternalChange);
    setPendingExternalChange(null);
    vscode.postMessage({ type: 'applyExternalChange' });
  }, [pendingExternalChange, setSuppressUpdate]);

  const handleExternalDismiss = useCallback(() => {
    setPendingExternalChange(null);
    vscode.postMessage({ type: 'dismissExternalChange' });
  }, []);

  const handleExternalViewChanges = useCallback(() => {
    if (!pendingExternalChange || !content) return;
    const pending = pendingExternalChange;
    const current = content;
    setPendingExternalChange(null);
    scheduleIdleCallback(() => {
      const diffResult = computeDiff(current, pending);
      const alignedRows = computeAlignment(diffResult.diffs);
      setDiffViewState({
        active: true,
        diffResult,
        alignedRows,
        sourceLabel: 'External change',
      });
      vscode.postMessage({ type: 'diffViewOpened' });
    });
  }, [pendingExternalChange, content]);

  const themeClass = (EDITOR_THEMES as readonly string[]).includes(config.editorTheme)
    ? config.editorTheme
    : 'clean';

  if (content === null) {
    return <div className="quartz-loading">Loading...</div>;
  }

  if (diffViewState.active && diffViewState.diffResult) {
    return (
      <div className={`quartz-app quartz-theme-${themeClass}`}>
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
    <div className={`quartz-app quartz-theme-${themeClass}`}>
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
