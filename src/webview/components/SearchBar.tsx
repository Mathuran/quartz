import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { findMatches, type SearchMatch } from '../search/searchEngine';
import { searchHighlightKey } from '../extensions/searchHighlightExtension';

interface SearchBarProps {
  editor: Editor;
}

interface SearchState {
  isOpen: boolean;
  showReplace: boolean;
  query: string;
  replacement: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  matches: SearchMatch[];
  currentIndex: number;
}

type SearchAction =
  | { type: 'OPEN'; query: string; showReplace: boolean }
  | { type: 'CLOSE' }
  | { type: 'SET_QUERY'; query: string }
  | { type: 'SET_REPLACEMENT'; replacement: string }
  | { type: 'TOGGLE_CASE_SENSITIVE' }
  | { type: 'TOGGLE_WHOLE_WORD' }
  | { type: 'SET_SHOW_REPLACE'; showReplace: boolean }
  | { type: 'SET_RESULTS'; matches: SearchMatch[]; currentIndex: number }
  | { type: 'SET_CURRENT_INDEX'; currentIndex: number }
  | { type: 'CLEAR_RESULTS' };

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'OPEN':
      return { ...state, isOpen: true, query: action.query, showReplace: action.showReplace };
    case 'CLOSE':
      return {
        ...state,
        isOpen: false,
        showReplace: false,
        query: '',
        replacement: '',
        matches: [],
        currentIndex: -1,
      };
    case 'SET_QUERY':
      return { ...state, query: action.query };
    case 'SET_REPLACEMENT':
      return { ...state, replacement: action.replacement };
    case 'TOGGLE_CASE_SENSITIVE':
      return { ...state, caseSensitive: !state.caseSensitive };
    case 'TOGGLE_WHOLE_WORD':
      return { ...state, wholeWord: !state.wholeWord };
    case 'SET_SHOW_REPLACE':
      return { ...state, showReplace: action.showReplace };
    case 'SET_RESULTS':
      return { ...state, matches: action.matches, currentIndex: action.currentIndex };
    case 'SET_CURRENT_INDEX':
      return { ...state, currentIndex: action.currentIndex };
    case 'CLEAR_RESULTS':
      return { ...state, matches: [], currentIndex: -1 };
    default:
      return state;
  }
}

const initialSearchState: SearchState = {
  isOpen: false,
  showReplace: false,
  query: '',
  replacement: '',
  caseSensitive: false,
  wholeWord: false,
  matches: [],
  currentIndex: -1,
};

