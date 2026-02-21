import type { JSONContent } from '@tiptap/core';
import type { NodeSerializer, SerializeContext } from './types';

export const tableSerializer: NodeSerializer = {
  nodeTypes: ['table'],
  serialize(node: JSONContent, _indent: number, context: SerializeContext): string {
    if (!node.content || node.content.length === 0) return '';

    const rows = node.content;
    const headerRow = rows[0];
    const bodyRows = rows.slice(1);

    if (!headerRow?.content) return '';

    // Calculate column widths
    const colCount = headerRow.content.length;
    const colWidths: number[] = new Array(colCount).fill(3);

    for (const row of rows) {
      if (!row.content) continue;
      row.content.forEach((cell, colIdx) => {
        const text = cellText(cell, context);
        if (colIdx < colWidths.length) {
          colWidths[colIdx] = Math.max(colWidths[colIdx], text.length);
        }
      });
    }

    // Header
    const headerCells = headerRow.content.map((cell, i) => {
      const text = cellText(cell, context);
      return ` ${text.padEnd(colWidths[i])} `;
    });
    const headerLine = `|${headerCells.join('|')}|`;

    // Separator
    const separatorCells = colWidths.map((w) => ` ${'-'.repeat(w)} `);
    const separatorLine = `|${separatorCells.join('|')}|`;

    // Body rows
    const bodyLines = bodyRows.map((row) => {
      if (!row.content) return '';
      const cells = row.content.map((cell, i) => {
        const text = cellText(cell, context);
        const width = i < colWidths.length ? colWidths[i] : text.length;
        return ` ${text.padEnd(width)} `;
      });
      return `|${cells.join('|')}|`;
    });

    return [headerLine, separatorLine, ...bodyLines].join('\n');
  },
};

function cellText(cell: JSONContent, context: SerializeContext): string {
  const paragraph = cell.content?.[0];
  if (!paragraph?.content) return '';
  return context.serializeInline(paragraph.content);
}
