import React, { useReducer, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Editor } from '@tiptap/react';
import { slashCommands, type SlashCommand } from '../commands/slashCommands';
import { computeMenuTop } from '../utils/menuPosition';

interface SlashMenuProps {
  editor: Editor;
}

interface SlashMenuState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  position: { top?: number; bottom?: number; left: number };
  openUpward: boolean;
}

type SlashMenuAction =
  | { type: 'OPEN'; position: { top?: number; bottom?: number; left: number }; openUpward: boolean }
  | { type: 'CLOSE' }
  | { type: 'SET_QUERY'; query: string }
  | { type: 'SET_SELECTED_INDEX'; index: number };

function slashMenuReducer(state: SlashMenuState, action: SlashMenuAction): SlashMenuState {
  switch (action.type) {
    case 'OPEN':
      return { ...state, isOpen: true, query: '', selectedIndex: 0, position: action.position, openUpward: action.openUpward };
    case 'CLOSE':
      return { ...state, isOpen: false, query: '', selectedIndex: 0 };
    case 'SET_QUERY':
      return { ...state, query: action.query, selectedIndex: 0 };
    case 'SET_SELECTED_INDEX':
      return { ...state, selectedIndex: action.index };
    default:
      return state;
  }
}

const initialSlashMenuState: SlashMenuState = {
  isOpen: false,
  query: '',
  selectedIndex: 0,
  position: { top: 0, left: 0 },
  openUpward: false,
};

export function SlashMenu({ editor }: SlashMenuProps) {
  const [state, dispatch] = useReducer(slashMenuReducer, initialSlashMenuState);
  const { isOpen, query, selectedIndex, position, openUpward } = state;
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = useMemo(() => {
    return slashCommands.filter((cmd) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        cmd.label.toLowerCase().includes(q) || cmd.aliases.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [query]);

  const executeCommand = useCallback(
    (cmd: SlashCommand) => {
      // Delete the slash trigger text and execute command in ONE transaction
      // This ensures undo reverts both operations together
      const { state } = editor;
      const { $from } = state.selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      const slashIndex = textBefore.lastIndexOf('/');

      if (slashIndex >= 0) {
        // Calculate the absolute position of the slash
        const blockStart = $from.start();
        const deleteFrom = blockStart + slashIndex;
        const deleteTo = $from.pos;

        // Build a single chain that deletes slash text AND executes the command
        // We use command() to inject the command's action into our chain
        editor
          .chain()
          .deleteRange({ from: deleteFrom, to: deleteTo })
          .command(({ commands }) => {
            // Execute the command's action within this transaction
            // Map command IDs to their chain operations
            switch (cmd.id) {
              case 'heading1':
                return commands.toggleHeading({ level: 1 });
              case 'heading2':
                return commands.toggleHeading({ level: 2 });
              case 'heading3':
                return commands.toggleHeading({ level: 3 });
              case 'heading4':
                return commands.toggleHeading({ level: 4 });
              case 'heading5':
                return commands.toggleHeading({ level: 5 });
              case 'heading6':
                return commands.toggleHeading({ level: 6 });
              case 'bulletList':
                return commands.toggleBulletList();
              case 'numberedList':
                return commands.toggleOrderedList();
              case 'taskList':
                return commands.toggleTaskList();
              case 'codeBlock':
                return commands.toggleCodeBlock();
              case 'blockquote':
                return commands.toggleBlockquote();
              case 'divider':
                return commands.setHorizontalRule();
              case 'table':
                return commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
              case 'image': {
                const url = window.prompt('Enter image URL');
                if (url) {
                  return commands.setImage({ src: url });
                }
                return true;
              }
              case 'callout':
                return commands.setCallout({ calloutType: 'note' });
              case 'callout-warning':
                return commands.setCallout({ calloutType: 'warning' });
              case 'callout-tip':
                return commands.setCallout({ calloutType: 'tip' });
              case 'callout-danger':
                return commands.setCallout({ calloutType: 'danger' });
              case 'callout-info':
                return commands.setCallout({ calloutType: 'info' });
              case 'callout-example':
                return commands.setCallout({ calloutType: 'example' });
              case 'callout-quote':
                return commands.setCallout({ calloutType: 'quote' });
              case 'callout-abstract':
                return commands.setCallout({ calloutType: 'abstract' });
              default:
                return true;
            }
          })
          .run();
      } else {
        // No slash to delete, just execute the command normally
        cmd.command(editor);
      }

      dispatch({ type: 'CLOSE' });
    },
    [editor],
  );

  // The slash menu is triggered by the slashCommandExtension
  // This component just renders the UI; the extension handles detection
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      if (event.detail.type === 'open') {
        const pos = event.detail.position || { anchorTop: 0, anchorBottom: 0, left: 0 };
        const MENU_MAX_HEIGHT = 320;
        const GAP = 4;
        const { top, openUpward: up } = computeMenuTop(
          { top: pos.anchorTop, bottom: pos.anchorBottom },
          MENU_MAX_HEIGHT,
        );
        const newPosition = up
          ? { bottom: window.innerHeight - pos.anchorTop + GAP, left: pos.left }
          : { top, left: pos.left };
        dispatch({ type: 'OPEN', position: newPosition, openUpward: up });
      } else if (event.detail.type === 'close') {
        dispatch({ type: 'CLOSE' });
      } else if (event.detail.type === 'query') {
        dispatch({ type: 'SET_QUERY', query: event.detail.query || '' });
      }
    };

    window.addEventListener('slashMenu', handler as EventListener);
    return () => window.removeEventListener('slashMenu', handler as EventListener);
  }, []);

  // Close on click outside the menu
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        dispatch({ type: 'CLOSE' });
        window.dispatchEvent(new CustomEvent('slashMenu', { detail: { type: 'close' } }));
      }
    };
    // Use setTimeout so the click that opened the menu doesn't immediately close it
    const id = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        dispatch({ type: 'SET_SELECTED_INDEX', index: Math.min(selectedIndex + 1, filteredCommands.length - 1) });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        dispatch({ type: 'SET_SELECTED_INDEX', index: Math.max(selectedIndex - 1, 0) });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        dispatch({ type: 'CLOSE' });
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, selectedIndex, filteredCommands, executeCommand]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={`quartz-slash-menu${openUpward ? ' quartz-slash-menu--up' : ''}`}
      style={{
        ...(openUpward ? { bottom: position.bottom } : { top: position.top }),
        left: position.left,
      }}
    >
      {filteredCommands.length === 0 ? (
        <div className="quartz-slash-menu-empty">No results</div>
      ) : (
        filteredCommands.map((cmd, i) => (
          <button
            key={cmd.id}
            className={`quartz-slash-menu-item ${i === selectedIndex ? 'selected' : ''}`}
            onClick={() => executeCommand(cmd)}
            onMouseEnter={() => dispatch({ type: 'SET_SELECTED_INDEX', index: i })}
          >
            <span className="quartz-slash-menu-icon">{cmd.icon}</span>
            <div className="quartz-slash-menu-text">
              <span className="quartz-slash-menu-label">{cmd.label}</span>
              <span className="quartz-slash-menu-description">{cmd.description}</span>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
