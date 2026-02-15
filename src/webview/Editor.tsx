import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import { CustomCodeBlockLowlight } from './extensions/codeBlockExtension';
import Blockquote from '@tiptap/extension-blockquote';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import Code from '@tiptap/extension-code';
import Link from '@tiptap/extension-link';
import History from '@tiptap/extension-history';
import HardBreak from '@tiptap/extension-hard-break';
import Gapcursor from '@tiptap/extension-gapcursor';
import Dropcursor from '@tiptap/extension-dropcursor';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { common, createLowlight } from 'lowlight';

import { parseMarkdown } from '../markdown/parser';
import { serializeMarkdown } from '../markdown/serializer';
import { PageContainer } from './components/PageContainer';
import { SlashMenu } from './components/SlashMenu';
import { FormattingToolbar } from './components/FormattingToolbar';
import { slashCommandExtension } from './extensions/slashCommandExtension';
import { keyboardShortcutsExtension } from './extensions/keyboardShortcuts';
import { virtualRenderingExtension } from './extensions/virtualRendering';
import { linkInputRuleExtension } from './extensions/linkInputRule';
import type { EditorConfig } from './types';

const lowlight = createLowlight(common);

interface EditorProps {
  initialContent: string;
  config: EditorConfig;
  onUpdate: (markdown: string) => void;
}

/**
 * Safely parse markdown, returning the parsed doc and any error encountered.
 */
function safeParse(markdown: string): { doc: JSONContent; error: string | null } {
  if (!markdown || !markdown.trim()) {
    return { doc: { type: 'doc', content: [{ type: 'paragraph' }] }, error: null };
  }

  try {
    const doc = parseMarkdown(markdown);
    console.log('[Quartz] Parsed markdown into', doc.content?.length ?? 0, 'top-level nodes');
    return { doc, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Quartz] Failed to parse markdown:', message);
    return {
      doc: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: markdown }] }],
      },
      error: `Parse error: ${message}`,
    };
  }
}

export function Editor({ initialContent, config, onUpdate }: EditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialContentRef = useRef(initialContent);
  const [contentWarning, setContentWarning] = useState<string | null>(null);

  const { doc: initialDoc, error: parseError } = safeParse(initialContentRef.current);

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
      BulletList,
      OrderedList,
      ListItem,
      CustomCodeBlockLowlight.configure({ lowlight }),
      Blockquote,
      HorizontalRule,
      Bold,
      Italic,
      Strike,
      Code,
      Link.configure({ openOnClick: false }),
      History,
      HardBreak,
      Gapcursor,
      Dropcursor.configure({ color: '#3b82f6', width: 2 }),
      Placeholder.configure({ placeholder: 'Type / for commands...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: false }),
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      slashCommandExtension,
      keyboardShortcutsExtension,
      virtualRenderingExtension,
      linkInputRuleExtension,
    ],
    content: initialDoc,
    onCreate: ({ editor }) => {
      // Detect if Tiptap silently dropped content during schema validation
      const inputLength = initialContentRef.current.trim().length;
      if (inputLength > 50) {
        const editorText = editor.getText().trim();
        if (editorText.length < 10) {
          const msg = 'The document could not be fully rendered. Some content may use unsupported formatting.';
          console.warn('[Quartz] Content appears to have been dropped by the editor.');
          console.warn('[Quartz] Input length:', inputLength, '| Editor text length:', editorText.length);
          console.warn('[Quartz] Parsed JSON:', JSON.stringify(initialDoc, null, 2).slice(0, 2000));
          setContentWarning(msg);
        }
      }
    },
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const markdown = serializeMarkdown(editor.getJSON());
        onUpdate(markdown);
      }, 300);
    },
    editorProps: {
      attributes: {
        class: 'quartz-editor-content',
        spellcheck: 'true',
      },
    },
  });

  // Show parse error as warning
  useEffect(() => {
    if (parseError) {
      setContentWarning(parseError);
    }
  }, [parseError]);

  // Update content when external changes come in
  useEffect(() => {
    if (editor && initialContent !== initialContentRef.current) {
      initialContentRef.current = initialContent;
      const { doc, error } = safeParse(initialContent);
      if (error) {
        setContentWarning(error);
      } else {
        setContentWarning(null);
      }
      editor.commands.setContent(doc);

      // Verify content was preserved after setContent
      setTimeout(() => {
        if (editor && initialContent.trim().length > 50) {
          const editorText = editor.getText().trim();
          if (editorText.length < 10) {
            console.warn('[Quartz] Content may have been dropped after external update.');
            setContentWarning('The document could not be fully rendered. Some content may use unsupported formatting.');
          }
        }
      }, 100);
    }
  }, [editor, initialContent]);

  // Flush pending changes on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!editor) return null;

  return (
    <PageContainer config={config}>
      {contentWarning && (
        <div className="quartz-content-warning">
          <span>{contentWarning}</span>
          <button
            onClick={() => setContentWarning(null)}
            className="quartz-warning-dismiss"
          >
            Dismiss
          </button>
        </div>
      )}
      <FormattingToolbar editor={editor} />
      <SlashMenu editor={editor} />
      <EditorContent
        editor={editor}
        style={{
          fontFamily: config.fontFamily === 'inherit' ? undefined : config.fontFamily,
          fontSize: `${config.fontSize}px`,
        }}
      />
    </PageContainer>
  );
}
