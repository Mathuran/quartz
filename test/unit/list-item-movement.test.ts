import { describe, it, expect, vi } from 'vitest';
import { Schema, Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import {
  findListItemAround,
  getMovementContext,
  moveListItemsUp,
  moveListItemsDown,
} from '../../src/webview/extensions/keyboardShortcuts';

// Build a minimal ProseMirror schema that mirrors what TipTap creates
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*', toDOM: () => ['p', 0] },
    text: { group: 'inline' },
    bulletList: { group: 'block', content: 'listItem+', toDOM: () => ['ul', 0] },
    orderedList: {
      group: 'block',
      content: 'listItem+',
      attrs: { start: { default: 1 } },
      toDOM: () => ['ol', 0],
    },
    listItem: { content: '(paragraph | bulletList | orderedList | taskList)+', toDOM: () => ['li', 0] },
    taskList: { group: 'block', content: 'taskItem+', toDOM: () => ['ul', 0] },
    taskItem: {
      content: '(paragraph | bulletList | orderedList | taskList)+',
      attrs: { checked: { default: false } },
      toDOM: () => ['li', 0],
    },
    heading: {
      group: 'block',
      content: 'inline*',
      attrs: { level: { default: 1 } },
      toDOM: () => ['h1', 0],
    },
  },
  marks: {},
});

// Helper to create nodes
const {
  doc,
  paragraph: p,
  bulletList: ul,
  orderedList: ol,
  listItem: li,
  taskList: tl,
  taskItem: ti,
  heading: h,
  text: t,
} = (() => {
  const doc = (...children: ProseMirrorNode[]) => schema.node('doc', null, children);
  const paragraph = (...content: (ProseMirrorNode | string)[]) =>
    schema.node(
      'paragraph',
      null,
      content.map((c) => (typeof c === 'string' ? schema.text(c) : c))
    );
  const bulletList = (...items: ProseMirrorNode[]) => schema.node('bulletList', null, items);
  const orderedList = (...items: ProseMirrorNode[]) => schema.node('orderedList', null, items);
  const listItem = (...content: ProseMirrorNode[]) => schema.node('listItem', null, content);
  const taskList = (...items: ProseMirrorNode[]) => schema.node('taskList', null, items);
  const taskItem = (checked: boolean, ...content: ProseMirrorNode[]) =>
    schema.node('taskItem', { checked }, content);
  const heading = (level: number, ...content: (ProseMirrorNode | string)[]) =>
    schema.node(
      'heading',
      { level },
      content.map((c) => (typeof c === 'string' ? schema.text(c) : c))
    );
  const text = (s: string) => schema.text(s);
  return {
    doc,
    paragraph,
    bulletList,
    orderedList,
    listItem,
    taskList,
    taskItem,
    heading,
    text,
  };
})();

// Helper: create an EditorState and place cursor at a position
function createState(docNode: ProseMirrorNode, cursorPos: number): EditorState {
  return EditorState.create({
    doc: docNode,
    selection: TextSelection.create(docNode, cursorPos),
  });
}

// Helper: create an EditorState with a range selection
function createStateWithRange(docNode: ProseMirrorNode, from: number, to: number): EditorState {
  return EditorState.create({
    doc: docNode,
    selection: TextSelection.create(docNode, from, to),
  });
}

// Helper: create a mock editor that captures dispatched transactions
function createMockEditor(state: EditorState) {
  let currentState = state;
  const dispatched: any[] = [];

  const mockEditor = {
    view: {
      state: currentState,
      dispatch: (tr: any) => {
        dispatched.push(tr);
        currentState = currentState.apply(tr);
        // Update the mock so subsequent reads see the new state
        mockEditor.view.state = currentState;
      },
    },
    state: currentState,
  } as any;

  return { editor: mockEditor, dispatched, getState: () => currentState };
}

// Helper: get text content of list items in order from a list node
function getListItemTexts(listNode: ProseMirrorNode): string[] {
  const texts: string[] = [];
  listNode.forEach((child) => {
    // Get text from first paragraph child
    if (child.firstChild && child.firstChild.type.name === 'paragraph') {
      texts.push(child.firstChild.textContent);
    }
  });
  return texts;
}

