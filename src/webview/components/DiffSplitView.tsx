import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { createLowlight } from 'lowlight';

import { CustomCodeBlockLowlight } from '../extensions/codeBlockExtension';
import { CalloutExtension } from '../extensions/calloutExtension';
import { DiffDecorationExtension } from '../extensions/diffDecorationExtension';
import type { AlignedRow, BlockDiff, DiffResult, DiffType } from '../diff/types';
import { DiffReviewBar } from './DiffReviewBar';

import '../styles/diffReview.css';

const lowlight = createLowlight();

interface DiffSplitViewProps {
  diffResult: DiffResult;
  alignedRows: AlignedRow[];
  sourceLabel: string;
  onClose: () => void;
  /** Called when the right panel content is updated (for saving edits) */
  onRightPanelUpdate?: (doc: JSONContent) => void;
}

/** Build the diff map for a given panel side from the diffs array */
function buildBlockDiffMap(diffs: BlockDiff[], side: 'left' | 'right'): Map<number, DiffType> {
  const map = new Map<number, DiffType>();
  // We track the actual block index in the rendered document
  let blockIndex = 0;
  for (const diff of diffs) {
    if (side === 'left') {
      if (diff.type === 'added') continue; // no block on left for added
      map.set(blockIndex, diff.type);
      blockIndex++;
    } else {
      if (diff.type === 'removed') continue; // no block on right for removed
      map.set(blockIndex, diff.type);
      blockIndex++;
    }
  }
  return map;
}

/** Build placeholder entries for a given side */
function buildPlaceholders(
  diffs: BlockDiff[],
  side: 'left' | 'right',
): { afterBlockIndex: number; label: string }[] {
  const placeholders: { afterBlockIndex: number; label: string }[] = [];
  let blockIndex = -1; // -1 means "before the first block"

  for (const diff of diffs) {
    if (side === 'left' && diff.type === 'added') {
      placeholders.push({ afterBlockIndex: blockIndex, label: 'Block added in new version' });
    } else if (side === 'right' && diff.type === 'removed') {
      placeholders.push({ afterBlockIndex: blockIndex, label: 'Block removed from old version' });
    } else {
      blockIndex++;
    }
  }

  return placeholders;
}

/** Build the document content for one side, filtering out blocks that don't belong */
function buildPanelDoc(diffs: BlockDiff[], side: 'left' | 'right'): JSONContent {
  const content: JSONContent[] = [];
  for (const diff of diffs) {
    if (side === 'left') {
      if (diff.type === 'added') continue;
      content.push(diff.oldBlock!);
    } else {
      if (diff.type === 'removed') continue;
      content.push(
        diff.type === 'unchanged' || diff.type === 'modified' ? diff.newBlock! : diff.newBlock!,
      );
    }
  }
  return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph' }] };
}

/** Shared TipTap extensions for both panels (minus editing-specific ones for left) */
function getSharedExtensions() {
  return [
    Document,
    Paragraph,
    Text,
    Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
    BulletList,
    OrderedList,
    ListItem,
    CustomCodeBlockLowlight.configure({ lowlight }),
    CalloutExtension,
    Blockquote,
    HorizontalRule,
    Bold,
    Italic,
    Strike,
    Code,
    Link.configure({ openOnClick: false }),
    HardBreak,
    Highlight.configure({ multicolor: false }),
    Image,
    Table.configure({ resizable: false }),
    TableRow,
    TableCell,
    TableHeader,
    TaskList,
    TaskItem.configure({ nested: true }),
  ];
}

