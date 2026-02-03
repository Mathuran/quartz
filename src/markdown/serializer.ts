import type { JSONContent } from '@tiptap/core';

export function serializeMarkdown(doc: JSONContent): string {
  if (!doc.content || doc.content.length === 0) return '';
  const parts: string[] = [];
  let isFirst = true;
  let prevType = '';

  for (const node of doc.content) {
    const serialized = serializeNode(node, 0);
    if (serialized !== null) {
      if (!isFirst && needsBlankLine(prevType, node.type || '')) {
        parts.push('');
      }
      parts.push(serialized);
      prevType = node.type || '';
      isFirst = false;
    }
  }

  let result = parts.join('\n');
  // Ensure single trailing newline
  if (result && !result.endsWith('\n')) {
    result += '\n';
  }
  return result;
}

function needsBlankLine(prevType: string, currentType: string): boolean {
  // Most block-level elements need a blank line between them
  if (!prevType) return false;
  return true;
}

function serializeNode(node: JSONContent, indent: number): string | null {
  switch (node.type) {
    case 'paragraph':
      return serializeParagraph(node);

    case 'heading':
      return serializeHeading(node);

    case 'bulletList':
      return serializeBulletList(node, indent);

    case 'orderedList':
      return serializeOrderedList(node, indent);

    case 'taskList':
      return serializeTaskList(node, indent);

    case 'listItem':
      return serializeListItem(node, indent);

    case 'taskItem':
      return serializeTaskItem(node, indent);

    case 'codeBlock':
      return serializeCodeBlock(node);

    case 'blockquote':
      return serializeBlockquote(node);

    case 'horizontalRule':
      return '---';

    case 'table':
      return serializeTable(node);

    case 'image':
      return serializeImage(node);

    case 'details': {
      const summary = node.content?.[0];
      const body = node.content?.[1];
      const summaryText = summary?.content
        ? serializeInline(summary.content)
        : '';
      const bodyContent = body?.content
        ? body.content.map((n) => serializeNode(n, 0)).filter(Boolean).join('\n\n')
        : '';
      return `<details>\n<summary>${summaryText}</summary>\n\n${bodyContent}\n\n</details>`;
    }

    case 'hardBreak':
      return null;

    default:
      return null;
  }
}

function serializeParagraph(node: JSONContent): string {
  if (!node.content || node.content.length === 0) return '';
  return serializeInline(node.content);
}

function serializeHeading(node: JSONContent): string {
  const level = (node.attrs?.level as number) || 1;
  const prefix = '#'.repeat(level);
  const text = node.content ? serializeInline(node.content) : '';
  return `${prefix} ${text}`;
}

function serializeBulletList(node: JSONContent, indent: number): string {
  if (!node.content) return '';
  return node.content
    .map((item) => {
      const content = serializeListItemContent(item, indent);
      return `${' '.repeat(indent)}- ${content}`;
    })
    .join('\n');
}

function serializeOrderedList(node: JSONContent, indent: number): string {
  if (!node.content) return '';
  const start = (node.attrs?.start as number) || 1;
  return node.content
    .map((item, i) => {
      const content = serializeListItemContent(item, indent);
      return `${' '.repeat(indent)}${start + i}. ${content}`;
    })
    .join('\n');
}

function serializeTaskList(node: JSONContent, indent: number): string {
  if (!node.content) return '';
  return node.content
    .map((item) => {
      const checked = item.attrs?.checked ? 'x' : ' ';
      const content = serializeListItemContent(item, indent);
      return `${' '.repeat(indent)}- [${checked}] ${content}`;
    })
    .join('\n');
}

function serializeListItem(_node: JSONContent, _indent: number): string | null {
  // List items are serialized by their parent list
  return null;
}

function serializeTaskItem(_node: JSONContent, _indent: number): string | null {
  return null;
}

function serializeListItemContent(item: JSONContent, indent: number): string {
  if (!item.content) return '';
  const parts: string[] = [];

  for (let i = 0; i < item.content.length; i++) {
    const child = item.content[i];
    if (child.type === 'paragraph') {
      parts.push(child.content ? serializeInline(child.content) : '');
    } else if (child.type === 'bulletList') {
      parts.push('\n' + serializeBulletList(child, indent + 2));
    } else if (child.type === 'orderedList') {
      parts.push('\n' + serializeOrderedList(child, indent + 2));
    } else if (child.type === 'taskList') {
      parts.push('\n' + serializeTaskList(child, indent + 2));
    }
  }

  return parts.join('');
}

function serializeCodeBlock(node: JSONContent): string {
  const language = (node.attrs?.language as string) || '';
  const text = node.content
    ? node.content.map((n) => n.text || '').join('')
    : '';
  return `\`\`\`${language}\n${text}\n\`\`\``;
}

function serializeBlockquote(node: JSONContent): string {
  if (!node.content) return '>';
  const inner = node.content
    .map((child) => serializeNode(child, 0))
    .filter((s): s is string => s !== null)
    .join('\n>\n');
  return inner
    .split('\n')
    .map((line) => (line ? `> ${line}` : '>'))
    .join('\n');
}

function serializeTable(node: JSONContent): string {
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
      const text = cellText(cell);
      if (colIdx < colWidths.length) {
        colWidths[colIdx] = Math.max(colWidths[colIdx], text.length);
      }
    });
  }

  // Header
  const headerCells = headerRow.content.map((cell, i) => {
    const text = cellText(cell);
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
      const text = cellText(cell);
      const width = i < colWidths.length ? colWidths[i] : text.length;
      return ` ${text.padEnd(width)} `;
    });
    return `|${cells.join('|')}|`;
  });

  return [headerLine, separatorLine, ...bodyLines].join('\n');
}

function cellText(cell: JSONContent): string {
  const paragraph = cell.content?.[0];
  if (!paragraph?.content) return '';
  return serializeInline(paragraph.content);
}

function serializeImage(node: JSONContent): string {
  const src = (node.attrs?.src as string) || '';
  const alt = (node.attrs?.alt as string) || '';
  return `![${alt}](${src})`;
}

function serializeInline(nodes: JSONContent[]): string {
  return nodes.map(serializeInlineNode).join('');
}

function serializeInlineNode(node: JSONContent): string {
  if (node.type === 'text') {
    let text = node.text || '';
    if (node.marks) {
      // Apply marks from innermost to outermost
      for (const mark of [...node.marks].reverse()) {
        text = applyMark(text, mark);
      }
    }
    return text;
  }

  if (node.type === 'hardBreak') {
    return '  \n';
  }

  if (node.type === 'image') {
    return serializeImage(node);
  }

  return '';
}

function applyMark(
  text: string,
  mark: { type: string; attrs?: Record<string, unknown> }
): string {
  switch (mark.type) {
    case 'bold':
      return `**${text}**`;
    case 'italic':
      return `*${text}*`;
    case 'strike':
      return `~~${text}~~`;
    case 'code':
      return `\`${text}\``;
    case 'link': {
      const href = (mark.attrs?.href as string) || '';
      return `[${text}](${href})`;
    }
    case 'highlight':
      return `==${text}==`;
    default:
      return text;
  }
}
