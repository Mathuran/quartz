import React from 'react';

interface TableHintProps {
  position: { top: number; left: number } | null;
}

// Detect OS for correct shortcut symbols
const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
const modKey = isMac ? '\u2318' : 'Ctrl';
const altKey = isMac ? '\u2325' : 'Alt';

/**
 * TableHint displays keyboard shortcuts for table editing.
 * Shows below the table when the cursor is inside a table cell.
 */
export function TableHint({ position }: TableHintProps) {
  if (!position) return null;

  const shortcuts = isMac
    ? `${modKey}${altKey}\u2193 Add row  \u00b7  ${modKey}${altKey}\u2192 Add column  \u00b7  ${modKey}${altKey}\u232b Delete row`
    : `${modKey}+${altKey}+\u2193 Add row  \u00b7  ${modKey}+${altKey}+\u2192 Add column  \u00b7  ${modKey}+${altKey}+Backspace Delete row`;

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
