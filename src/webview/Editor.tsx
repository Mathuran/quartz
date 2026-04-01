import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
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
import { createLowlight } from 'lowlight';

import { parseMarkdown } from '../markdown/parser';
import { serializeMarkdown } from '../markdown/serializer';
import { PageContainer } from './components/PageContainer';
import { SlashMenu } from './components/SlashMenu';
import { TableOfContents } from './components/TableOfContents';
import { FormattingToolbar } from './components/FormattingToolbar';
import { TableHint } from './components/TableHint';
import { FrontmatterBanner } from './components/FrontmatterBanner';
import { slashCommandExtension } from './extensions/slashCommandExtension';
import { keyboardShortcutsExtension } from './extensions/keyboardShortcuts';
// import { dragHandleExtension } from './extensions/dragHandle'; // REMOVED
// import { virtualRenderingExtension } from './extensions/virtualRendering'; // REMOVED
import { linkInputRuleExtension } from './extensions/linkInputRule';
import { inputRulesExtension } from './extensions/inputRules';
import { CustomCodeBlockLowlight } from './extensions/codeBlockExtension';
import { CalloutExtension } from './extensions/calloutExtension';
import { SearchHighlightExtension } from './extensions/searchHighlightExtension';
import { SearchBar } from './components/SearchBar';
import { LinkDialog } from './components/LinkDialog';
import type { EditorConfig } from './types';

import './styles/callout.css';
import './styles/codeBlock.css';
import './styles/codeBlockThemes.css';
import './styles/tableOfContents.css';
import './styles/search.css';

// Create lowlight without languages initially — languages are loaded lazily
// to reduce the initial bundle size by ~120 KB. The empty lowlight still renders
// code blocks correctly; they just won't have syntax highlighting until languages load.
const lowlight = createLowlight();

// Lazy-load highlight.js common languages in the background.
// The language grammars (~120 KB) are split into a separate chunk by esbuild
// so they don't block the initial editor render.
import('./lowlightLanguages.js')
  .then((mod) => {
    const grammars = (mod as { grammars: Parameters<typeof lowlight.register>[0] }).grammars;
    if (grammars && typeof grammars === 'object') {
      lowlight.register(grammars);
    }
  })
  .catch((err: unknown) => {
    console.warn('[Quartz] Failed to lazy-load syntax highlighting languages:', err);
  });

interface EditorProps {
  initialContent: string;
  config: EditorConfig;
  onUpdate: (markdown: string) => void;
}

/**
 * Safely parse markdown, returning the parsed doc, frontmatter, and any error encountered.
 */
function safeParse(markdown: string): {
  doc: JSONContent;
  frontmatter: string | null;
  error: string | null;
} {
  if (!markdown || !markdown.trim()) {
    return {
      doc: { type: 'doc', content: [{ type: 'paragraph' }] },
      frontmatter: null,
      error: null,
    };
  }

  try {
    const { doc, frontmatter } = parseMarkdown(markdown);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Quartz] Parsed markdown into', doc.content?.length ?? 0, 'top-level nodes');
    }
    return { doc, frontmatter, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Quartz] Failed to parse markdown:', message);
    return {
      doc: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: markdown }] }],
      },
      frontmatter: null,
      error: `Parse error: ${message}`,
    };
  }
}

