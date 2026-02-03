import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const slashMenuKey = new PluginKey('slashMenu');

function dispatchSlashMenuEvent(detail: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent('slashMenu', { detail }));
}

export const slashCommandExtension = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: slashMenuKey,
        props: {
          handleKeyDown(view, event) {
            if (event.key === '/') {
              const { $from } = view.state.selection;
              const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
              // Only trigger if at the start of a block or the block is empty
              if (textBefore.trim() === '') {
                // Delay to allow the character to be inserted
                setTimeout(() => {
                  const coords = view.coordsAtPos(view.state.selection.from);
                  dispatchSlashMenuEvent({
                    type: 'open',
                    position: {
                      top: coords.bottom + 4,
                      left: coords.left,
                    },
                  });
                }, 10);
              }
            }
            return false;
          },
          handleTextInput(view, from, to, text) {
            const state = slashMenuKey.getState(view.state);
            if (state?.active) {
              // Update query
              const { $from } = view.state.selection;
              const content = $from.parent.textContent;
              const slashIndex = content.lastIndexOf('/');
              if (slashIndex >= 0) {
                const query = content.slice(slashIndex + 1) + text;
                dispatchSlashMenuEvent({ type: 'query', query });
              }
            }
            return false;
          },
        },
        state: {
          init: () => ({ active: false }),
          apply(tr, state) {
            const meta = tr.getMeta(slashMenuKey);
            if (meta) return meta;
            return state;
          },
        },
      }),
    ];
  },
});
