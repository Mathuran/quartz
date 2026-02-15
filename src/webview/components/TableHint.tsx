import React from 'react';

interface TableHintProps {
  position: { top: number; left: number } | null;
}

// Detect OS for correct shortcut symbols
const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
// Use Ctrl+Enter/Backspace to avoid VS Code and table cell navigation conflicts
const ctrlKey = isMac ? '\u2303' : 'Ctrl';
const shiftKey = isMac ? '\u21e7' : 'Shift';
const enterKey = isMac ? '\u21a9' : 'Enter';
const backspaceKey = isMac ? '\u232b' : 'Bksp';

/**
 * TableHint displays keyboard shortcuts for table editing.
 * Shows below the table when the cursor is inside a table cell.
 */
export function TableHint({ position }: TableHintProps) {
  if (!position) return null;

  const shortcuts = isMac
    ? `${ctrlKey}${enterKey} Add row  \u00b7  ${ctrlKey}${shiftKey}${enterKey} Add col  \u00b7  ${ctrlKey}${backspaceKey} Del row  \u00b7  ${ctrlKey}${shiftKey}${backspaceKey} Del col`
    : `${ctrlKey}+${enterKey} Add row  \u00b7  ${ctrlKey}+${shiftKey}+${enterKey} Add col  \u00b7  ${ctrlKey}+${backspaceKey} Del row  \u00b7  ${ctrlKey}+${shiftKey}+${backspaceKey} Del col`;

  return (
    <div
      className="quartz-table-hint"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {shortcuts}
    </div>
  );
}