function ReplaceRow({
  replacement,
  onReplacementChange,
  onReplaceCurrent,
  onReplaceAll,
  onKeyDown,
  disabled,
}: {
  replacement: string;
  onReplacementChange: (value: string) => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  disabled: boolean;
}) {
  return (
    <div className="quartz-search-row">
      <input
        type="text"
        className="quartz-search-input"
        placeholder="Replace..."
        value={replacement}
        onChange={(e) => onReplacementChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button
        className="quartz-search-replace-btn"
        onClick={onReplaceCurrent}
        disabled={disabled}
        title="Replace"
      >
        Replace
      </button>
      <button
        className="quartz-search-replace-btn"
        onClick={onReplaceAll}
        disabled={disabled}
        title="Replace All"
      >
        All
      </button>
    </div>
  );
}

export function SearchBar({ editor }: SearchBarProps) {
  const [state, dispatch] = useReducer(searchReducer, initialSearchState);
  const {
    isOpen,
    showReplace,
    query,
    replacement,
    caseSensitive,
    wholeWord,
    matches,
    currentIndex,
  } = state;
  const findInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update decorations in the editor
  const updateDecorations = useCallback(
    (newMatches: SearchMatch[], newIndex: number) => {
      if (editor.isDestroyed) return;
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

  // Run search and update state
  const runSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery) {
        dispatch({ type: 'CLEAR_RESULTS' });
        updateDecorations([], -1);
        return;
      }

      const results = findMatches(editor.state.doc, searchQuery, { caseSensitive, wholeWord });

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
        dispatch({ type: 'SET_RESULTS', matches: results, currentIndex: nearestIndex });
        updateDecorations(results, nearestIndex);
        scrollToMatch(results[nearestIndex]);
      } else {
        dispatch({ type: 'SET_RESULTS', matches: results, currentIndex: -1 });
        updateDecorations(results, -1);
      }
    },
    [editor, caseSensitive, wholeWord, updateDecorations, scrollToMatch],
  );

  // Navigate to next match
  const goToNext = useCallback(() => {
    if (matches.length === 0) return;
    const next = (currentIndex + 1) % matches.length;
    dispatch({ type: 'SET_CURRENT_INDEX', currentIndex: next });
    updateDecorations(matches, next);
    scrollToMatch(matches[next]);
  }, [matches, currentIndex, updateDecorations, scrollToMatch]);

  // Navigate to previous match
  const goToPrevious = useCallback(() => {
    if (matches.length === 0) return;
    const prev = (currentIndex - 1 + matches.length) % matches.length;
    dispatch({ type: 'SET_CURRENT_INDEX', currentIndex: prev });
    updateDecorations(matches, prev);
    scrollToMatch(matches[prev]);
  }, [matches, currentIndex, updateDecorations, scrollToMatch]);

  // Replace current match
  const replaceCurrent = useCallback(() => {
    if (matches.length === 0 || currentIndex < 0 || editor.isDestroyed) return;
    const match = matches[currentIndex];

    editor
      .chain()
      .focus()
      .deleteRange({ from: match.from, to: match.to })
      .insertContentAt(match.from, replacement)
      .run();

    // Immediately invalidate stale matches so UI reflects the change,
    // then re-search on next tick to get accurate positions.
    dispatch({ type: 'CLEAR_RESULTS' });
    updateDecorations([], -1);
    setTimeout(() => runSearch(query), 0);
  }, [editor, matches, currentIndex, replacement, query, runSearch, updateDecorations]);

  // Replace all matches
  const replaceAll = useCallback(() => {
    if (matches.length === 0 || editor.isDestroyed) return;

    // Build a single transaction replacing all matches in reverse order
    // to preserve earlier positions as later ones are modified.
    const { tr } = editor.state;
    const sortedMatches = [...matches].sort((a, b) => b.from - a.from);

    for (const match of sortedMatches) {
      if (replacement) {
        tr.replaceWith(match.from, match.to, editor.state.schema.text(replacement));
      } else {
        tr.delete(match.from, match.to);
      }
    }

    editor.view.dispatch(tr);

    // Immediately invalidate stale matches, then re-search
    dispatch({ type: 'CLEAR_RESULTS' });
    updateDecorations([], -1);
    setTimeout(() => runSearch(query), 0);
  }, [editor, matches, replacement, query, runSearch, updateDecorations]);

  // Close search and clear highlights
  const close = useCallback(() => {
    dispatch({ type: 'CLOSE' });
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

      // Pre-fill with selected text
      const { from, to } = editor.state.selection;
      let prefill = '';
      if (from !== to) {
        const selectedText = editor.state.doc.textBetween(from, to, '');
        if (selectedText && selectedText.length < 200) {
          prefill = selectedText;
        }
      }

      dispatch({ type: 'OPEN', query: prefill, showReplace: withReplace });
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
          onChange={(e) => dispatch({ type: 'SET_QUERY', query: e.target.value })}
          onKeyDown={handleFindKeyDown}
        />
        <button
          className={`quartz-search-toggle ${caseSensitive ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_CASE_SENSITIVE' })}
          title="Match Case"
        >
          Aa
        </button>
        <button
          className={`quartz-search-toggle ${wholeWord ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_WHOLE_WORD' })}
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
            onClick={() => dispatch({ type: 'SET_SHOW_REPLACE', showReplace: true })}
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
        <ReplaceRow
          replacement={replacement}
          onReplacementChange={(value) => dispatch({ type: 'SET_REPLACEMENT', replacement: value })}
          onReplaceCurrent={replaceCurrent}
          onReplaceAll={replaceAll}
          onKeyDown={handleReplaceKeyDown}
          disabled={matches.length === 0}
        />
      )}
    </div>
  );
}