export function DiffSplitView({
  diffResult,
  alignedRows: _alignedRows,
  sourceLabel,
  onClose,
  onRightPanelUpdate,
}: DiffSplitViewProps) {
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  // Build panel documents and decoration maps
  const leftDoc = useMemo(() => buildPanelDoc(diffResult.diffs, 'left'), [diffResult.diffs]);
  const rightDoc = useMemo(() => buildPanelDoc(diffResult.diffs, 'right'), [diffResult.diffs]);
  const leftDiffMap = useMemo(
    () => buildBlockDiffMap(diffResult.diffs, 'left'),
    [diffResult.diffs],
  );
  const rightDiffMap = useMemo(
    () => buildBlockDiffMap(diffResult.diffs, 'right'),
    [diffResult.diffs],
  );
  const leftPlaceholders = useMemo(
    () => buildPlaceholders(diffResult.diffs, 'left'),
    [diffResult.diffs],
  );
  const rightPlaceholders = useMemo(
    () => buildPlaceholders(diffResult.diffs, 'right'),
    [diffResult.diffs],
  );

  // Change navigation state
  const changeIndices = useMemo(() => {
    const indices: number[] = [];
    diffResult.diffs.forEach((d, i) => {
      if (d.type !== 'unchanged') indices.push(i);
    });
    return indices;
  }, [diffResult.diffs]);

  const [currentChangeIdx, setCurrentChangeIdx] = useState(0);

  // Left editor: read-only
  const leftEditor = useEditor({
    extensions: [
      ...getSharedExtensions(),
      DiffDecorationExtension.configure({ blockDiffMap: leftDiffMap }),
    ],
    content: leftDoc,
    editable: false,
    editorProps: {
      attributes: {
        class: 'quartz-editor-content',
      },
    },
  });

  // Right editor: editable
  const rightEditor = useEditor({
    extensions: [
      ...getSharedExtensions(),
      History,
      Gapcursor,
      Dropcursor.configure({ color: '#3b82f6', width: 2 }),
      DiffDecorationExtension.configure({ blockDiffMap: rightDiffMap }),
    ],
    content: rightDoc,
    editable: true,
    onUpdate: ({ editor }) => {
      onRightPanelUpdate?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'quartz-editor-content',
      },
    },
  });

  // Synchronized scrolling
  useEffect(() => {
    const leftEl = leftPanelRef.current;
    const rightEl = rightPanelRef.current;
    if (!leftEl || !rightEl) return;

    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      requestAnimationFrame(() => {
        const scrollRatio = source.scrollTop / (source.scrollHeight - source.clientHeight || 1);
        target.scrollTop = scrollRatio * (target.scrollHeight - target.clientHeight || 1);
        isSyncingScroll.current = false;
      });
    };

    const handleLeftScroll = () => syncScroll(leftEl, rightEl);
    const handleRightScroll = () => syncScroll(rightEl, leftEl);

    leftEl.addEventListener('scroll', handleLeftScroll, { passive: true });
    rightEl.addEventListener('scroll', handleRightScroll, { passive: true });

    return () => {
      leftEl.removeEventListener('scroll', handleLeftScroll);
      rightEl.removeEventListener('scroll', handleRightScroll);
    };
  }, []);

  // Navigate to a change by scrolling to the corresponding block
  const navigateToChange = useCallback(
    (changeIdx: number) => {
      if (changeIndices.length === 0) return;
      const wrappedIdx =
        ((changeIdx % changeIndices.length) + changeIndices.length) % changeIndices.length;
      setCurrentChangeIdx(wrappedIdx);

      // Find the block in the right panel and scroll to it
      const diffIndex = changeIndices[wrappedIdx];
      const diff = diffResult.diffs[diffIndex];

      // Calculate which block index in the right panel this corresponds to
      let rightBlockIdx = 0;
      for (let i = 0; i < diffIndex; i++) {
        if (diffResult.diffs[i].type !== 'removed') rightBlockIdx++;
      }

      if (rightEditor && diff.type !== 'removed') {
        // Scroll right panel to the block
        const rightEl = rightPanelRef.current;
        if (rightEl) {
          const blocks = rightEl.querySelectorAll('.ProseMirror > *');
          if (blocks[rightBlockIdx]) {
            blocks[rightBlockIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }

      // Also scroll in left panel for removed blocks
      if (leftEditor && diff.type === 'removed') {
        let leftBlockIdx = 0;
        for (let i = 0; i < diffIndex; i++) {
          if (diffResult.diffs[i].type !== 'added') leftBlockIdx++;
        }
        const leftEl = leftPanelRef.current;
        if (leftEl) {
          const blocks = leftEl.querySelectorAll('.ProseMirror > *');
          if (blocks[leftBlockIdx]) {
            blocks[leftBlockIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    },
    [changeIndices, diffResult.diffs, leftEditor, rightEditor],
  );

  const handlePrev = useCallback(() => {
    navigateToChange(currentChangeIdx - 1);
  }, [currentChangeIdx, navigateToChange]);

  const handleNext = useCallback(() => {
    navigateToChange(currentChangeIdx + 1);
  }, [currentChangeIdx, navigateToChange]);

  if (!leftEditor || !rightEditor) return null;

  return (
    <div className="quartz-diff-container">
      <DiffReviewBar
        summary={diffResult.summary}
        sourceLabel={sourceLabel}
        currentChangeIndex={currentChangeIdx}
        totalChanges={changeIndices.length}
        onPrev={handlePrev}
        onNext={handleNext}
        onClose={onClose}
      />
      <div className="quartz-diff-split">
        <div className="quartz-diff-panel quartz-diff-panel-left" ref={leftPanelRef}>
          <div className="quartz-diff-panel-header">
            <span className="quartz-diff-panel-header-label">Old version</span>
            <span className="quartz-diff-panel-header-badge">Read-only</span>
          </div>
          <div style={{ padding: '16px 24px' }}>
            <PlaceholderOverlay placeholders={leftPlaceholders} panelRef={leftPanelRef}>
              <EditorContent editor={leftEditor} />
            </PlaceholderOverlay>
          </div>
        </div>
        <div className="quartz-diff-panel quartz-diff-panel-right" ref={rightPanelRef}>
          <div className="quartz-diff-panel-header">
            <span className="quartz-diff-panel-header-label">Current version</span>
            <span className="quartz-diff-panel-header-badge">Editable</span>
          </div>
          <div style={{ padding: '16px 24px' }}>
            <PlaceholderOverlay placeholders={rightPlaceholders} panelRef={rightPanelRef}>
              <EditorContent editor={rightEditor} />
            </PlaceholderOverlay>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Renders placeholder rows in gaps where the opposite panel has blocks */
function PlaceholderOverlay({
  placeholders,
  panelRef: _panelRef,
  children,
}: {
  placeholders: { afterBlockIndex: number; label: string }[];
  panelRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  // For simplicity in v1, we render placeholders inline between blocks
  // by wrapping the editor content and injecting placeholder divs via CSS
  // A more precise approach would use ProseMirror widgets, but this works for now.
  if (placeholders.length === 0) return <>{children}</>;

  return (
    <div className="quartz-diff-panel-content">
      {children}
      {/* Placeholders rendered as overlay hints — in v1 they appear after the editor */}
      {placeholders.map((p, i) => (
        <div key={i} className="quartz-diff-placeholder">
          {p.label}
        </div>
      ))}
    </div>
  );
}
