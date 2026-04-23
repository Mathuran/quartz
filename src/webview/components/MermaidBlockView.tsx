import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MermaidFullscreenView } from './MermaidFullscreenView';

// ---- Theme-aware mermaid loading ----

// Quartz-matched theme variables
const DARK_THEME_VARS = {
  darkMode: true,
  background: '#1a1a2e',
  primaryColor: '#1e2d4a',
  primaryTextColor: '#d4d4d4',
  primaryBorderColor: 'rgba(68, 138, 255, 0.4)',
  secondaryColor: '#2a2040',
  secondaryTextColor: '#d4d4d4',
  secondaryBorderColor: 'rgba(124, 77, 255, 0.3)',
  tertiaryColor: '#1a3a2a',
  tertiaryTextColor: '#d4d4d4',
  tertiaryBorderColor: 'rgba(0, 191, 165, 0.3)',
  lineColor: '#4d5566',
  textColor: '#d4d4d4',
  mainBkg: '#1e2d4a',
  nodeBorder: 'rgba(68, 138, 255, 0.4)',
  clusterBkg: 'rgba(68, 138, 255, 0.05)',
  clusterBorder: 'rgba(68, 138, 255, 0.2)',
  titleColor: '#d4d4d4',
  edgeLabelBackground: '#1a1a2e',
  // Sequence diagram
  actorBkg: '#1e2d4a',
  actorBorder: 'rgba(68, 138, 255, 0.4)',
  actorTextColor: '#d4d4d4',
  actorLineColor: '#4d5566',
  signalColor: '#d4d4d4',
  signalTextColor: '#d4d4d4',
  labelBoxBkgColor: '#1e2d4a',
  labelBoxBorderColor: 'rgba(68, 138, 255, 0.4)',
  labelTextColor: '#d4d4d4',
  loopTextColor: '#d4d4d4',
  noteBkgColor: '#2a2a3e',
  noteTextColor: '#d4d4d4',
  noteBorderColor: 'rgba(68, 138, 255, 0.3)',
  activationBkgColor: '#2a3a5a',
  activationBorderColor: 'rgba(68, 138, 255, 0.5)',
  sequenceNumberColor: '#1a1a2e',
};

const LIGHT_THEME_VARS = {
  darkMode: false,
  background: '#ffffff',
  primaryColor: '#dbeafe',
  primaryTextColor: '#24292e',
  primaryBorderColor: 'rgba(26, 115, 232, 0.4)',
  secondaryColor: '#f3e8ff',
  secondaryTextColor: '#24292e',
  secondaryBorderColor: 'rgba(98, 0, 234, 0.3)',
  tertiaryColor: '#dcfce7',
  tertiaryTextColor: '#24292e',
  tertiaryBorderColor: 'rgba(0, 137, 123, 0.3)',
  lineColor: '#9ca3af',
  textColor: '#24292e',
  mainBkg: '#dbeafe',
  nodeBorder: 'rgba(26, 115, 232, 0.4)',
  clusterBkg: 'rgba(26, 115, 232, 0.05)',
  clusterBorder: 'rgba(26, 115, 232, 0.2)',
  titleColor: '#24292e',
  edgeLabelBackground: '#ffffff',
  // Sequence diagram
  actorBkg: '#dbeafe',
  actorBorder: 'rgba(26, 115, 232, 0.4)',
  actorTextColor: '#24292e',
  actorLineColor: '#9ca3af',
  signalColor: '#24292e',
  signalTextColor: '#24292e',
  labelBoxBkgColor: '#dbeafe',
  labelBoxBorderColor: 'rgba(26, 115, 232, 0.4)',
  labelTextColor: '#24292e',
  loopTextColor: '#24292e',
  noteBkgColor: '#f0f4ff',
  noteTextColor: '#24292e',
  noteBorderColor: 'rgba(26, 115, 232, 0.3)',
  activationBkgColor: '#c7d9f5',
  activationBorderColor: 'rgba(26, 115, 232, 0.5)',
  sequenceNumberColor: '#ffffff',
};

function isDarkTheme(): boolean {
  const kind = document.body.getAttribute('data-vscode-theme-kind');
  return kind !== 'vscode-light' && kind !== 'vscode-high-contrast-light';
}

function getMermaidConfig() {
  const dark = isDarkTheme();
  return {
    startOnLoad: false,
    securityLevel: 'strict' as const,
    flowchart: { useMaxWidth: true },
    sequence: { useMaxWidth: true },
    theme: 'base' as const,
    themeVariables: dark ? DARK_THEME_VARS : LIGHT_THEME_VARS,
  };
}

let mermaidPromise: Promise<typeof import('mermaid')> | null = null;
let currentThemeIsDark = isDarkTheme();

function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      mod.default.initialize(getMermaidConfig());
      return mod;
    });
  }
  return mermaidPromise;
}

// Re-initialize mermaid when theme changes, notify all blocks
let _themeVersion = 0;
const themeListeners = new Set<() => void>();

function onThemeChange(cb: () => void) {
  themeListeners.add(cb);
  return () => {
    themeListeners.delete(cb);
  };
}

// Watch for VS Code theme changes
if (typeof MutationObserver !== 'undefined') {
  const observer = new MutationObserver(() => {
    const dark = isDarkTheme();
    if (dark !== currentThemeIsDark) {
      currentThemeIsDark = dark;
      _themeVersion++;
      // Re-initialize mermaid with new theme
      getMermaid().then((mod) => {
        mod.default.initialize(getMermaidConfig());
        // Notify all mounted blocks to re-render
        themeListeners.forEach((cb) => cb());
      });
    }
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-vscode-theme-kind'],
  });
}

