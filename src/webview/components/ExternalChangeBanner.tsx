import React from 'react';

interface ExternalChangeBannerProps {
  onViewChanges: () => void;
  onAccept: () => void;
  onDismiss: () => void;
}

export function ExternalChangeBanner({
  onViewChanges,
  onAccept,
  onDismiss,
}: ExternalChangeBannerProps) {
  return (
    <div className="quartz-external-change-banner" role="alert">
      <span className="quartz-external-change-banner-text">File changed externally</span>
      <div className="quartz-external-change-banner-actions">
        <button className="quartz-external-change-btn" onClick={onViewChanges}>
          View Changes
        </button>
        <button
          className="quartz-external-change-btn quartz-external-change-btn-accept"
          onClick={onAccept}
        >
          Accept
        </button>
        <button className="quartz-external-change-btn" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
