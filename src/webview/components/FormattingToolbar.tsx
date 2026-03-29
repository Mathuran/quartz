import React, { useCallback } from 'react';
import { BubbleMenu, type Editor } from '@tiptap/react';

interface FormattingToolbarProps {
  editor: Editor;
  onLinkClick?: () => void;
}

export function FormattingToolbar({ editor, onLinkClick }: FormattingToolbarProps) {
  const shouldShow = useCallback(
    ({ editor, state }: { editor: Editor; state: { selection: { empty: boolean } } }) => {
      const { selection } = state;
      const { empty } = selection;
      // Don't show for node selections or empty selections
      if (empty) return false;
      // Don't show inside code blocks
      if (editor.isActive('codeBlock')) return false;
      return true;
    },
    [],
  );

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 150, placement: 'top' }}
      className="quartz-formatting-toolbar"
      shouldShow={shouldShow}
    >
      <button
        className={`quartz-toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (Cmd+B)"
      >
        B
      </button>
      <button
        className={`quartz-toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (Cmd+I)"
      >
        I
      </button>
      <button
        className={`quartz-toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough (Cmd+Shift+S)"
      >
        S
      </button>
      <button
        className={`quartz-toolbar-btn ${editor.isActive('code') ? 'active' : ''}`}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Code (Cmd+E)"
      >
        {'<>'}
      </button>
      <button
        className={`quartz-toolbar-btn ${editor.isActive('link') ? 'active' : ''}`}
        onClick={() => {
          if (editor.isActive('link')) {
            // If already a link, remove it
            editor.chain().focus().unsetLink().run();
          } else if (onLinkClick) {
            // Open the link dialog
            onLinkClick();
          }
        }}
        title="Link (Cmd+K)"
      >
        🔗
      </button>
      <button
        className={`quartz-toolbar-btn ${editor.isActive('highlight') ? 'active' : ''}`}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Highlight (Cmd+Shift+H)"
      >
        H
      </button>
    </BubbleMenu>
  );
}