// Helper: find the list node in a doc (first top-level list)
function findFirstList(docNode: ProseMirrorNode): ProseMirrorNode | null {
  for (let i = 0; i < docNode.childCount; i++) {
    const child = docNode.child(i);
    if (
      child.type.name === 'bulletList' ||
      child.type.name === 'orderedList' ||
      child.type.name === 'taskList'
    ) {
      return child;
    }
  }
  return null;
}

describe('findListItemAround', () => {
  it('should find a listItem when cursor is in a bullet list', () => {
    // doc > bulletList > listItem > paragraph > "Item 1"
    const docNode = doc(ul(li(p('Item 1')), li(p('Item 2'))));
    const state = createState(docNode, 4); // inside "Item 1"
    const result = findListItemAround(state.selection.$from);

    expect(result).not.toBeNull();
    expect(result!.node.type.name).toBe('listItem');
    expect(result!.index).toBe(0);
    expect(result!.parent.type.name).toBe('bulletList');
  });

  it('should find the second listItem', () => {
    const docNode = doc(ul(li(p('A')), li(p('B'))));
    const state = createState(docNode, 8); // inside "B"
    const result = findListItemAround(state.selection.$from);

    expect(result).not.toBeNull();
    expect(result!.index).toBe(1);
  });

  it('should find a taskItem', () => {
    const docNode = doc(tl(ti(false, p('Task 1')), ti(true, p('Task 2'))));
    const state = createState(docNode, 4); // inside "Task 1"
    const result = findListItemAround(state.selection.$from);

    expect(result).not.toBeNull();
    expect(result!.node.type.name).toBe('taskItem');
  });

  it('should return null when cursor is in a paragraph (not in a list)', () => {
    const docNode = doc(p('Hello'));
    const state = createState(docNode, 2);
    const result = findListItemAround(state.selection.$from);

    expect(result).toBeNull();
  });

  it('should find the nearest listItem in nested lists', () => {
    // doc > bulletList > listItem > paragraph + bulletList > listItem > paragraph
    const docNode = doc(ul(li(p('Outer'), ul(li(p('Inner'))))));
    // Position inside "Inner": doc(0) > ul(1) > li(2) > p(3) "Outer"(4-8) > ul > li > p > "Inner"
    // Navigate to find the "Inner" text position
    const innerList = docNode.child(0).child(0).child(1); // nested bulletList
    const innerItem = innerList.child(0); // nested listItem
    // Calculate position: doc(0) + ul(1) + li(2) + p("Outer"=5+2=7) + ul(1) + li(1) + p(1) + text
    // Let's just find the position by searching for "Inner"
    let innerPos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, pos) => {
      if (node.isText && node.text === 'Inner') {
        innerPos = pos;
      }
    });

    const state = createState(docNode, innerPos);
    const result = findListItemAround(state.selection.$from);

    expect(result).not.toBeNull();
    expect(result!.node.type.name).toBe('listItem');
    // The parent should be the inner bulletList, not the outer one
    expect(result!.parent.type.name).toBe('bulletList');
    expect(result!.index).toBe(0);
  });
});

describe('getMovementContext', () => {
  it('should return list mode when cursor is in a list item', () => {
    const docNode = doc(ul(li(p('A')), li(p('B')), li(p('C'))));
    const state = createState(docNode, 4); // inside "A"
    const ctx = getMovementContext(state.selection);

    expect(ctx.mode).toBe('list');
    if (ctx.mode === 'list') {
      expect(ctx.fromInfo.index).toBe(0);
      expect(ctx.toInfo.index).toBe(0);
    }
  });

  it('should return block mode when cursor is in a paragraph', () => {
    const docNode = doc(p('Hello'));
    const state = createState(docNode, 2);
    const ctx = getMovementContext(state.selection);

    expect(ctx.mode).toBe('block');
  });

  it('should return list mode when selection spans items in same list', () => {
    const docNode = doc(ul(li(p('A')), li(p('B')), li(p('C'))));
    // Select from "A" to "B"
    const state = createStateWithRange(docNode, 4, 10);
    const ctx = getMovementContext(state.selection);

    expect(ctx.mode).toBe('list');
    if (ctx.mode === 'list') {
      expect(ctx.fromInfo.index).toBe(0);
      expect(ctx.toInfo.index).toBe(1);
    }
  });

  it('should return block mode when selection spans into/out of list', () => {
    const docNode = doc(p('Before'), ul(li(p('A')), li(p('B'))));
    // Select from paragraph "Before" into list item "A"
    const state = createStateWithRange(docNode, 2, 12);
    const ctx = getMovementContext(state.selection);

    expect(ctx.mode).toBe('block');
  });

  it('should return block mode when selection spans items from different lists', () => {
    const docNode = doc(ul(li(p('A'))), ul(li(p('B'))));
    // Select across both lists
    const state = createStateWithRange(docNode, 3, 10);
    const ctx = getMovementContext(state.selection);

    // Different parent lists (different parentPos), so block mode
    expect(ctx.mode).toBe('block');
  });
});

