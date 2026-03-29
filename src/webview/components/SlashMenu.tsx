import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Editor } from '@tiptap/react';
import { slashCommands, type SlashCommand } from '../commands/slashCommands';
import { computeMenuTop } from '../utils/menuPosition';

interface SlashMenuProps {
  editor: Editor;
}

export function SlashMenu({ editor }: SlashMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [openUpward, setOpenUpward] = useState(false);
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

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
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

      setIsOpen(false);
      setQuery('');
    },
    [editor],
  );

  // The slash menu is triggered by the slashCommandExtension
  // This component just renders the UI; the extension handles detection
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      if (event.detail.type === 'open') {
        setIsOpen(true);
        setQuery('');
        const pos = event.detail.position || { anchorTop: 0, anchorBottom: 0, left: 0 };
        const MENU_MAX_HEIGHT = 320;
        const { top, openUpward: up } = computeMenuTop(
          { top: pos.anchorTop, bottom: pos.anchorBottom },
          MENU_MAX_HEIGHT,
        );
        setPosition({ top, left: pos.left });
        setOpenUpward(up);
      } else if (event.detail.type === 'close') {
        setIsOpen(false);
        setQuery('');
      } else if (event.detail.type === 'query') {
        setQuery(event.detail.query || '');
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
        setIsOpen(false);
        setQuery('');
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
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
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
      style={{ top: position.top, left: position.left }}
    >
      {filteredCommands.length === 0 ? (
        <div className="quartz-slash-menu-empty">No results</div>
      ) : (
        filteredCommands.map((cmd, i) => (
          <button
            key={cmd.id}
            className={`quartz-slash-menu-item ${i === selectedIndex ? 'selected' : ''}`}
            onClick={() => executeCommand(cmd)}
            onMouseEnter={() => setSelectedIndex(i)}
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
