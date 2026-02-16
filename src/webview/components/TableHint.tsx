import React from 'react';

interface TableHintProps {
  position: { top: number } | null;
}

// Detect OS for correct shortcut symbols
const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
const ctrlKey = isMac ? '\u2303' : 'Ctrl+';
const shiftKey = isMac ? '\u21e7' : 'Shift+';
const enterKey = isMac ? '\u21a9' : 'Enter';
const backspaceKey = isMac ? '\u232b' : 'Bksp';

const shortcuts = [
  { keys: `${ctrlKey}${enterKey}`, label: 'Add row' },
  { keys: `${ctrlKey}${shiftKey}${enterKey}`, label: 'Add column' },
  { keys: `${ctrlKey}${backspaceKey}`, label: 'Delete row' },
  { keys: `${ctrlKey}${shiftKey}${backspaceKey}`, label: 'Delete column' },
];

/**
 * TableHint displays keyboard shortcuts for table editing.
 * Shows as a card on the left side when cursor is inside a table cell.
 */
export function TableHint({ position }: TableHintProps) {
  if (!position) return null;

  return (
    <div
      className="quartz-table-hint"
      style={{ top: position.top }}
    >
      <div className="quartz-table-hint-title">Table Shortcuts</div>
      {shortcuts.map((shortcut, index) => (
        <div key={index} className="quartz-table-hint-row">
          <kbd className="quartz-table-hint-keys">{shortcut.keys}</kbd>
          <span className="quartz-table-hint-label">{shortcut.label}</span>
        </div>
      ))}
    </div>
  );
}