export function Editor({ initialContent, config, onUpdate }: EditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialContentRef = useRef(initialContent);

  // Parse initial content only once via useState initializer — not on every render
  const [initialParsed] = useState(() => safeParse(initialContent));
  const [contentWarning, setContentWarning] = useState<string | null>(initialParsed.error);
  const [showTableHint, setShowTableHint] = useState(false);

  const [frontmatter, setFrontmatter] = useState<string | null>(initialParsed.frontmatter);
  const frontmatterRef = useRef<string | null>(frontmatter);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  // Keep the ref in sync so TipTap's onUpdate closure always reads the latest value
  useEffect(() => {
    frontmatterRef.current = frontmatter;
  }, [frontmatter]);

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
      BulletList,
      OrderedList,
      ListItem,
      inputRulesExtension,
      CustomCodeBlockLowlight.configure({ lowlight }),
      CalloutExtension,
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
      // dragHandleExtension, // REMOVED
      // virtualRenderingExtension, // REMOVED
      linkInputRuleExtension,
      SearchHighlightExtension,
    ],
    content: initialParsed.doc,
    onCreate: ({ editor }) => {
      // Detect if Tiptap silently dropped content during schema validation
      const inputLength = initialContentRef.current.trim().length;
      if (inputLength > 50) {
        const editorText = editor.getText().trim();
        if (editorText.length < 10) {
          const msg =
            'The document could not be fully rendered. Some content may use unsupported formatting.';
          console.warn('[Quartz] Content appears to have been dropped by the editor.');
          console.warn(
            '[Quartz] Input length:',
            inputLength,
            '| Editor text length:',
            editorText.length,
          );
          console.warn('[Quartz] Parsed JSON:', JSON.stringify(initialParsed.doc, null, 2).slice(0, 2000));
          setContentWarning(msg);
        }
      }
    },
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const markdown = serializeMarkdown(editor.getJSON(), frontmatterRef.current);
        onUpdate(markdown);
      }, 300);
    },
    onSelectionUpdate: ({ editor }) => {
      const inTable =
        editor.isActive('table') || editor.isActive('tableCell') || editor.isActive('tableHeader');
      setShowTableHint(inTable);
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
      const { doc, frontmatter: newFrontmatter, error } = safeParse(initialContent);
      setFrontmatter(newFrontmatter);
      if (error) {
        setContentWarning(error);
      } else {
        setContentWarning(null);
      }
      // Replace content without adding to undo history using a direct
      // ProseMirror transaction with the addToHistory meta flag set to false.
      // This avoids fragile monkey-patching of editor.view.dispatch.
      const newDoc = editor.schema.nodeFromJSON(doc);
      const tr = editor.state.tr.replaceWith(0, editor.state.doc.content.size, newDoc.content);
      tr.setMeta('addToHistory', false);
      editor.view.dispatch(tr);

      // Verify content was preserved after setContent
      setTimeout(() => {
        if (editor && initialContent.trim().length > 50) {
          const editorText = editor.getText().trim();
          if (editorText.length < 10) {
            console.warn('[Quartz] Content may have been dropped after external update.');
            setContentWarning(
              'The document could not be fully rendered. Some content may use unsupported formatting.',
            );
          }
        }
      }, 100);
    }
  }, [editor, initialContent]);

  // Keep refs for flush-on-unmount so the cleanup closure reads the latest values
  const editorRef = useRef(editor);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Flush pending changes on unmount — serialize immediately so no edits are lost
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        // Flush: serialize current editor content and send the update
        const ed = editorRef.current;
        if (ed) {
          const markdown = serializeMarkdown(ed.getJSON(), frontmatterRef.current);
          onUpdateRef.current(markdown);
        }
      }
    };
  }, []);

  // Handle frontmatter changes from the banner textarea
  const handleFrontmatterChange = useCallback(
    (yaml: string) => {
      setFrontmatter(yaml);
      frontmatterRef.current = yaml;
      // Trigger a full document save with the updated frontmatter
      if (editor) {
        const markdown = serializeMarkdown(editor.getJSON(), yaml || null);
        onUpdate(markdown);
      }
    },
    [editor, onUpdate],
  );

  // Remove frontmatter entirely
  const handleFrontmatterRemove = useCallback(() => {
    setFrontmatter(null);
    frontmatterRef.current = null;
    // Trigger a save without frontmatter
    if (editor) {
      const markdown = serializeMarkdown(editor.getJSON(), null);
      onUpdate(markdown);
    }
  }, [editor, onUpdate]);

  // Link dialog handlers
  const handleLinkClick = useCallback(() => {
    setLinkDialogOpen(true);
  }, []);

  // Listen for insertLink event from VS Code extension (Cmd+K keybinding)
  useEffect(() => {
    const handler = () => setLinkDialogOpen(true);
    window.addEventListener('quartz:insertLink', handler);
    return () => window.removeEventListener('quartz:insertLink', handler);
  }, []);

  const handleLinkSubmit = useCallback(
    (url: string, text?: string) => {
      if (!editor) return;
      if (text) {
        // No selection — insert link with display text
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'text',
            marks: [{ type: 'link', attrs: { href: url } }],
            text,
          })
          .run();
      } else {
        // Selection exists — wrap it in a link
        editor.chain().focus().setLink({ href: url }).run();
      }
      setLinkDialogOpen(false);
    },
    [editor],
  );

  const handleLinkCancel = useCallback(() => {
    setLinkDialogOpen(false);
    editor?.commands.focus();
  }, [editor]);

  if (!editor) return null;

  return (
    <PageContainer>
      {contentWarning && (
        <div className="quartz-content-warning">
          <span>{contentWarning}</span>
          <button onClick={() => setContentWarning(null)} className="quartz-warning-dismiss">
            Dismiss
          </button>
        </div>
      )}
      <FormattingToolbar editor={editor} onLinkClick={handleLinkClick} />
      <LinkDialog
        isOpen={linkDialogOpen}
        onSubmit={handleLinkSubmit}
        onCancel={handleLinkCancel}
        initialText={editor.state.doc.textBetween(
          editor.state.selection.from,
          editor.state.selection.to,
          '',
        )}
        hasSelection={editor.state.selection.from !== editor.state.selection.to}
      />
      <SearchBar editor={editor} />
      <SlashMenu editor={editor} />
      <TableOfContents editor={editor} />
      <TableHint visible={showTableHint} />
      <FrontmatterBanner
        frontmatter={frontmatter}
        onChange={handleFrontmatterChange}
        onRemove={handleFrontmatterRemove}
      />
      <EditorContent editor={editor} />
    </PageContainer>
  );
}