describe('moveListItemsUp', () => {
  it('should move a bullet list item up', () => {
    const docNode = doc(ul(li(p('A')), li(p('B')), li(p('C'))));
    // Cursor in "B" (second item)
    let bPos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, pos) => {
      if (node.isText && node.text === 'B') bPos = pos;
    });
    const state = createState(docNode, bPos);
    const { editor, dispatched, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    expect(ctx.mode).toBe('list');
    if (ctx.mode === 'list') {
      const result = moveListItemsUp(editor, ctx.fromInfo, ctx.toInfo);
      expect(result).toBe(true);
      expect(dispatched).toHaveLength(1);

      // After moving B up, order should be B, A, C
      const newDoc = getState().doc;
      const list = findFirstList(newDoc)!;
      expect(getListItemTexts(list)).toEqual(['B', 'A', 'C']);
    }
  });

  it('should move an ordered list item up', () => {
    const docNode = doc(ol(li(p('First')), li(p('Second')), li(p('Third'))));
    let pos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, p) => {
      if (node.isText && node.text === 'Second') pos = p;
    });
    const state = createState(docNode, pos);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    expect(ctx.mode).toBe('list');
    if (ctx.mode === 'list') {
      moveListItemsUp(editor, ctx.fromInfo, ctx.toInfo);
      const list = findFirstList(getState().doc)!;
      expect(getListItemTexts(list)).toEqual(['Second', 'First', 'Third']);
    }
  });

  it('should move a task item up (preserving checked state)', () => {
    const docNode = doc(tl(ti(false, p('Unchecked')), ti(true, p('Checked'))));
    let pos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, p) => {
      if (node.isText && node.text === 'Checked') pos = p;
    });
    const state = createState(docNode, pos);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    expect(ctx.mode).toBe('list');
    if (ctx.mode === 'list') {
      moveListItemsUp(editor, ctx.fromInfo, ctx.toInfo);
      const list = findFirstList(getState().doc)!;
      expect(getListItemTexts(list)).toEqual(['Checked', 'Unchecked']);

      // Check that checked state is preserved
      expect(list.child(0).attrs.checked).toBe(true);
      expect(list.child(1).attrs.checked).toBe(false);
    }
  });

  it('should move item with nested sub-list as a unit', () => {
    const docNode = doc(
      ul(
        li(p('A')),
        li(p('B'), ul(li(p('B1')), li(p('B2')))),
        li(p('C'))
      )
    );
    let pos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, p) => {
      if (node.isText && node.text === 'B') pos = p;
    });
    const state = createState(docNode, pos);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    expect(ctx.mode).toBe('list');
    if (ctx.mode === 'list') {
      moveListItemsUp(editor, ctx.fromInfo, ctx.toInfo);
      const list = findFirstList(getState().doc)!;
      // B (with its nested list) should now be first
      expect(list.child(0).firstChild!.textContent).toBe('B');
      expect(list.child(1).firstChild!.textContent).toBe('A');
      // B's nested list should still exist
      expect(list.child(0).childCount).toBe(2); // paragraph + nested list
    }
  });

  it('should move item with multiple paragraphs', () => {
    const docNode = doc(
      ul(
        li(p('A')),
        li(p('B line 1'), p('B line 2')),
        li(p('C'))
      )
    );
    let pos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, p) => {
      if (node.isText && node.text === 'B line 1') pos = p;
    });
    const state = createState(docNode, pos);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    if (ctx.mode === 'list') {
      moveListItemsUp(editor, ctx.fromInfo, ctx.toInfo);
      const list = findFirstList(getState().doc)!;
      // B (with both paragraphs) should be first
      expect(list.child(0).childCount).toBe(2); // two paragraphs
      expect(list.child(0).child(0).textContent).toBe('B line 1');
      expect(list.child(0).child(1).textContent).toBe('B line 2');
    }
  });

  it('should escalate to block move when first item moves up', () => {
    // When first item tries to move up, should escalate to block-level movement
    const docNode = doc(p('Before'), ul(li(p('A')), li(p('B'))));
    let pos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, p) => {
      if (node.isText && node.text === 'A') pos = p;
    });
    const state = createState(docNode, pos);
    const { editor, dispatched, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    expect(ctx.mode).toBe('list');
    if (ctx.mode === 'list') {
      expect(ctx.fromInfo.index).toBe(0);
      const result = moveListItemsUp(editor, ctx.fromInfo, ctx.toInfo);
      expect(result).toBe(true);
      // Should have escalated to block-level: entire list moves above "Before" paragraph
      const newDoc = getState().doc;
      expect(newDoc.child(0).type.name).toBe('bulletList');
      expect(newDoc.child(1).type.name).toBe('paragraph');
    }
  });

  it('should return false when first item is already at the top of the document', () => {
    // First item + up, but list is already the first block in doc
    const docNode = doc(ul(li(p('A')), li(p('B'))));
    let pos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, p) => {
      if (node.isText && node.text === 'A') pos = p;
    });
    const state = createState(docNode, pos);
    const { editor } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    if (ctx.mode === 'list') {
      // Escalates to moveBlockUp which returns false since list is first block
      const result = moveListItemsUp(editor, ctx.fromInfo, ctx.toInfo);
      expect(result).toBe(false);
    }
  });
});

