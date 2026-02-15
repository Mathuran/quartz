import { Extension } from '@tiptap/core';

export const keyboardShortcutsExtension = Extension.create({
  name: 'quartzKeyboardShortcuts',

  addKeyboardShortcuts() {
    return {
      // Strikethrough: Cmd/Ctrl+Shift+S
      'Mod-Shift-s': () => this.editor.chain().focus().toggleStrike().run(),

      // Link: Cmd/Ctrl+K - prompt user for URL
      'Mod-k': () => {
        const previousUrl = this.editor.getAttributes('link').href ?? '';
        const url = window.prompt('Enter URL:', previousUrl);

        if (url === null) {
          // User cancelled the prompt
          return true;
        }

        if (url === '') {
          // Empty URL removes the link
          this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
          return true;
        }

        this.editor
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: url })
          .run();

        return true;
      },

      // Heading 1: Cmd/Ctrl+Alt+1
      'Mod-Alt-1': () =>
        this.editor.chain().focus().toggleHeading({ level: 1 }).run(),

      // Heading 2: Cmd/Ctrl+Alt+2
      'Mod-Alt-2': () =>
        this.editor.chain().focus().toggleHeading({ level: 2 }).run(),

      // Heading 3: Cmd/Ctrl+Alt+3
      'Mod-Alt-3': () =>
        this.editor.chain().focus().toggleHeading({ level: 3 }).run(),

      // Bullet List: Cmd/Ctrl+Shift+8
      'Mod-Shift-8': () =>
        this.editor.chain().focus().toggleBulletList().run(),

      // Numbered List: Cmd/Ctrl+Shift+7
      'Mod-Shift-7': () =>
        this.editor.chain().focus().toggleOrderedList().run(),

      // Task List: Cmd/Ctrl+Shift+9
      'Mod-Shift-9': () =>
        this.editor.chain().focus().toggleTaskList().run(),

      // Code Block: Cmd/Ctrl+Alt+C
      'Mod-Alt-c': () =>
        this.editor.chain().focus().toggleCodeBlock().run(),

      // Blockquote: Cmd/Ctrl+Shift+.
      'Mod-Shift-.': () =>
        this.editor.chain().focus().toggleBlockquote().run(),

      // Highlight: Cmd/Ctrl+Shift+H
      'Mod-Shift-h': () =>
        this.editor.chain().focus().toggleHighlight().run(),

      // Table editing shortcuts (only work when cursor is inside a table)
      // Add row below: Cmd/Ctrl+Alt+ArrowDown
      'Mod-Alt-ArrowDown': () => {
        if (!this.editor.isActive('table')) return false;
        return this.editor.commands.addRowAfter();
      },

      // Add column right: Cmd/Ctrl+Alt+ArrowRight
      'Mod-Alt-ArrowRight': () => {
        if (!this.editor.isActive('table')) return false;
        return this.editor.commands.addColumnAfter();
      },

      // Delete current row: Cmd/Ctrl+Alt+Backspace
      'Mod-Alt-Backspace': () => {
        if (!this.editor.isActive('table')) return false;
        return this.editor.commands.deleteRow();
      },

      // Delete current column: Cmd/Ctrl+Alt+Shift+Backspace
      'Mod-Alt-Shift-Backspace': () => {
        if (!this.editor.isActive('table')) return false;
        return this.editor.commands.deleteColumn();
      },
    };
  },
});
