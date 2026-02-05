import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { slashCommands, type SlashCommand } from '../commands/slashCommands';

interface SlashMenuProps {
  editor: Editor;
}

export function SlashMenu({ editor }: SlashMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = slashCommands.filter((cmd) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.aliases.some((a) => a.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeCommand = useCallback(
    (cmd: SlashCommand) => {
      // Delete the slash trigger text before executing the command
      const { state } = editor;
      const { $from } = state.selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      const slashIndex = textBefore.lastIndexOf('/');

      if (slashIndex >= 0) {
        // Calculate the absolute position of the slash
        const blockStart = $from.start();
        const deleteFrom = blockStart + slashIndex;
        const deleteTo = $from.pos;

        // Delete the slash and query, then execute the command
        editor
          .chain()
          .deleteRange({ from: deleteFrom, to: deleteTo })
          .run();
      }

      cmd.command(editor);
      setIsOpen(false);
      setQuery('');
    },
    [editor]
  );

  // The slash menu is triggered by the slashCommandExtension
  // This component just renders the UI; the extension handles detection
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      if (event.detail.type === 'open') {
        setIsOpen(true);
        setQuery('');
        setPosition(event.detail.position || { top: 0, left: 0 });
      } else if (event.detail.type === 'close') {
        setIsOpen(false);
        setQuery('');
      } else if (event.detail.type === 'query') {
        setQuery(event.detail.query || '');
      }
    };

    window.addEventListener('slashMenu' as any, handler as any);
    return () => window.removeEventListener('slashMenu' as any, handler as any);
  }, []);

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
      className="quartz-slash-menu"
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