describe('moveListItemsDown', () => {
  it('should move a bullet list item down', () => {
    const docNode = doc(ul(li(p('A')), li(p('B')), li(p('C'))));
    let pos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, p) => {
      if (node.isText && node.text === 'B') pos = p;
    });
    const state = createState(docNode, pos);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    if (ctx.mode === 'list') {
      moveListItemsDown(editor, ctx.fromInfo, ctx.toInfo);
      const list = findFirstList(getState().doc)!;
      expect(getListItemTexts(list)).toEqual(['A', 'C', 'B']);
    }
  });

  it('should move a bullet list item down from first position', () => {
    const docNode = doc(ul(li(p('A')), li(p('B')), li(p('C'))));
    let pos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, p) => {
      if (node.isText && node.text === 'A') pos = p;
    });
    const state = createState(docNode, pos);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    if (ctx.mode === 'list') {
      moveListItemsDown(editor, ctx.fromInfo, ctx.toInfo);
      const list = findFirstList(getState().doc)!;
      expect(getListItemTexts(list)).toEqual(['B', 'A', 'C']);
    }
  });

  it('should escalate to block move when last item moves down', () => {
    const docNode = doc(ul(li(p('A')), li(p('B'))), p('After'));
    let pos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, p) => {
      if (node.isText && node.text === 'B') pos = p;
    });
    const state = createState(docNode, pos);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    if (ctx.mode === 'list') {
      expect(ctx.toInfo.index).toBe(1);
      const result = moveListItemsDown(editor, ctx.fromInfo, ctx.toInfo);
      expect(result).toBe(true);
      // Should have escalated: entire list moves below "After" paragraph
      const newDoc = getState().doc;
      expect(newDoc.child(0).type.name).toBe('paragraph');
      expect(newDoc.child(1).type.name).toBe('bulletList');
    }
  });

  it('should return false when last item is already at the end of the document', () => {
    const docNode = doc(ul(li(p('A')), li(p('B'))));
    let pos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, p) => {
      if (node.isText && node.text === 'B') pos = p;
    });
    const state = createState(docNode, pos);
    const { editor } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    if (ctx.mode === 'list') {
      const result = moveListItemsDown(editor, ctx.fromInfo, ctx.toInfo);
      expect(result).toBe(false);
    }
  });
});

