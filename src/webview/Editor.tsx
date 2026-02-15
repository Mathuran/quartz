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
import { CustomCodeBlockLowlight } from './extensions/codeBlockExtension';
import Blockquote from '@tiptap/extension-blockquote';
import { CustomHorizontalRule } from './extensions/horizontalRuleExtension';
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
import { TableHint } from './components/TableHint';
import { LinkDialog } from './components/LinkDialog';
import { slashCommandExtension } from './extensions/slashCommandExtension';
import { keyboardShortcutsExtension } from './extensions/keyboardShortcuts';
import { virtualRenderingExtension } from './extensions/virtualRendering';
import { linkInputRuleExtension } from './extensions/linkInputRule';
import { combinedMarksInputRuleExtension } from './extensions/combinedMarksInputRule';
import { taskListInputRuleExtension } from './extensions/taskListInputRule';
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

  // Table hint state
  const [tableHintPosition, setTableHintPosition] = useState<{ top: number; left: number } | null>(null);
  const tableHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInTableRef = useRef(false);

  // Link dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDialogSelection, setLinkDialogSelection] = useState<string>('');
  const [linkDialogHasSelection, setLinkDialogHasSelection] = useState(false);

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
      CustomHorizontalRule,
      combinedMarksInputRuleExtension, // Must come BEFORE Bold/Italic to handle *** before ** or *
      Bold,
      Italic,
      Strike,
      Code,
      Link.configure({ openOnClick: false }),
      History.configure({
        newGroupDelay: 150, // Group changes within 150ms (default is 500ms) for finer undo granularity
      }),
      HardBreak,
      Gapcursor,
      Dropcursor.configure({ color: '#3b82f6', width: 2 }),
      Placeholder.configure({ placeholder: 'Type / for commands...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      taskListInputRuleExtension,
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
      // Handle clipboard events - VS Code webviews may have restrictions on the default
      // browser clipboard API. TipTap/ProseMirror handles clipboard internally, but we
      // need to ensure the events propagate correctly.
      handleDOMEvents: {
        // Ensure copy events work by allowing default clipboard behavior
        copy: (view, event) => {
          // Return false to allow the default ProseMirror copy handler to work
          // ProseMirror will serialize the selection to HTML/text and write to clipboard
          return false;
        },
        cut: (view, event) => {
          // Return false to allow the default ProseMirror cut handler to work
          return false;
        },
        paste: (view, event) => {
          // Return false to allow the default ProseMirror paste handler to work
          // ProseMirror will read from clipboard and parse HTML/text into nodes
          return false;
        },
      },
      // Custom clipboard text serialization - ensures text is properly extracted
      // when copying content to plain text format
      clipboardTextSerializer: (slice) => {
        // Serialize the slice content to plain text with newlines between blocks
        return slice.content.textBetween(0, slice.content.size, '\n\n');
      },
      // Transform and sanitize pasted HTML content
      // This ensures external HTML is properly cleaned and converted to our schema
      transformPastedHTML: (html: string) => {
        // Create a temporary DOM parser to sanitize the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Remove potentially dangerous elements and attributes
        const dangerousTags = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'];
        dangerousTags.forEach((tag) => {
          const elements = doc.getElementsByTagName(tag);
          while (elements.length > 0) {
            elements[0].parentNode?.removeChild(elements[0]);
          }
        });

        // Remove event handler attributes and javascript: URLs from all elements
        const allElements = doc.body.querySelectorAll('*');
        allElements.forEach((el) => {
          // Remove event handlers
          Array.from(el.attributes).forEach((attr) => {
            if (attr.name.startsWith('on') || attr.value.toLowerCase().includes('javascript:')) {
              el.removeAttribute(attr.name);
            }
          });
        });

        return doc.body.innerHTML;
      },
      // Transform pasted plain text - preserve line breaks properly
      transformPastedText: (text: string) => {
        // The text comes in as-is, we return it unchanged
        // ProseMirror will handle converting it to nodes
        return text;
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

  // Track table focus for showing hint
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const isInTable = editor.isActive('table');

      if (isInTable && !isInTableRef.current) {
        // Cursor just entered a table - start 500ms delay
        isInTableRef.current = true;
        if (tableHintTimeoutRef.current) {
          clearTimeout(tableHintTimeoutRef.current);
        }
        tableHintTimeoutRef.current = setTimeout(() => {
          // Find the table element and position hint below it
          const tableNode = editor.view.dom.querySelector('table');
          if (tableNode) {
            const rect = tableNode.getBoundingClientRect();
            const editorRect = editor.view.dom.getBoundingClientRect();
            setTableHintPosition({
              top: rect.bottom - editorRect.top + 4,
              left: rect.left - editorRect.left,
            });
          }
        }, 500);
      } else if (!isInTable && isInTableRef.current) {
        // Cursor left the table - hide hint immediately
        isInTableRef.current = false;
        if (tableHintTimeoutRef.current) {
          clearTimeout(tableHintTimeoutRef.current);
          tableHintTimeoutRef.current = null;
        }
        setTableHintPosition(null);
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      if (tableHintTimeoutRef.current) {
        clearTimeout(tableHintTimeoutRef.current);
      }
    };
  }, [editor]);

  // Handle opening the link dialog
  const handleLinkClick = useCallback(() => {
    if (!editor) return;

    const { from, to, empty } = editor.state.selection;
    const selectedText = empty ? '' : editor.state.doc.textBetween(from, to);

    setLinkDialogSelection(selectedText);
    setLinkDialogHasSelection(!empty);
    setLinkDialogOpen(true);
  }, [editor]);

  // Handle link dialog submission
  const handleLinkSubmit = useCallback(
    (url: string, text?: string) => {
      if (!editor) return;

      if (linkDialogHasSelection) {
        // User has text selected - just apply the link mark
        editor.chain().focus().setLink({ href: url }).run();
      } else {
        // No selection - insert the link text with the link mark
        const linkText = text || url;
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'text',
            text: linkText,
            marks: [{ type: 'link', attrs: { href: url } }],
          })
          .run();
      }

      setLinkDialogOpen(false);
    },
    [editor, linkDialogHasSelection]
  );

  // Handle link dialog cancellation
  const handleLinkCancel = useCallback(() => {
    setLinkDialogOpen(false);
    // Return focus to editor
    editor?.commands.focus();
  }, [editor]);

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
      <FormattingToolbar editor={editor} onLinkClick={handleLinkClick} />
      <SlashMenu editor={editor} />
      <div style={{ position: 'relative' }}>
        <EditorContent
          editor={editor}
          style={{
            fontFamily: config.fontFamily === 'inherit' ? undefined : config.fontFamily,
            fontSize: `${config.fontSize}px`,
          }}
        />
        <TableHint position={tableHintPosition} />
      </div>
      <LinkDialog
        isOpen={linkDialogOpen}
        onSubmit={handleLinkSubmit}
        onCancel={handleLinkCancel}
        initialText={linkDialogSelection}
        hasSelection={linkDialogHasSelection}
      />
    </PageContainer>
  );
}
