import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { findMatches, type SearchMatch } from '../search/searchEngine';
import { searchHighlightKey } from '../extensions/searchHighlightExtension';

interface SearchBarProps {
  editor: Editor;
}

export function SearchBar({ editor }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const findInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update decorations in the editor
  const updateDecorations = useCallback(
    (newMatches: SearchMatch[], newIndex: number) => {
      const { tr } = editor.state;
      tr.setMeta(searchHighlightKey, {
        matches: newMatches,
        currentIndex: newIndex,
      });
      tr.setMeta('addToHistory', false);
      editor.view.dispatch(tr);
    },
    [editor],
  );

  // Run search and update state
  const runSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery) {
        setMatches([]);
        setCurrentIndex(-1);
        updateDecorations([], -1);
        return;
      }

      const results = findMatches(editor.state.doc, searchQuery, { caseSensitive, wholeWord });
      setMatches(results);

      if (results.length > 0) {
        // Find the match nearest to the current cursor position
        const cursorPos = editor.state.selection.from;
        let nearestIndex = 0;
        for (let i = 0; i < results.length; i++) {
          if (results[i].from >= cursorPos) {
            nearestIndex = i;
            break;
          }
          // If we reach the end without finding one after cursor, wrap to first
          if (i === results.length - 1) {
            nearestIndex = 0;
          }
        }
        setCurrentIndex(nearestIndex);
        updateDecorations(results, nearestIndex);
        scrollToMatch(results[nearestIndex]);
      } else {
        setCurrentIndex(-1);
        updateDecorations(results, -1);
      }
    },
    [editor, caseSensitive, wholeWord, updateDecorations],
  );

  // Scroll to a match position
  const scrollToMatch = useCallback(
    (match: SearchMatch) => {
      // Use the editor's DOM to find and scroll to the decoration
      const dom = editor.view.domAtPos(match.from);
      if (dom.node) {
        const element =
          dom.node instanceof HTMLElement ? dom.node : (dom.node.parentElement as HTMLElement);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [editor],
  );

  // Navigate to next match
  const goToNext = useCallback(() => {
    if (matches.length === 0) return;
    const next = (currentIndex + 1) % matches.length;
    setCurrentIndex(next);
    updateDecorations(matches, next);
    scrollToMatch(matches[next]);
  }, [matches, currentIndex, updateDecorations, scrollToMatch]);

  // Navigate to previous match
  const goToPrevious = useCallback(() => {
    if (matches.length === 0) return;
    const prev = (currentIndex - 1 + matches.length) % matches.length;
    setCurrentIndex(prev);
    updateDecorations(matches, prev);
    scrollToMatch(matches[prev]);
  }, [matches, currentIndex, updateDecorations, scrollToMatch]);

  // Replace current match
  const replaceCurrent = useCallback(() => {
    if (matches.length === 0 || currentIndex < 0) return;
    const match = matches[currentIndex];

    editor
      .chain()
      .focus()
      .deleteRange({ from: match.from, to: match.to })
      .insertContentAt(match.from, replacement)
      .run();

    // Re-run search after replacement
    setTimeout(() => runSearch(query), 0);
  }, [editor, matches, currentIndex, replacement, query, runSearch]);

  // Replace all matches
  const replaceAll = useCallback(() => {
    if (matches.length === 0) return;

    // Build a single transaction replacing all matches in reverse order
    const { tr } = editor.state;
    const sortedMatches = [...matches].sort((a, b) => b.from - a.from);

    for (const match of sortedMatches) {
      tr.replaceWith(
        match.from,
        match.to,
        replacement
          ? editor.state.schema.text(replacement)
          : editor.state.schema.text('').slice(0, 0),
      );
    }

    // If replacing with empty string, delete the ranges instead
    if (!replacement) {
      // Re-build transaction for deletion
      const tr2 = editor.state.tr;
      const sorted = [...matches].sort((a, b) => b.from - a.from);
      for (const match of sorted) {
        tr2.delete(match.from, match.to);
      }
      editor.view.dispatch(tr2);
    } else {
      editor.view.dispatch(tr);
    }

    // Re-run search after replacement
    setTimeout(() => runSearch(query), 0);
  }, [editor, matches, replacement, query, runSearch]);

  // Close search and clear highlights
  const close = useCallback(() => {
    setIsOpen(false);
    setShowReplace(false);
    setQuery('');
    setReplacement('');
    setMatches([]);
    setCurrentIndex(-1);
    updateDecorations([], -1);
    editor.commands.focus();
  }, [editor, updateDecorations]);

  // Debounced search on query/options change
  useEffect(() => {
    if (!isOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 100);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, caseSensitive, wholeWord, isOpen, runSearch]);

  // Listen for open events from keyboard shortcuts
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const withReplace = event.detail?.replace === true;
      setIsOpen(true);
      setShowReplace(withReplace);

      // Pre-fill with selected text
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const selectedText = editor.state.doc.textBetween(from, to, '');
        if (selectedText && selectedText.length < 200) {
          setQuery(selectedText);
        }
      }

      setTimeout(() => findInputRef.current?.focus(), 0);
    };
    window.addEventListener('quartz:openSearch', handler as EventListener);
    return () => window.removeEventListener('quartz:openSearch', handler as EventListener);
  }, [editor]);

  // Re-run search when document changes (edits outside search)
  useEffect(() => {
    if (!isOpen || !query) return;
    const handleUpdate = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runSearch(query), 150);
    };
    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, isOpen, query, runSearch]);

  // Keyboard handling within the search bar
  const handleFindKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    },
    [goToNext, goToPrevious, close],
  );

  const handleReplaceKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        replaceCurrent();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    },
    [replaceCurrent, close],
  );

  if (!isOpen) return null;

  const matchCountLabel =
    matches.length === 0 ? (query ? 'No results' : '') : `${currentIndex + 1} of ${matches.length}`;

  return (
    <div className="quartz-search-bar">
      {/* Find row */}
      <div className="quartz-search-row">
        <input
          ref={findInputRef}
          type="text"
          className="quartz-search-input"
          placeholder="Find..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleFindKeyDown}
        />
        <button
          className={`quartz-search-toggle ${caseSensitive ? 'active' : ''}`}
          onClick={() => setCaseSensitive(!caseSensitive)}
          title="Match Case"
        >
          Aa
        </button>
        <button
          className={`quartz-search-toggle ${wholeWord ? 'active' : ''}`}
          onClick={() => setWholeWord(!wholeWord)}
          title="Match Whole Word"
        >
          Ab
        </button>
        <span className="quartz-search-count">{matchCountLabel}</span>
        <button
          className="quartz-search-btn"
          onClick={goToPrevious}
          disabled={matches.length === 0}
          title="Previous Match (Shift+Enter)"
        >
          &#x2191;
        </button>
        <button
          className="quartz-search-btn"
          onClick={goToNext}
          disabled={matches.length === 0}
          title="Next Match (Enter)"
        >
          &#x2193;
        </button>
        {!showReplace && (
          <button
            className="quartz-search-btn"
            onClick={() => setShowReplace(true)}
            title="Toggle Replace"
          >
            &#x25B7;
          </button>
        )}
        <button className="quartz-search-btn" onClick={close} title="Close (Escape)">
          &#x2715;
        </button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="quartz-search-row">
          <input
            type="text"
            className="quartz-search-input"
            placeholder="Replace..."
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={handleReplaceKeyDown}
          />
          <button
            className="quartz-search-replace-btn"
            onClick={replaceCurrent}
            disabled={matches.length === 0}
            title="Replace"
          >
            Replace
          </button>
          <button
            className="quartz-search-replace-btn"
            onClick={replaceAll}
            disabled={matches.length === 0}
            title="Replace All"
          >
            All
          </button>
        </div>
      )}
    </div>
  );
}
