import React from 'react';
import type { DiffSummary } from '../diff/types';

interface DiffReviewBarProps {
  summary: DiffSummary;
  sourceLabel: string;
  currentChangeIndex: number;
  totalChanges: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export function DiffReviewBar({
  summary,
  sourceLabel,
  currentChangeIndex,
  totalChanges,
  onPrev,
  onNext,
  onClose,
}: DiffReviewBarProps) {
  const parts: React.ReactNode[] = [];

  if (summary.added > 0) {
    parts.push(
      <span key="added" className="quartz-diff-review-stat quartz-diff-review-stat-added">
        +{summary.added} added
      </span>,
    );
  }
  if (summary.removed > 0) {
    parts.push(
      <span key="removed" className="quartz-diff-review-stat quartz-diff-review-stat-removed">
        -{summary.removed} removed
      </span>,
    );
  }
  if (summary.modified > 0) {
    parts.push(
      <span key="modified" className="quartz-diff-review-stat quartz-diff-review-stat-modified">
        ~{summary.modified} modified
      </span>,
    );
  }

  return (
    <div className="quartz-diff-review-bar">
      <div className="quartz-diff-review-summary">
        {parts.length > 0 ? parts : <span>No changes</span>}
        <span className="quartz-diff-review-source">{sourceLabel}</span>
      </div>

      <div className="quartz-diff-review-nav">
        <button
          className="quartz-diff-review-btn"
          onClick={onPrev}
          disabled={totalChanges === 0}
          title="Previous change"
        >
          &#9664; Prev
        </button>
        <span style={{ fontSize: 11, opacity: 0.6, minWidth: 40, textAlign: 'center' }}>
          {totalChanges > 0 ? `${currentChangeIndex + 1}/${totalChanges}` : '0/0'}
        </span>
        <button
          className="quartz-diff-review-btn"
          onClick={onNext}
          disabled={totalChanges === 0}
          title="Next change"
        >
          Next &#9654;
        </button>
      </div>

      <button className="quartz-diff-review-btn quartz-diff-review-btn-close" onClick={onClose}>
        Close Diff
      </button>
    </div>
  );
}
