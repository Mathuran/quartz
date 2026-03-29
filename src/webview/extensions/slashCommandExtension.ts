import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

interface SlashMenuState {
  active: boolean;
  slashPos: number;
}

const slashMenuKey = new PluginKey<SlashMenuState>('slashMenu');

function dispatchSlashMenuEvent(detail: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent('slashMenu', { detail }));
}

function getSlashMenuState(view: EditorView): SlashMenuState {
  return slashMenuKey.getState(view.state) ?? { active: false, slashPos: -1 };
}

export const slashCommandExtension = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      new Plugin<SlashMenuState>({
        key: slashMenuKey,
        state: {
          init(): SlashMenuState {
            return { active: false, slashPos: -1 };
          },
          apply(tr, prev): SlashMenuState {
            const meta = tr.getMeta(slashMenuKey);
            if (meta !== undefined) return meta;
            // If document changed and menu is active, map the slash position
            if (prev.active && tr.docChanged) {
              const mappedPos = tr.mapping.map(prev.slashPos);
              return { ...prev, slashPos: mappedPos };
            }
            return prev;
          },
        },
        props: {
          handleKeyDown(view, event) {
            const pluginState = getSlashMenuState(view);

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
                // The slash hasn't been inserted yet; after insertion it will be at selection.from
                const slashPos = view.state.selection.from;
                const tr = view.state.tr.setMeta(slashMenuKey, {
                  active: true,
                  slashPos,
                });
                view.dispatch(tr);

                // Delay to allow the character to be inserted
                setTimeout(() => {
                  const coords = view.coordsAtPos(view.state.selection.from);
                  dispatchSlashMenuEvent({
                    type: 'open',
                    position: {
                      anchorTop: coords.top,
                      anchorBottom: coords.bottom,
                      left: coords.left,
                    },
                  });
                }, 10);
              }
            }

            // Close slash menu on Escape or Enter (command was selected)
            if (pluginState.active && (event.key === 'Escape' || event.key === 'Enter')) {
              const tr = view.state.tr.setMeta(slashMenuKey, {
                active: false,
                slashPos: -1,
              });
              view.dispatch(tr);
            }

            // Handle backspace to update slash menu query
            if (pluginState.active && event.key === 'Backspace') {
              setTimeout(() => {
                const currentState = getSlashMenuState(view);
                if (!currentState.active) return;

                const { $from } = view.state.selection;
                const textContent = $from.parent.textContent;
                const cursorOffset = $from.parentOffset;
                const blockStart = $from.pos - cursorOffset;
                const relativeSlashPos = currentState.slashPos - blockStart;

                // Check if the slash is still present
                if (relativeSlashPos < 0 || relativeSlashPos >= textContent.length || textContent[relativeSlashPos] !== '/') {
                  // Slash was deleted, close menu
                  const tr = view.state.tr.setMeta(slashMenuKey, {
                    active: false,
                    slashPos: -1,
                  });
                  view.dispatch(tr);
                  dispatchSlashMenuEvent({ type: 'close' });
                } else {
                  // Update query with text after the slash up to cursor
                  const query = textContent.slice(relativeSlashPos + 1, cursorOffset);
                  dispatchSlashMenuEvent({ type: 'query', query });
                }
              }, 10);
            }

            return false;
          },
          handleClick(view) {
            const pluginState = getSlashMenuState(view);
            if (pluginState.active) {
              const tr = view.state.tr.setMeta(slashMenuKey, {
                active: false,
                slashPos: -1,
              });
              view.dispatch(tr);
              dispatchSlashMenuEvent({ type: 'close' });
            }
            return false;
          },
          handleTextInput(view, _from, _to, text) {
            const pluginState = getSlashMenuState(view);
            if (pluginState.active) {
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
        view() {
          let currentView: EditorView | null = null;

          const closeListener = ((event: CustomEvent) => {
            if (event.detail.type === 'close' && currentView) {
              const state = getSlashMenuState(currentView);
              if (state.active) {
                const tr = currentView.state.tr.setMeta(slashMenuKey, {
                  active: false,
                  slashPos: -1,
                });
                currentView.dispatch(tr);
              }
            }
          }) as EventListener;

          if (typeof window !== 'undefined') {
            window.addEventListener('slashMenu', closeListener);
          }

          return {
            update(view) {
              currentView = view;
            },
            destroy() {
              currentView = null;
              if (typeof window !== 'undefined') {
                window.removeEventListener('slashMenu', closeListener);
              }
            },
          };
        },
      }),
    ];
  },
});
