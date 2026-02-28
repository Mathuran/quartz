import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
  COMMON_LANGUAGES,
  ALL_LANGUAGES,
  COMMON_LANGUAGE_IDS,
  type LanguageEntry,
} from '../constants/languages';

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

export function CodeBlockNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const language = (node.attrs.language as string) || '';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  // Reset active index when list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [flatList.length]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    } else {
      setSearch('');
    }
  }, [dropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const selectLanguage = useCallback(
    (langId: string) => {
      updateAttributes({ language: langId });
      setDropdownOpen(false);
    },
    [updateAttributes],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatList.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatList[activeIndex]) {
          selectLanguage(flatList[activeIndex].id);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setDropdownOpen(false);
      }
    },
    [flatList, activeIndex, selectLanguage],
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
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [node]);

  let itemIndex = 0;

  return (
    <NodeViewWrapper className="quartz-codeblock">
      <div className="quartz-codeblock-header" contentEditable={false}>
        <div className="quartz-codeblock-header-left" ref={dropdownRef}>
          <button
            className="quartz-codeblock-lang-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="Change language"
          >
            {getDisplayName(language)}
          </button>

          {dropdownOpen && (
            <div className="quartz-codeblock-dropdown" onKeyDown={handleKeyDown}>
              <div className="quartz-codeblock-dropdown-search">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search languages..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
                          className="quartz-codeblock-dropdown-item"
                          data-active={idx === activeIndex ? 'true' : undefined}
                          data-selected={lang.id === language ? 'true' : undefined}
                          onClick={() => selectLanguage(lang.id)}
                          onMouseEnter={() => setActiveIndex(idx)}
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
                          className="quartz-codeblock-dropdown-item"
                          data-active={idx === activeIndex ? 'true' : undefined}
                          data-selected={lang.id === language ? 'true' : undefined}
                          onClick={() => selectLanguage(lang.id)}
                          onMouseEnter={() => setActiveIndex(idx)}
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
