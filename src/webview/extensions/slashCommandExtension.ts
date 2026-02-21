import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const slashMenuKey = new PluginKey('slashMenu');

let isSlashMenuActive = false;

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

              // Don't trigger in code blocks
              if ($from.parent.type.name === 'codeBlock') {
                return false;
              }

              const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
              const charBefore = textBefore.slice(-1);

              // Require space or start-of-block before slash (like Notion)
              // This prevents accidental triggers in URLs like https://
              const shouldTrigger =
                textBefore.length === 0 || charBefore === ' ' || charBefore === '\t';

              if (shouldTrigger) {
                isSlashMenuActive = true;
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
            // Close slash menu on Escape or Enter (command was selected)
            if (event.key === 'Escape' || event.key === 'Enter') {
              isSlashMenuActive = false;
            }
            return false;
          },
          handleTextInput(view, from, to, text) {
            if (isSlashMenuActive) {
              // Update query - get content including the new text
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

// Listen for slash menu close events to update active state
if (typeof window !== 'undefined') {
  window.addEventListener('slashMenu', ((event: CustomEvent) => {
    if (event.detail.type === 'close') {
      isSlashMenuActive = false;
    }
  }) as EventListener);
}