describe('single-item list escalation', () => {
  it('should escalate up for single-item list', () => {
    const docNode = doc(p('Before'), ul(li(p('Only'))));
    let pos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, p) => {
      if (node.isText && node.text === 'Only') pos = p;
    });
    const state = createState(docNode, pos);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    if (ctx.mode === 'list') {
      // First (and only) item → escalates to block move up
      expect(ctx.fromInfo.index).toBe(0);
      const result = moveListItemsUp(editor, ctx.fromInfo, ctx.toInfo);
      expect(result).toBe(true);
      const newDoc = getState().doc;
      expect(newDoc.child(0).type.name).toBe('bulletList');
    }
  });

  it('should escalate down for single-item list', () => {
    const docNode = doc(ul(li(p('Only'))), p('After'));
    let pos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, p) => {
      if (node.isText && node.text === 'Only') pos = p;
    });
    const state = createState(docNode, pos);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    if (ctx.mode === 'list') {
      // Last (and only) item → escalates to block move down
      const result = moveListItemsDown(editor, ctx.fromInfo, ctx.toInfo);
      expect(result).toBe(true);
      const newDoc = getState().doc;
      expect(newDoc.child(0).type.name).toBe('paragraph');
      expect(newDoc.child(1).type.name).toBe('bulletList');
    }
  });
});

