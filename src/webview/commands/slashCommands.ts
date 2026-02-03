import type { Editor } from '@tiptap/react';

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: string;
  aliases: string[];
  command: (editor: Editor) => void;
}

export const slashCommands: SlashCommand[] = [
  {
    id: 'heading1',
    label: 'Heading 1',
    description: 'Large heading',
    icon: 'H1',
    aliases: ['h1', 'heading'],
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'heading2',
    label: 'Heading 2',
    description: 'Medium heading',
    icon: 'H2',
    aliases: ['h2'],
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3',
    label: 'Heading 3',
    description: 'Small heading',
    icon: 'H3',
    aliases: ['h3'],
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'heading4',
    label: 'Heading 4',
    description: 'Heading level 4',
    icon: 'H4',
    aliases: ['h4'],
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 4 }).run(),
  },
  {
    id: 'heading5',
    label: 'Heading 5',
    description: 'Heading level 5',
    icon: 'H5',
    aliases: ['h5'],
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 5 }).run(),
  },
  {
    id: 'heading6',
    label: 'Heading 6',
    description: 'Heading level 6',
    icon: 'H6',
    aliases: ['h6'],
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 6 }).run(),
  },
  {
    id: 'bulletList',
    label: 'Bullet List',
    description: 'Unordered list',
    icon: '•',
    aliases: ['bullet', 'ul', 'unordered'],
    command: (editor) =>
      editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'numberedList',
    label: 'Numbered List',
    description: 'Ordered list',
    icon: '1.',
    aliases: ['numbered', 'ol', 'ordered'],
    command: (editor) =>
      editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'taskList',
    label: 'Task List',
    description: 'Checklist with checkboxes',
    icon: '☑',
    aliases: ['todo', 'checkbox', 'check'],
    command: (editor) =>
      editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'codeBlock',
    label: 'Code Block',
    description: 'Syntax-highlighted code',
    icon: '{ }',
    aliases: ['code', 'pre', 'snippet'],
    command: (editor) =>
      editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'blockquote',
    label: 'Quote',
    description: 'Blockquote',
    icon: '"',
    aliases: ['quote', 'blockquote'],
    command: (editor) =>
      editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'divider',
    label: 'Divider',
    description: 'Horizontal rule',
    icon: '—',
    aliases: ['divider', 'hr', 'rule', 'line'],
    command: (editor) =>
      editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'table',
    label: 'Table',
    description: 'Insert a table',
    icon: '⊞',
    aliases: ['table', 'grid'],
    command: (editor) =>
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    id: 'image',
    label: 'Image',
    description: 'Insert an image',
    icon: '🖼',
    aliases: ['image', 'img', 'picture'],
    command: (editor) => {
      const url = window.prompt('Enter image URL');
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
  },
];
