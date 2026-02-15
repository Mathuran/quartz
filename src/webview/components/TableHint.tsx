import React from 'react';

interface TableHintProps {
  position: { top: number; left: number } | null;
}

// Detect OS for correct shortcut symbols
const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
// Use Ctrl+Shift+Arrow to avoid VS Code conflicts (Ctrl = ⌃ on Mac)
const ctrlKey = isMac ? '\u2303' : 'Ctrl';
const shiftKey = isMac ? '\u21e7' : 'Shift';

/**
 * TableHint displays keyboard shortcuts for table editing.
 * Shows below the table when the cursor is inside a table cell.
 */
export function TableHint({ position }: TableHintProps) {
  if (!position) return null;

  const shortcuts = isMac
    ? `${ctrlKey}${shiftKey}\u2193 Add row  \u00b7  ${ctrlKey}${shiftKey}\u2192 Add col  \u00b7  ${ctrlKey}${shiftKey}\u2191 Del row  \u00b7  ${ctrlKey}${shiftKey}\u2190 Del col`
    : `${ctrlKey}+${shiftKey}+\u2193 Add row  \u00b7  ${ctrlKey}+${shiftKey}+\u2192 Add col  \u00b7  ${ctrlKey}+${shiftKey}+\u2191 Del row  \u00b7  ${ctrlKey}+${shiftKey}+\u2190 Del col`;

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
