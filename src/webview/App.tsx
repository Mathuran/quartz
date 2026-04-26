import React, { useEffect, useReducer, useCallback, useRef } from 'react';
import { Editor } from './Editor';
import { DiffSplitView } from './components/DiffSplitView';
import { ExternalChangeBanner } from './components/ExternalChangeBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { computeDiff } from './diff/diffEngine';
import { computeAlignment } from './diff/alignment';
import type { DiffResult, AlignedRow } from './diff/types';
import { EDITOR_THEMES } from './types';
import type { EditorConfig, VsCodeApi } from './types';

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

// Expose the VS Code API on window so components like FrontmatterBanner
// can persist state via vscode.getState()/setState() without prop drilling.
(window as unknown as { vscodeApi: typeof vscode }).vscodeApi = vscode;

const scheduleIdleCallback =
  typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 0);

interface AppState {
  content: string | null;
  config: EditorConfig;
  pendingExternalChange: string | null;
  diffViewState: {
    active: boolean;
    diffResult: DiffResult | null;
    alignedRows: AlignedRow[];
    sourceLabel: string;
  };
}

type AppAction =
  | { type: 'LOAD_DOCUMENT'; content: string }
  | { type: 'CONFIG_UPDATE'; config: EditorConfig }
  | { type: 'EXTERNAL_CHANGE'; content: string }
  | { type: 'EXTERNAL_CHANGE_AVAILABLE'; content: string }
  | { type: 'ACCEPT_EXTERNAL_CHANGE'; content: string }
  | { type: 'DISMISS_EXTERNAL_CHANGE' }
  | { type: 'OPEN_DIFF'; diffResult: DiffResult; alignedRows: AlignedRow[]; sourceLabel: string }
  | { type: 'CLOSE_DIFF' }
  | { type: 'TOGGLE_DIFF_REQUEST' };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_DOCUMENT':
      return { ...state, content: action.content };
    case 'CONFIG_UPDATE':
      return { ...state, config: action.config };
    case 'EXTERNAL_CHANGE':
      return { ...state, content: action.content };
    case 'EXTERNAL_CHANGE_AVAILABLE':
      return { ...state, pendingExternalChange: action.content };
    case 'ACCEPT_EXTERNAL_CHANGE':
      return { ...state, content: action.content, pendingExternalChange: null };
    case 'DISMISS_EXTERNAL_CHANGE':
      return { ...state, pendingExternalChange: null };
    case 'OPEN_DIFF':
      return {
        ...state,
        diffViewState: {
          active: true,
          diffResult: action.diffResult,
          alignedRows: action.alignedRows,
          sourceLabel: action.sourceLabel,
        },
      };
    case 'CLOSE_DIFF':
      return {
        ...state,
        diffViewState: { active: false, diffResult: null, alignedRows: [], sourceLabel: '' },
      };
    case 'TOGGLE_DIFF_REQUEST':
      if (state.diffViewState.active) {
        return {
          ...state,
          diffViewState: { active: false, diffResult: null, alignedRows: [], sourceLabel: '' },
        };
      }
      return state;
    default:
      return state;
  }
}

const initialAppState: AppState = {
  content: null,
  config: {
    editorTheme: 'clean',
    imageDir: './assets',
    preserveFormatting: true,
    showBlockHandles: true,
  },
  pendingExternalChange: null,
  diffViewState: { active: false, diffResult: null, alignedRows: [], sourceLabel: '' },
};

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const { content, config, pendingExternalChange, diffViewState } = state;
  const suppressUpdateRef = useRef(false);
  const suppressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          dispatch({ type: 'LOAD_DOCUMENT', content: message.content });
          break;
        case 'configUpdate':
          dispatch({ type: 'CONFIG_UPDATE', config: message.config });
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
          dispatch({ type: 'EXTERNAL_CHANGE', content: message.content });
          break;
        case 'externalChangeAvailable':
          // Diff review enabled: show notification banner instead of silent replace
          dispatch({ type: 'EXTERNAL_CHANGE_AVAILABLE', content: message.content as string });
          break;
        case 'insertLink':
          window.dispatchEvent(new CustomEvent('quartz:insertLink'));
          break;
        case 'triggerGitDiff':
          // Toggle: if diff is already open, close it; otherwise request diff
          if (diffViewState.active) {
            dispatch({ type: 'CLOSE_DIFF' });
            vscode.postMessage({ type: 'diffViewClosed' });
          } else {
            vscode.postMessage({ type: 'requestGitDiff' });
          }
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
              dispatch({ type: 'OPEN_DIFF', diffResult, alignedRows, sourceLabel });
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
  }, [setSuppressUpdate, diffViewState.active]);

  const handleUpdate = useCallback((markdown: string) => {
    if (suppressUpdateRef.current) return;
    vscode.postMessage({ type: 'update', content: markdown });
  }, []);

  const handleCloseDiff = useCallback(() => {
    dispatch({ type: 'CLOSE_DIFF' });
    vscode.postMessage({ type: 'diffViewClosed' });
  }, []);

  // External change handlers
  const handleExternalAccept = useCallback(() => {
    if (!pendingExternalChange) return;
    setSuppressUpdate(true, 500);
    dispatch({ type: 'ACCEPT_EXTERNAL_CHANGE', content: pendingExternalChange });
    vscode.postMessage({ type: 'applyExternalChange' });
  }, [pendingExternalChange, setSuppressUpdate]);

  const handleExternalDismiss = useCallback(() => {
    dispatch({ type: 'DISMISS_EXTERNAL_CHANGE' });
    vscode.postMessage({ type: 'dismissExternalChange' });
  }, []);

  const handleExternalViewChanges = useCallback(() => {
    if (!pendingExternalChange || !content) return;
    const pending = pendingExternalChange;
    const current = content;
    dispatch({ type: 'DISMISS_EXTERNAL_CHANGE' });
    scheduleIdleCallback(() => {
      const diffResult = computeDiff(current, pending);
      const alignedRows = computeAlignment(diffResult.diffs);
      dispatch({
        type: 'OPEN_DIFF',
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
