import React, { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
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
import { dragHandleExtension } from './extensions/dragHandle';
import type { EditorConfig } from './types';

const lowlight = createLowlight(common);

interface EditorProps {
  initialContent: string;
  config: EditorConfig;
  onUpdate: (markdown: string) => void;
}

export function Editor({ initialContent, config, onUpdate }: EditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialContentRef = useRef(initialContent);

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
      BulletList,
      OrderedList,
      ListItem,
      CodeBlockLowlight.configure({ lowlight }),
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
      dragHandleExtension,
    ],
    content: parseMarkdown(initialContentRef.current),
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

  // Update content when external changes come in
  useEffect(() => {
    if (editor && initialContent !== initialContentRef.current) {
      initialContentRef.current = initialContent;
      const parsed = parseMarkdown(initialContent);
      editor.commands.setContent(parsed);
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
