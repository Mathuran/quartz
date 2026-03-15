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

    // Extract alignment from header cells
    const alignments: (string | null)[] = headerRow.content.map((cell) => {
      const align = cell.attrs?.textAlign as string | undefined;
      return align || null;
    });

    // Header
    const headerCells = headerRow.content.map((cell, i) => {
      const text = cellText(cell, context);
      return ` ${text.padEnd(colWidths[i])} `;
    });
    const headerLine = `|${headerCells.join('|')}|`;

    // Separator with alignment
    const separatorCells = colWidths.map((w, i) => {
      const align = i < alignments.length ? alignments[i] : null;
      return buildSeparatorCell(w, align);
    });
    const separatorLine = `|${separatorCells.join('|')}|`;

    // Body rows
    const bodyLines = bodyRows.map((row) => {
      if (!row.content || row.content.length === 0) {
        // Empty body row: produce proper empty-cell row matching column count
        const emptyCells = colWidths.map((w) => ` ${' '.repeat(w)} `);
        return `|${emptyCells.join('|')}|`;
      }
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

/**
 * Build a separator cell with optional alignment markers.
 *
 * - `left`   → `:---`
 * - `right`  → `---:`
 * - `center` → `:---:`
 * - none     → `---`
 */
function buildSeparatorCell(width: number, align: string | null): string {
  if (align === 'center') {
    // `:` + dashes + `:` — need at least 1 dash, so dashes = max(1, width - 2)
    const dashes = Math.max(1, width - 2);
    return ` :${'-'.repeat(dashes)}: `;
  }
  if (align === 'left') {
    // `:` + dashes — dashes = max(1, width - 1)
    const dashes = Math.max(1, width - 1);
    return ` :${'-'.repeat(dashes)} `;
  }
  if (align === 'right') {
    // dashes + `:` — dashes = max(1, width - 1)
    const dashes = Math.max(1, width - 1);
    return ` ${'-'.repeat(dashes)}: `;
  }
  return ` ${'-'.repeat(width)} `;
}

function cellText(cell: JSONContent, context: SerializeContext): string {
  const paragraph = cell.content?.[0];
  if (!paragraph?.content) return '';
  return context.serializeInline(paragraph.content);
}
