import React, { useCallback, useEffect, useRef, useReducer } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
  COMMON_LANGUAGES,
  ALL_LANGUAGES,
  COMMON_LANGUAGE_IDS,
  type LanguageEntry,
} from '../constants/languages';
import { shouldOpenUpward } from '../utils/menuPosition';
import { MermaidBlockView } from './MermaidBlockView';

const CopyIcon = () => (
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
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
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
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function getDisplayName(langId: string): string {
  if (!langId) return 'plain text';
  const entry = ALL_LANGUAGES.find((l) => l.id === langId);
  return entry ? entry.label : langId;
}

interface CodeBlockState {
  dropdownOpen: boolean;
  dropdownDirection: 'down' | 'up';
  search: string;
  activeIndex: number;
  copied: boolean;
}

type CodeBlockAction =
  | { type: 'OPEN_DROPDOWN'; direction: 'down' | 'up' }
  | { type: 'CLOSE_DROPDOWN' }
  | { type: 'TOGGLE_DROPDOWN'; direction: 'down' | 'up' }
  | { type: 'SET_SEARCH'; search: string }
  | { type: 'SET_ACTIVE_INDEX'; index: number }
  | { type: 'SET_COPIED'; copied: boolean };

function codeBlockReducer(state: CodeBlockState, action: CodeBlockAction): CodeBlockState {
  switch (action.type) {
    case 'OPEN_DROPDOWN':
      return {
        ...state,
        dropdownOpen: true,
        dropdownDirection: action.direction,
        search: '',
        activeIndex: 0,
      };
    case 'CLOSE_DROPDOWN':
      return { ...state, dropdownOpen: false, search: '', activeIndex: 0 };
    case 'TOGGLE_DROPDOWN':
      return state.dropdownOpen
        ? { ...state, dropdownOpen: false, search: '', activeIndex: 0 }
        : {
            ...state,
            dropdownOpen: true,
            dropdownDirection: action.direction,
            search: '',
            activeIndex: 0,
          };
    case 'SET_SEARCH':
      return { ...state, search: action.search, activeIndex: 0 };
    case 'SET_ACTIVE_INDEX':
      return { ...state, activeIndex: action.index };
    case 'SET_COPIED':
      return { ...state, copied: action.copied };
    default:
      return state;
  }
}

const initialCodeBlockState: CodeBlockState = {
  dropdownOpen: false,
  dropdownDirection: 'down',
  search: '',
  activeIndex: 0,
  copied: false,
};

export function CodeBlockNodeView(props: NodeViewProps) {
  const { node, editor, getPos } = props;
  const language = (node.attrs.language as string) || '';

  // Mermaid code blocks render as diagrams instead of raw code
  if (language === 'mermaid') {
    const code = node.textContent;
    const handleCodeChange = (newCode: string) => {
      const pos = getPos();
      if (pos == null) return;
      const { tr } = editor.state;
      // Replace the content of the code block node (pos+1 to pos+1+oldLength)
      const start = pos + 1;
      const end = start + node.content.size;
      if (newCode) {
        tr.replaceWith(start, end, editor.state.schema.text(newCode));
      } else {
        tr.delete(start, end);
      }
      editor.view.dispatch(tr);
    };
    return (
      <NodeViewWrapper className="quartz-codeblock quartz-codeblock-mermaid">
        <div contentEditable={false}>
          <MermaidBlockView code={code} onCodeChange={handleCodeChange} />
        </div>
      </NodeViewWrapper>
    );
  }

  return <CodeBlockNodeViewInner {...props} />;
}

function CodeBlockNodeViewInner({ node, updateAttributes, editor: _editor }: NodeViewProps) {
  const language = (node.attrs.language as string) || '';
  const [state, dispatch] = useReducer(codeBlockReducer, initialCodeBlockState);
  const { dropdownOpen, dropdownDirection, search, activeIndex, copied } = state;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langBtnRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup copy timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Build filtered language list
  const filteredLanguages = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      // Show common first, then "all" (excluding common)
      const others = ALL_LANGUAGES.filter((l) => !COMMON_LANGUAGE_IDS.has(l.id));
      return { common: COMMON_LANGUAGES, all: others };
    }
    const matches = ALL_LANGUAGES.filter(
      (l) => l.label.toLowerCase().includes(q) || l.id.toLowerCase().includes(q),
    );
    return { common: [] as LanguageEntry[], all: matches };
  }, [search]);

  const flatList = React.useMemo(
    () => [...filteredLanguages.common, ...filteredLanguages.all],
    [filteredLanguages],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        dispatch({ type: 'CLOSE_DROPDOWN' });
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const selectLanguage = useCallback(
    (langId: string) => {
      updateAttributes({ language: langId });
      dispatch({ type: 'CLOSE_DROPDOWN' });
    },
    [updateAttributes],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        dispatch({
          type: 'SET_ACTIVE_INDEX',
          index: Math.min(activeIndex + 1, flatList.length - 1),
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        dispatch({ type: 'SET_ACTIVE_INDEX', index: Math.max(activeIndex - 1, 0) });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatList[activeIndex]) {
          selectLanguage(flatList[activeIndex].id);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        dispatch({ type: 'CLOSE_DROPDOWN' });
      }
    },
    [flatList, activeIndex, selectLanguage],
  );

  const handleItemKeyDown = useCallback(
    (e: React.KeyboardEvent, langId: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectLanguage(langId);
      }
    },
    [selectLanguage],
  );

  // Scroll active item into view
  useEffect(() => {
    if (!dropdownOpen || !listRef.current) return;
    const activeEl = listRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, dropdownOpen]);

  const handleCopy = useCallback(() => {
    const text = node.textContent;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        dispatch({ type: 'SET_COPIED', copied: true });
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => {
          dispatch({ type: 'SET_COPIED', copied: false });
          copyTimeoutRef.current = null;
        }, 1500);
      })
      .catch(console.warn);
  }, [node]);

  let itemIndex = 0;

  return (
    <NodeViewWrapper className="quartz-codeblock">
      <div className="quartz-codeblock-header" contentEditable={false}>
        <div className="quartz-codeblock-header-left" ref={dropdownRef}>
          <button
            ref={langBtnRef}
            className="quartz-codeblock-lang-btn"
            onClick={() => {
              let direction: 'down' | 'up' = 'down';
              if (!dropdownOpen && langBtnRef.current) {
                const rect = langBtnRef.current.getBoundingClientRect();
                const DROPDOWN_MAX_HEIGHT = 300;
                direction = shouldOpenUpward(rect.bottom, rect.top, DROPDOWN_MAX_HEIGHT)
                  ? 'up'
                  : 'down';
              }
              dispatch({ type: 'TOGGLE_DROPDOWN', direction });
              if (!dropdownOpen) {
                setTimeout(() => searchInputRef.current?.focus(), 0);
              }
            }}
            title="Change language"
          >
            {getDisplayName(language)}
          </button>

          {dropdownOpen && (
            <div
              className="quartz-codeblock-dropdown"
              role="listbox"
              data-direction={dropdownDirection}
              onKeyDown={handleKeyDown}
            >
              <div className="quartz-codeblock-dropdown-search">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search languages..."
                  value={search}
                  onChange={(e) => dispatch({ type: 'SET_SEARCH', search: e.target.value })}
                />
              </div>
              <div className="quartz-codeblock-dropdown-list" ref={listRef}>
                {filteredLanguages.common.length > 0 && (
                  <div className="quartz-codeblock-dropdown-section">
                    <div className="quartz-codeblock-dropdown-label">Common</div>
                    {filteredLanguages.common.map((lang) => {
                      const idx = itemIndex++;
                      return (
                        <div
                          key={lang.id}
                          role="option"
                          aria-selected={lang.id === language}
                          tabIndex={0}
                          className="quartz-codeblock-dropdown-item"
                          data-active={idx === activeIndex ? 'true' : undefined}
                          data-selected={lang.id === language ? 'true' : undefined}
                          onClick={() => selectLanguage(lang.id)}
                          onKeyDown={(e) => handleItemKeyDown(e, lang.id)}
                          onMouseEnter={() => dispatch({ type: 'SET_ACTIVE_INDEX', index: idx })}
                        >
                          {lang.label}
                        </div>
                      );
                    })}
                  </div>
                )}
                {filteredLanguages.all.length > 0 && (
                  <div className="quartz-codeblock-dropdown-section">
                    {filteredLanguages.common.length > 0 && (
                      <div className="quartz-codeblock-dropdown-label">All Languages</div>
                    )}
                    {filteredLanguages.all.map((lang) => {
                      const idx = itemIndex++;
                      return (
                        <div
                          key={lang.id}
                          role="option"
                          aria-selected={lang.id === language}
                          tabIndex={0}
                          className="quartz-codeblock-dropdown-item"
                          data-active={idx === activeIndex ? 'true' : undefined}
                          data-selected={lang.id === language ? 'true' : undefined}
                          onClick={() => selectLanguage(lang.id)}
                          onKeyDown={(e) => handleItemKeyDown(e, lang.id)}
                          onMouseEnter={() => dispatch({ type: 'SET_ACTIVE_INDEX', index: idx })}
                        >
                          {lang.label}
                        </div>
                      );
                    })}
                  </div>
                )}
                {flatList.length === 0 && (
                  <div
                    className="quartz-codeblock-dropdown-item"
                    style={{ opacity: 0.5, cursor: 'default' }}
                  >
                    No languages found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button className="quartz-codeblock-copy-btn" onClick={handleCopy} title="Copy code">
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <NodeViewContent as="pre" />
    </NodeViewWrapper>
  );
}