describe('multi-item movement', () => {
  it('should move 2 contiguous items up', () => {
    const docNode = doc(ul(li(p('A')), li(p('B')), li(p('C')), li(p('D'))));
    // Select range spanning B and C
    let bPos = 0;
    let cPos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, pos) => {
      if (node.isText && node.text === 'B') bPos = pos;
      if (node.isText && node.text === 'C') cPos = pos;
    });
    const state = createStateWithRange(docNode, bPos, cPos + 1);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    expect(ctx.mode).toBe('list');
    if (ctx.mode === 'list') {
      expect(ctx.fromInfo.index).toBe(1);
      expect(ctx.toInfo.index).toBe(2);
      moveListItemsUp(editor, ctx.fromInfo, ctx.toInfo);
      const list = findFirstList(getState().doc)!;
      expect(getListItemTexts(list)).toEqual(['B', 'C', 'A', 'D']);
    }
  });

  it('should move 2 contiguous items down', () => {
    const docNode = doc(ul(li(p('A')), li(p('B')), li(p('C')), li(p('D'))));
    let aPos = 0;
    let bPos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, pos) => {
      if (node.isText && node.text === 'A') aPos = pos;
      if (node.isText && node.text === 'B') bPos = pos;
    });
    const state = createStateWithRange(docNode, aPos, bPos + 1);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    if (ctx.mode === 'list') {
      expect(ctx.fromInfo.index).toBe(0);
      expect(ctx.toInfo.index).toBe(1);
      moveListItemsDown(editor, ctx.fromInfo, ctx.toInfo);
      const list = findFirstList(getState().doc)!;
      expect(getListItemTexts(list)).toEqual(['C', 'A', 'B', 'D']);
    }
  });

  it('should escalate when multi-item selection is at the top boundary moving up', () => {
    const docNode = doc(p('Before'), ul(li(p('A')), li(p('B')), li(p('C'))));
    let aPos = 0;
    let bPos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, pos) => {
      if (node.isText && node.text === 'A') aPos = pos;
      if (node.isText && node.text === 'B') bPos = pos;
    });
    const state = createStateWithRange(docNode, aPos, bPos + 1);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    if (ctx.mode === 'list') {
      expect(ctx.fromInfo.index).toBe(0);
      const result = moveListItemsUp(editor, ctx.fromInfo, ctx.toInfo);
      expect(result).toBe(true);
      // Entire list moves above "Before"
      const newDoc = getState().doc;
      expect(newDoc.child(0).type.name).toBe('bulletList');
    }
  });

  it('should escalate when multi-item selection is at the bottom boundary moving down', () => {
    const docNode = doc(ul(li(p('A')), li(p('B')), li(p('C'))), p('After'));
    let bPos = 0;
    let cPos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, pos) => {
      if (node.isText && node.text === 'B') bPos = pos;
      if (node.isText && node.text === 'C') cPos = pos;
    });
    const state = createStateWithRange(docNode, bPos, cPos + 1);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    if (ctx.mode === 'list') {
      expect(ctx.toInfo.index).toBe(2);
      const result = moveListItemsDown(editor, ctx.fromInfo, ctx.toInfo);
      expect(result).toBe(true);
      // Entire list moves below "After"
      const newDoc = getState().doc;
      expect(newDoc.child(0).type.name).toBe('paragraph');
    }
  });

  it('should move 3 items (middle of 5-item list) up', () => {
    const docNode = doc(ul(li(p('A')), li(p('B')), li(p('C')), li(p('D')), li(p('E'))));
    let bPos = 0;
    let dPos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, pos) => {
      if (node.isText && node.text === 'B') bPos = pos;
      if (node.isText && node.text === 'D') dPos = pos;
    });
    const state = createStateWithRange(docNode, bPos, dPos + 1);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    expect(ctx.mode).toBe('list');
    if (ctx.mode === 'list') {
      expect(ctx.fromInfo.index).toBe(1);
      expect(ctx.toInfo.index).toBe(3);
      moveListItemsUp(editor, ctx.fromInfo, ctx.toInfo);
      const list = findFirstList(getState().doc)!;
      // B, C, D swap above A → [B, C, D, A, E]
      expect(getListItemTexts(list)).toEqual(['B', 'C', 'D', 'A', 'E']);
    }
  });

  it('should move 3 items (middle of 5-item list) down', () => {
    const docNode = doc(ul(li(p('A')), li(p('B')), li(p('C')), li(p('D')), li(p('E'))));
    let bPos = 0;
    let dPos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, pos) => {
      if (node.isText && node.text === 'B') bPos = pos;
      if (node.isText && node.text === 'D') dPos = pos;
    });
    const state = createStateWithRange(docNode, bPos, dPos + 1);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    expect(ctx.mode).toBe('list');
    if (ctx.mode === 'list') {
      expect(ctx.fromInfo.index).toBe(1);
      expect(ctx.toInfo.index).toBe(3);
      moveListItemsDown(editor, ctx.fromInfo, ctx.toInfo);
      const list = findFirstList(getState().doc)!;
      // B, C, D swap below E → [A, E, B, C, D]
      expect(getListItemTexts(list)).toEqual(['A', 'E', 'B', 'C', 'D']);
    }
  });

  it('should escalate both directions when all items are selected', () => {
    const docNode = doc(p('Before'), ul(li(p('A')), li(p('B')), li(p('C'))), p('After'));
    let aPos = 0;
    let cPos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, pos) => {
      if (node.isText && node.text === 'A') aPos = pos;
      if (node.isText && node.text === 'C') cPos = pos;
    });

    // Move up: all items selected, first is at index 0 → escalates to block move
    const stateUp = createStateWithRange(docNode, aPos, cPos + 1);
    const { editor: editorUp, getState: getStateUp } = createMockEditor(stateUp);
    const ctxUp = getMovementContext(stateUp.selection);
    expect(ctxUp.mode).toBe('list');
    if (ctxUp.mode === 'list') {
      expect(ctxUp.fromInfo.index).toBe(0);
      expect(ctxUp.toInfo.index).toBe(2);
      const resultUp = moveListItemsUp(editorUp, ctxUp.fromInfo, ctxUp.toInfo);
      expect(resultUp).toBe(true);
      // List should move above "Before"
      const newDocUp = getStateUp().doc;
      expect(newDocUp.child(0).type.name).toBe('bulletList');
      expect(newDocUp.child(1).type.name).toBe('paragraph');
      expect(newDocUp.child(1).textContent).toBe('Before');
    }

    // Move down: all items selected, last is at end → escalates to block move
    const stateDown = createStateWithRange(docNode, aPos, cPos + 1);
    const { editor: editorDown, getState: getStateDown } = createMockEditor(stateDown);
    const ctxDown = getMovementContext(stateDown.selection);
    expect(ctxDown.mode).toBe('list');
    if (ctxDown.mode === 'list') {
      expect(ctxDown.fromInfo.index).toBe(0);
      expect(ctxDown.toInfo.index).toBe(2);
      const resultDown = moveListItemsDown(editorDown, ctxDown.fromInfo, ctxDown.toInfo);
      expect(resultDown).toBe(true);
      // List should move below "After"
      const newDocDown = getStateDown().doc;
      expect(newDocDown.child(0).type.name).toBe('paragraph');
      expect(newDocDown.child(0).textContent).toBe('Before');
      expect(newDocDown.child(1).type.name).toBe('paragraph');
      expect(newDocDown.child(1).textContent).toBe('After');
      expect(newDocDown.child(2).type.name).toBe('bulletList');
    }
  });

  it('should preserve range selection after moving 2 items up', () => {
    const docNode = doc(ul(li(p('A')), li(p('B')), li(p('C')), li(p('D'))));
    let bPos = 0;
    let cPos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, pos) => {
      if (node.isText && node.text === 'B') bPos = pos;
      if (node.isText && node.text === 'C') cPos = pos;
    });
    const state = createStateWithRange(docNode, bPos, cPos + 1);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    if (ctx.mode === 'list') {
      moveListItemsUp(editor, ctx.fromInfo, ctx.toInfo);
      const newState = getState();
      const { from, to } = newState.selection;
      // Selection should still span content in B and C (now at positions 0 and 1)
      expect(from).not.toBe(to); // Should be a range, not collapsed
      // Verify the selected content covers the moved items
      const selectedText = newState.doc.textBetween(from, to);
      expect(selectedText).toContain('B');
    }
  });

  it('should preserve range selection after moving 2 items down', () => {
    const docNode = doc(ul(li(p('A')), li(p('B')), li(p('C')), li(p('D'))));
    let aPos = 0;
    let bPos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, pos) => {
      if (node.isText && node.text === 'A') aPos = pos;
      if (node.isText && node.text === 'B') bPos = pos;
    });
    const state = createStateWithRange(docNode, aPos, bPos + 1);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    if (ctx.mode === 'list') {
      moveListItemsDown(editor, ctx.fromInfo, ctx.toInfo);
      const newState = getState();
      const { from, to } = newState.selection;
      // Selection should still be a range, not collapsed
      expect(from).not.toBe(to);
      // Verify the selected content covers the moved items
      const selectedText = newState.doc.textBetween(from, to);
      expect(selectedText).toContain('A');
    }
  });
});

