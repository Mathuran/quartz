import React from 'react';

interface TableHintProps {
  visible: boolean;
}

// Detect OS for correct shortcut symbols
const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
const ctrlKey = isMac ? '\u2303' : 'Ctrl+';
const shiftKey = isMac ? '\u21e7' : 'Shift+';
const enterKey = isMac ? '\u21a9' : 'Enter';
const backspaceKey = isMac ? '\u232b' : 'Bksp';

const shortcuts = [
  { keys: `${ctrlKey}${enterKey}`, label: 'Add row' },
  { keys: `${ctrlKey}${shiftKey}${enterKey}`, label: 'Add col' },
  { keys: `${ctrlKey}${backspaceKey}`, label: 'Del row' },
  { keys: `${ctrlKey}${shiftKey}${backspaceKey}`, label: 'Del col' },
];

/**
 * TableHint displays keyboard shortcuts for table editing.
 * Shows as a centered toolbar bar at the top when cursor is inside a table.
 */
export function TableHint({ visible }: TableHintProps) {
  if (!visible) return null;

  return (
    <div className="quartz-table-hint">
      {shortcuts.map((shortcut, index) => (
        <div key={index} className="quartz-table-hint-item">
          <kbd className="quartz-table-hint-keys">{shortcut.keys}</kbd>
          <span className="quartz-table-hint-label">{shortcut.label}</span>
        </div>
      ))}
    </div>
  );
}
