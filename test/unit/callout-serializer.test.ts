import { describe, it, expect } from 'vitest';
import { serializeMarkdown } from '../../src/markdown/serializer';
import type { JSONContent } from '@tiptap/core';

function makeCalloutDoc(attrs: Record<string, unknown>, content?: JSONContent[]): JSONContent {
  return {
    type: 'doc',
    content: [
      {
        type: 'callout',
        attrs,
        content: content || [{ type: 'paragraph' }],
      },
    ],
  };
}

describe('Callout Serializer', () => {
  it('should serialize a basic callout', () => {
    const doc = makeCalloutDoc(
      { calloutType: 'note', title: '', collapsed: false, foldable: false },
      [{ type: 'paragraph', content: [{ type: 'text', text: 'Some content' }] }],
    );
    const result = serializeMarkdown(doc);
    expect(result).toBe('> [!note]\n> Some content\n');
  });

  it('should serialize callout with title', () => {
    const doc = makeCalloutDoc(
      { calloutType: 'warning', title: 'Be careful', collapsed: false, foldable: false },
      [{ type: 'paragraph', content: [{ type: 'text', text: 'Content' }] }],
    );
    const result = serializeMarkdown(doc);
    expect(result).toBe('> [!warning] Be careful\n> Content\n');
  });

  it('should serialize collapsed callout', () => {
    const doc = makeCalloutDoc(
      { calloutType: 'tip', title: '', collapsed: true, foldable: true },
      [{ type: 'paragraph', content: [{ type: 'text', text: 'Hidden' }] }],
    );
    const result = serializeMarkdown(doc);
    expect(result).toBe('> [!tip]-\n> Hidden\n');
  });

  it('should serialize expanded foldable callout', () => {
    const doc = makeCalloutDoc(
      { calloutType: 'tip', title: '', collapsed: false, foldable: true },
      [{ type: 'paragraph', content: [{ type: 'text', text: 'Visible' }] }],
    );
    const result = serializeMarkdown(doc);
    expect(result).toBe('> [!tip]+\n> Visible\n');
  });

  it('should serialize callout with foldable and title', () => {
    const doc = makeCalloutDoc(
      { calloutType: 'danger', title: 'Watch out!', collapsed: true, foldable: true },
      [{ type: 'paragraph', content: [{ type: 'text', text: 'Content' }] }],
    );
    const result = serializeMarkdown(doc);
    expect(result).toBe('> [!danger]- Watch out!\n> Content\n');
  });

  it('should serialize multi-paragraph callout', () => {
    const doc = makeCalloutDoc(
      { calloutType: 'note', title: '', collapsed: false, foldable: false },
      [
        { type: 'paragraph', content: [{ type: 'text', text: 'First paragraph' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second paragraph' }] },
      ],
    );
    const result = serializeMarkdown(doc);
    expect(result).toBe('> [!note]\n> First paragraph\n>\n> Second paragraph\n');
  });

  it('should serialize empty callout (no real content)', () => {
    const doc = makeCalloutDoc(
      { calloutType: 'info', title: '', collapsed: false, foldable: false },
      [{ type: 'paragraph' }],
    );
    const result = serializeMarkdown(doc);
    expect(result).toBe('> [!info]\n');
  });

  it('should always serialize type as lowercase', () => {
    const doc = makeCalloutDoc(
      { calloutType: 'WARNING', title: '', collapsed: false, foldable: false },
      [{ type: 'paragraph', content: [{ type: 'text', text: 'Content' }] }],
    );
    const result = serializeMarkdown(doc);
    expect(result).toContain('> [!warning]');
  });
});