// ---- Unique render-ID counter ----
let renderCounter = 0;
function nextRenderId(): string {
  return `quartz-mermaid-${++renderCounter}`;
}

// ---- Icons ----

const PencilIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const ExpandIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

// ---- State machine ----

type MermaidState =
  | { kind: 'loading' }
  | { kind: 'rendered'; svg: string }
  | { kind: 'editing' }
  | { kind: 'error'; message: string };

// ---- Component ----

interface MermaidBlockViewProps {
  /** Raw mermaid source code from the TipTap node */
  code: string;
  /** Callback to persist new source code into the TipTap node */
  onCodeChange: (newCode: string) => void;
}

export function MermaidBlockView({ code, onCodeChange }: MermaidBlockViewProps) {
  const [state, setState] = useState<MermaidState>({ kind: 'loading' });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const renderedRef = useRef<HTMLDivElement>(null);
  // Keep a local draft so typing doesn't push to TipTap on every keystroke
  const [draft, setDraft] = useState(code);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  // ---- Render helper ----
  const renderDiagram = useCallback(async (source: string) => {
    if (!source.trim()) {
      setState({ kind: 'editing' });
      return;
    }
    setState({ kind: 'loading' });
    // Use a hidden container attached to the DOM — mermaid needs
    // getBBox/getAttribute which require a live DOM element
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);
    try {
      const mermaidModule = await getMermaid();
      const { svg } = await mermaidModule.default.render(nextRenderId(), source, container);
      setState({ kind: 'rendered', svg });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setState({ kind: 'error', message });
    } finally {
      container.remove();
    }
  }, []);

  // ---- Initial render (or when `code` prop changes externally) ----
  useEffect(() => {
    // Only re-render when we are NOT editing (external change from TipTap)
    if (state.kind !== 'editing') {
      setDraft(code);
      renderDiagram(code);
    }
  }, [code]);

  // ---- Re-render when VS Code theme changes ----
  useEffect(() => {
    return onThemeChange(() => {
      if (state.kind === 'rendered' || state.kind === 'error') {
        renderDiagram(code);
      }
    });
  }, [code, state.kind, renderDiagram]);

  // ---- Handlers ----

  const enterEditing = useCallback(() => {
    setDraft(code);
    setState({ kind: 'editing' });
  }, [code]);

  const finishEditing = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed !== code) {
      onCodeChange(trimmed);
    }
    renderDiagram(trimmed);
  }, [draft, code, onCodeChange, renderDiagram]);

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Escape → finish editing
      if (e.key === 'Escape') {
        e.preventDefault();
        finishEditing();
      }
    },
    [finishEditing],
  );

  // Auto-resize textarea to fit content (no scrollbar)
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  // Focus textarea and auto-resize when entering edit mode
  useEffect(() => {
    if (state.kind === 'editing') {
      const id = setTimeout(() => {
        textareaRef.current?.focus();
        autoResize();
      }, 0);
      return () => clearTimeout(id);
    }
  }, [state.kind, autoResize]);

  // ---- Overflow detection ----
  const checkOverflow = useCallback(() => {
    const el = renderedRef.current;
    if (el) {
      setIsOverflowing(el.scrollHeight > el.clientHeight);
    }
  }, []);

  useEffect(() => {
    if (state.kind === 'rendered') {
      // Check after a frame so the SVG has been laid out
      const id = requestAnimationFrame(checkOverflow);
      return () => cancelAnimationFrame(id);
    } else {
      setIsOverflowing(false);
    }
  }, [state, checkOverflow]);

  useEffect(() => {
    if (state.kind !== 'rendered') return;
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [state.kind, checkOverflow]);

  // ---- Render ----

  return (
    <div className="quartz-mermaid">
      {state.kind === 'loading' && (
        <div className="quartz-mermaid-loading">
          <div className="quartz-mermaid-spinner" />
        </div>
      )}

      {state.kind === 'rendered' && (
        <div
          ref={renderedRef}
          className={`quartz-mermaid-rendered${isOverflowing ? ' quartz-mermaid-overflowing' : ''}`}
        >
          <div className="quartz-mermaid-btn-group">
            {isOverflowing && (
              <button
                className="quartz-mermaid-expand-btn"
                onClick={() => setShowFullscreen(true)}
                title="View full diagram"
              >
                <ExpandIcon />
              </button>
            )}
            <button
              className="quartz-mermaid-edit-btn"
              onClick={enterEditing}
              title="Edit diagram source"
            >
              <PencilIcon />
            </button>
          </div>
          <div className="quartz-mermaid-svg" dangerouslySetInnerHTML={{ __html: state.svg }} />
        </div>
      )}

      {showFullscreen && state.kind === 'rendered' && (
        <MermaidFullscreenView svg={state.svg} onClose={() => setShowFullscreen(false)} />
      )}

      {state.kind === 'editing' && (
        <div className="quartz-mermaid-editor">
          <textarea
            ref={textareaRef}
            className="quartz-mermaid-textarea"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              autoResize();
            }}
            onBlur={finishEditing}
            onKeyDown={handleTextareaKeyDown}
            placeholder="graph TD&#10;    A --> B"
            spellCheck={false}
          />
          <div className="quartz-mermaid-editor-footer">
            <button
              className="quartz-mermaid-done-btn"
              onMouseDown={(e) => {
                // Prevent blur from firing before click
                e.preventDefault();
                finishEditing();
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="quartz-mermaid-error">
          <button
            className="quartz-mermaid-edit-btn"
            onClick={enterEditing}
            title="Edit diagram source"
          >
            <PencilIcon />
          </button>
          <div className="quartz-mermaid-error-message">{state.message}</div>
        </div>
      )}
    </div>
  );
}
