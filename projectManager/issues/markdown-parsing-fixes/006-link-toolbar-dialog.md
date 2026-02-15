# [006] Add Link URL Dialog for Toolbar

## Metadata
- **Status:** DONE
- **Depends On:** 005
- **Blocks:** —
- **Scope:** M
- **Design Doc:** [markdown-parsing-fixes](../../design-docs/markdown-parsing-fixes.md)

## Description

The toolbar link button currently creates a link but doesn't provide a way to enter the URL. Add a dialog/modal that opens when clicking the link button, allowing users to enter the URL.

## Acceptance Criteria

- [ ] Clicking link button in toolbar opens a URL input dialog
- [ ] Dialog has a text input for URL and OK/Cancel buttons
- [ ] Pressing Enter in input submits the dialog
- [ ] Pressing Escape cancels the dialog
- [ ] After entering URL, selected text becomes a link with that URL
- [ ] If no text selected, prompt for both link text and URL
- [ ] Invalid URLs show error message (don't silently fail)
- [ ] Dialog closes after successful link creation
- [ ] Focus returns to editor after dialog closes

## Technical Notes

### Files to Create
- `src/webview/components/LinkDialog.tsx` — React modal component

### Files to Modify
- `src/webview/Editor.tsx` — State for dialog visibility, render dialog
- `src/webview/components/FormattingToolbar.tsx` — Trigger dialog on link button click
- `src/webview/styles/editor.css` — Dialog styling

### Suggested Approach

1. Create `LinkDialog` component with controlled input
2. Add state to Editor: `linkDialogOpen`, `linkDialogCallback`
3. On link button click, set `linkDialogOpen: true`
4. On dialog submit, apply link mark with entered URL
5. On dialog cancel, just close without changes

```typescript
// LinkDialog.tsx
interface LinkDialogProps {
  isOpen: boolean;
  onSubmit: (url: string, text?: string) => void;
  onCancel: () => void;
  initialText?: string;
}

export const LinkDialog: React.FC<LinkDialogProps> = ({
  isOpen,
  onSubmit,
  onCancel,
  initialText,
}) => {
  const [url, setUrl] = useState('');
  const [text, setText] = useState(initialText || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="quartz-link-dialog-overlay">
      <div className="quartz-link-dialog">
        <input
          ref={inputRef}
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit(url, text);
            if (e.key === 'Escape') onCancel();
          }}
        />
        <div className="quartz-link-dialog-buttons">
          <button onClick={onCancel}>Cancel</button>
          <button onClick={() => onSubmit(url, text)}>OK</button>
        </div>
      </div>
    </div>
  );
};
```

### Styling

```css
.quartz-link-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.quartz-link-dialog {
  background: var(--quartz-bg);
  padding: 16px;
  border-radius: 8px;
  min-width: 300px;
}
```

### Key Considerations
- Validate URL before submitting
- Handle case where no text is selected (need text input too)
- Ensure keyboard accessibility (Tab, Enter, Escape)
- Match VS Code's dialog styling

## Tests Required

### Unit Tests
- [ ] Dialog opens when link button clicked
- [ ] Dialog closes on Cancel
- [ ] Dialog closes on Escape key
- [ ] Submit with valid URL creates link
- [ ] Submit with invalid URL shows error
- [ ] Empty URL prevented from submitting

### E2E Tests
- [ ] Select text, click link button, enter URL, verify link created

### Manual Testing
- [ ] Select text, click link button — dialog opens
- [ ] Enter URL, press Enter — link created
- [ ] Press Escape — dialog closes, no link created
- [ ] Click Cancel — dialog closes, no link created

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Code reviewed
- [ ] Accessible via keyboard
- [ ] No regressions in existing functionality
