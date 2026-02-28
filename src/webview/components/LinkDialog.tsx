import React, { useEffect, useRef, useState } from 'react';

interface LinkDialogProps {
  isOpen: boolean;
  onSubmit: (url: string, text?: string) => void;
  onCancel: () => void;
  initialText?: string;
  hasSelection: boolean;
}

/**
 * Validates a URL string.
 * Accepts http/https URLs, or relative paths starting with / or #
 */
function isValidUrl(url: string): boolean {
  if (!url || !url.trim()) return false;

  // Allow relative URLs starting with / or #
  if (url.startsWith('/') || url.startsWith('#')) return true;

  // Check for valid http/https URLs
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    // If it doesn't have a protocol, try adding https://
    try {
      const parsed = new URL('https://' + url);
      return parsed.hostname.includes('.');
    } catch {
      return false;
    }
  }
}

/**
 * Normalizes a URL by adding https:// if no protocol is present.
 */
function normalizeUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/') || url.startsWith('#')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return 'https://' + url;
}

/**
 * LinkDialog provides a modal for entering link URL (and optionally text).
 * Opens when user clicks the link button in the formatting toolbar.
 */
export function LinkDialog({
  isOpen,
  onSubmit,
  onCancel,
  initialText,
  hasSelection,
}: LinkDialogProps) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState(initialText || '');
  const [error, setError] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setText(initialText || '');
      setError(null);
      // Focus the URL input after a short delay to ensure the dialog is rendered
      setTimeout(() => {
        urlInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialText]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };

    // Add listener after a short delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onCancel]);

  const handleSubmit = () => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError('Please enter a URL');
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    const normalizedUrl = normalizeUrl(trimmedUrl);
    const linkText = hasSelection ? undefined : text.trim() || normalizedUrl;

    onSubmit(normalizedUrl, linkText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="quartz-link-dialog-overlay">
      <div className="quartz-link-dialog" ref={dialogRef} role="dialog" onKeyDown={handleKeyDown}>
        <div className="quartz-link-dialog-title">Insert Link</div>

        <div className="quartz-link-dialog-field">
          <label htmlFor="link-url">URL</label>
          <input
            id="link-url"
            ref={urlInputRef}
            type="text"
            placeholder="https://..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            className={error ? 'quartz-link-dialog-input-error' : ''}
          />
        </div>

        {!hasSelection && (
          <div className="quartz-link-dialog-field">
            <label htmlFor="link-text">Text</label>
            <input
              id="link-text"
              type="text"
              placeholder="Link text (optional)"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        )}

        {error && <div className="quartz-link-dialog-error">{error}</div>}

        <div className="quartz-link-dialog-buttons">
          <button
            type="button"
            className="quartz-link-dialog-btn quartz-link-dialog-btn-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="quartz-link-dialog-btn quartz-link-dialog-btn-ok"
            onClick={handleSubmit}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
