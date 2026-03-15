import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Editor } from '@tiptap/react';
import { extractHeadings, type HeadingItem } from '../utils/headingExtractor';

interface TableOfContentsProps {
  editor: Editor;
}

export function TableOfContents({ editor }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredHeadings = useMemo(() => {
    if (!query) return headings;
    const q = query.toLowerCase();
    return headings.filter((h) => h.text.toLowerCase().includes(q));
  }, [headings, query]);

  // Compute a content hash of filtered headings so we reset selection
  // when the actual content changes, not just the count.
  const filteredContentHash = useMemo(
    () => filteredHeadings.map((h) => `${h.pos}:${h.text}`).join('|'),
    [filteredHeadings],
  );

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredContentHash]);

  const scrollToHeading = useCallback(
    (heading: HeadingItem) => {
      const dom = editor.view.nodeDOM(heading.pos);
      if (dom && dom instanceof HTMLElement) {
        dom.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Place cursor at the heading
        editor.commands.setTextSelection(heading.pos + 1);
        editor.commands.focus();
      }
      setIsOpen(false);
      setQuery('');
    },
    [editor],
  );

  const open = useCallback(() => {
    const items = extractHeadings(editor);
    setHeadings(items);
    setQuery('');
    setSelectedIndex(0);
    setIsOpen(true);
    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [editor]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    editor.commands.focus();
  }, [editor]);

  // Listen for open event from keyboard shortcut
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      if (event.detail?.type === 'open') {
        open();
      }
    };
    window.addEventListener('tableOfContents', handler as EventListener);
    return () => window.removeEventListener('tableOfContents', handler as EventListener);
  }, [open]);

  // Listen for scroll requests from the extension sidebar
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const { line } = event.detail;
      if (typeof line !== 'number') return;

      // Find the heading closest to the requested line
      const items = extractHeadings(editor);
      // Lines from extension are 0-based, pos is document position
      // We need to find the heading that corresponds to the line
      // Since we can't directly map line→pos, find heading by text match
      // The extension sends line number, so we find the heading at that index
      const heading = items[line];
      if (heading) {
        scrollToHeading(heading);
      }
    };
    window.addEventListener('scrollToHeadingRequest', handler as EventListener);
    return () => window.removeEventListener('scrollToHeadingRequest', handler as EventListener);
  }, [editor, scrollToHeading]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => Math.min(i + 1, filteredHeadings.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (filteredHeadings[selectedIndex]) {
          scrollToHeading(filteredHeadings[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, selectedIndex, filteredHeadings, scrollToHeading, close]);

  // Scroll selected item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const selected = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, selectedIndex]);

  if (!isOpen) return null;

  const indentPerLevel = 16;

  return (
    <div
      className="quartz-toc-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="quartz-toc-modal">
        <div className="quartz-toc-search">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search headings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="quartz-toc-list" ref={listRef}>
          {filteredHeadings.length === 0 ? (
            <div className="quartz-toc-empty">
              {headings.length === 0 ? 'No headings in document' : 'No matching headings'}
            </div>
          ) : (
            filteredHeadings.map((heading, i) => (
              <button
                key={`${heading.pos}-${heading.text}`}
                className={`quartz-toc-item ${i === selectedIndex ? 'selected' : ''}`}
                style={{ paddingLeft: 16 + (heading.level - 1) * indentPerLevel }}
                onClick={() => scrollToHeading(heading)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="quartz-toc-level">H{heading.level}</span>
                <span className="quartz-toc-text">{heading.text}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
