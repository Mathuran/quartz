import type { JSONContent } from '@tiptap/core';

export interface SerializeContext {
  /** Serialize a block-level node, returning its markdown string or null if unhandled */
  serializeNode(node: JSONContent, indent: number): string | null;
  /** Serialize an array of inline nodes (text, hardBreak, image) into a markdown string */
  serializeInline(nodes: JSONContent[]): string;
}

export interface NodeSerializer {
  /** The TipTap node type(s) this serializer handles */
  nodeTypes: string[];
  /** Serialize the node into a markdown string, or return null to skip */
  serialize(node: JSONContent, indent: number, context: SerializeContext): string | null;
}
