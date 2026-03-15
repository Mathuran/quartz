import type { JSONContent } from '@tiptap/core';
import type { NodeSerializer, SerializeContext } from './serializers/types';
import {
  headingSerializer,
  paragraphSerializer,
  bulletListSerializer,
  orderedListSerializer,
  taskListSerializer,
  codeBlockSerializer,
  blockquoteSerializer,
  tableSerializer,
  imageSerializer,
  horizontalRuleSerializer,
  detailsSerializer,
  calloutSerializer,
  serializeInline,
} from './serializers';

/** All registered node serializers, looked up by node type */
const serializerMap: Map<string, NodeSerializer> = new Map();

/** Register all built-in serializers */
const builtInSerializers: NodeSerializer[] = [
  headingSerializer,
  paragraphSerializer,
  bulletListSerializer,
  orderedListSerializer,
  taskListSerializer,
  codeBlockSerializer,
  blockquoteSerializer,
  tableSerializer,
  imageSerializer,
  horizontalRuleSerializer,
  detailsSerializer,
  calloutSerializer,
];

for (const serializer of builtInSerializers) {
  for (const nodeType of serializer.nodeTypes) {
    serializerMap.set(nodeType, serializer);
  }
}

/** The serialize context passed to each node serializer */
const context: SerializeContext = {
  serializeNode,
  serializeInline,
};

function serializeNode(node: JSONContent, indent: number): string | null {
  const nodeType = node.type || '';

  // listItem and taskItem are serialized by their parent list, not standalone
  if (nodeType === 'listItem' || nodeType === 'taskItem') {
    return null;
  }

  // hardBreak at block level is skipped
  if (nodeType === 'hardBreak') {
    return null;
  }

  const serializer = serializerMap.get(nodeType);
  if (!serializer) {
    return null;
  }

  return serializer.serialize(node, indent, context);
}

function needsBlankLine(prevType: string): boolean {
  // Most block-level elements need a blank line between them
  if (!prevType) return false;
  return true;
}

export function serializeMarkdown(doc: JSONContent, frontmatter?: string | null): string {
  let result = '';

  if (frontmatter) {
    result += `---\n${frontmatter}\n---\n\n`;
  }

  if (!doc.content || doc.content.length === 0) return result;
  const parts: string[] = [];
  let isFirst = true;
  let prevType = '';

  for (const node of doc.content) {
    const serialized = serializeNode(node, 0);
    if (serialized !== null) {
      if (!isFirst && needsBlankLine(prevType)) {
        parts.push('');
      }
      parts.push(serialized);
      prevType = node.type || '';
      isFirst = false;
    }
  }

  let body = parts.join('\n');
  // Ensure single trailing newline
  if (body && !body.endsWith('\n')) {
    body += '\n';
  }
  result += body;
  return result;
}
