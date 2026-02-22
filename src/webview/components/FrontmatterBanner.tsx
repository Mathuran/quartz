import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../styles/frontmatter.css';

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): Record<string, unknown> | undefined;
  setState(state: unknown): void;
}

interface FrontmatterBannerProps {
  frontmatter: string | null;
  onChange: (yaml: string) => void;
  onRemove: () => void;
}

/**
 * Count the number of top-level YAML properties by matching lines that
 * start with a word character followed by a colon (e.g. "title: ...").
 */
function countProperties(yaml: string): number {
  if (!yaml.trim()) return 0;
  const matches = yaml.match(/^\w[^:\n]*:/gm);
  return matches ? matches.length : 0;
}

/**
 * Load the persisted collapsed state from VS Code webview state.
 */
function loadCollapsedState(): boolean {
  try {
    const state = (window as unknown as { vscodeApi?: VsCodeApi }).vscodeApi?.getState() as
      | Record<string, unknown>
      | undefined;
    // Fall back: try to read from the global vscode api if available
    if (state && typeof state.frontmatterCollapsed === 'boolean') {
      return state.frontmatterCollapsed;
    }
  } catch {
    // Ignore errors - default to expanded
  }
  return false;
}

/**
 * Persist the collapsed state to VS Code webview state.
 */
function saveCollapsedState(collapsed: boolean): void {
  try {
    const vscodeApi = (window as unknown as { vscodeApi?: VsCodeApi }).vscodeApi;
    if (vscodeApi) {
      const currentState = (vscodeApi.getState() as Record<string, unknown>) || {};
      vscodeApi.setState({ ...currentState, frontmatterCollapsed: collapsed });
    }
  } catch {
    // Ignore errors
  }
}

export function FrontmatterBanner({ frontmatter, onChange, onRemove }: FrontmatterBannerProps) {
  const [collapsed, setCollapsed] = useState(() => loadCollapsedState());
  const [localValue, setLocalValue] = useState(frontmatter ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external frontmatter changes into local state
  useEffect(() => {
    if (frontmatter !== null) {
      setLocalValue(frontmatter);
    }
  }, [frontmatter]);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && !collapsed) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [localValue, collapsed]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleToggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      saveCollapsedState(next);
      return next;
    });
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setLocalValue(value);

      // Debounce the onChange callback at 300ms
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(value);
      }, 300);
    },
    [onChange],
  );

  const handleAddFrontmatter = useCallback(() => {
    onChange('');
    setCollapsed(false);
    saveCollapsedState(false);
    // Focus the textarea after it renders
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }, [onChange]);

  const handleRemove = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onRemove();
  }, [onRemove]);

  // If no frontmatter, show the "+ Add frontmatter" link
  if (frontmatter === null) {
    return (
      <div className="quartz-frontmatter-add">
        <button className="quartz-frontmatter-add-btn" onClick={handleAddFrontmatter}>
          + Add frontmatter
        </button>
      </div>
    );
  }

  const propertyCount = countProperties(localValue);

  return (
    <div className="quartz-frontmatter-banner" data-collapsed={collapsed ? 'true' : 'false'}>
      <div className="quartz-frontmatter-header" onClick={handleToggle}>
        <div className="quartz-frontmatter-header-left">
          <span className={`quartz-frontmatter-chevron ${collapsed ? 'collapsed' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path
                d="M4.5 2L8.5 6L4.5 10"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="quartz-frontmatter-label">
            Frontmatter
            {collapsed
              ? ` (${propertyCount} ${propertyCount === 1 ? 'property' : 'properties'})`
              : ''}
          </span>
        </div>
        <button
          className="quartz-frontmatter-remove-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          title="Remove frontmatter"
        >
          Remove
        </button>
      </div>
      {!collapsed && (
        <textarea
          ref={textareaRef}
          className="quartz-frontmatter-textarea"
          value={localValue}
          onChange={handleChange}
          spellCheck={false}
          placeholder="title: My Document"
          rows={Math.max(3, localValue.split('\n').length)}
        />
      )}
    </div>
  );
}
