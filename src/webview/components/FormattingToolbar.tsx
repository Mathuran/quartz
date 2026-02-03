import React from 'react';
import { BubbleMenu, type Editor } from '@tiptap/react';

interface FormattingToolbarProps {
  editor: Editor;
}

export function FormattingToolbar({ editor }: FormattingToolbarProps) {
  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 150 }}
      className="quartz-formatting-toolbar"
      shouldShow={({ editor, state }) => {
        const { selection } = state;
        const { empty } = selection;
        // Don't show for node selections or empty selections
        if (empty) return false;
        // Don't show inside code blocks
        if (editor.isActive('codeBlock')) return false;
        return true;
      }}
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
          const url = window.prompt('Enter URL');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
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