describe('block mode fallback (unchanged behavior)', () => {
  it('should use block mode for cursor in paragraph', () => {
    const docNode = doc(p('Hello'), p('World'));
    const state = createState(docNode, 2);
    const ctx = getMovementContext(state.selection);
    expect(ctx.mode).toBe('block');
  });

  it('should use block mode when selection spans list + paragraph', () => {
    const docNode = doc(ul(li(p('A'))), p('Hello'));
    // Selection from inside the list to the paragraph
    const state = createStateWithRange(docNode, 3, 10);
    const ctx = getMovementContext(state.selection);
    expect(ctx.mode).toBe('block');
  });

  it('should use block mode when selection spans items from different lists', () => {
    const docNode = doc(ul(li(p('A'))), ul(li(p('B'))));
    const state = createStateWithRange(docNode, 3, 10);
    const ctx = getMovementContext(state.selection);
    expect(ctx.mode).toBe('block');
  });
});

describe('nested list behavior', () => {
  it('should move nested item within its immediate parent list', () => {
    // Outer list with one item that contains a nested list
    const docNode = doc(
      ul(
        li(
          p('Outer'),
          ul(li(p('Inner A')), li(p('Inner B')), li(p('Inner C')))
        )
      )
    );
    let pos = 0;
    docNode.nodesBetween(0, docNode.content.size, (node, p) => {
      if (node.isText && node.text === 'Inner B') pos = p;
    });
    const state = createState(docNode, pos);
    const { editor, getState } = createMockEditor(state);

    const ctx = getMovementContext(state.selection);
    expect(ctx.mode).toBe('list');
    if (ctx.mode === 'list') {
      expect(ctx.fromInfo.index).toBe(1);
      moveListItemsUp(editor, ctx.fromInfo, ctx.toInfo);

      // Inner B should now be before Inner A in the nested list
      const newDoc = getState().doc;
      const outerList = newDoc.child(0); // bulletList
      const outerItem = outerList.child(0); // listItem
      const innerList = outerItem.child(1); // nested bulletList
      expect(innerList.child(0).firstChild!.textContent).toBe('Inner B');
      expect(innerList.child(1).firstChild!.textContent).toBe('Inner A');
      expect(innerList.child(2).firstChild!.textContent).toBe('Inner C');
    }
  });
});
