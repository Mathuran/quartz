import { describe, it, expect } from 'vitest';
import {
  isValidUrl,
  isValidLinkUrl,
  stripControlCharacters,
} from '../../src/webview/utils/urlValidation';

describe('stripControlCharacters', () => {
  it('removes null bytes', () => {
    expect(stripControlCharacters('java\x00script')).toBe('javascript');
  });

  it('removes tab characters', () => {
    expect(stripControlCharacters('java\x09script')).toBe('javascript');
  });

  it('removes newlines and carriage returns', () => {
    expect(stripControlCharacters('java\x0ascript')).toBe('javascript');
    expect(stripControlCharacters('java\x0dscript')).toBe('javascript');
  });

  it('removes DEL character (0x7F)', () => {
    expect(stripControlCharacters('java\x7fscript')).toBe('javascript');
  });

  it('preserves normal characters', () => {
    expect(stripControlCharacters('https://example.com')).toBe('https://example.com');
  });

  it('removes all control chars in range 0x00-0x1F', () => {
    let input = '';
    for (let i = 0; i <= 0x1f; i++) {
      input += String.fromCharCode(i);
    }
    expect(stripControlCharacters(input)).toBe('');
  });
});

describe('isValidUrl', () => {
  // --- Dangerous protocols ---

  it('rejects javascript: URLs', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects JavaScript: URLs (case variation)', () => {
    expect(isValidUrl('JavaScript:alert(1)')).toBe(false);
  });

  it('rejects JAVASCRIPT: URLs (all caps)', () => {
    expect(isValidUrl('JAVASCRIPT:alert(1)')).toBe(false);
  });

  it('rejects java\\x09script: (tab bypass)', () => {
    expect(isValidUrl('java\x09script:alert(1)')).toBe(false);
  });

  it('rejects java\\x00script: (null byte bypass)', () => {
    expect(isValidUrl('java\x00script:alert(1)')).toBe(false);
  });

  it('rejects java\\x0ascript: (newline bypass)', () => {
    expect(isValidUrl('java\x0ascript:alert(1)')).toBe(false);
  });

  it('rejects java\\x0dscript: (carriage return bypass)', () => {
    expect(isValidUrl('java\x0dscript:alert(1)')).toBe(false);
  });

  it('rejects vbscript: URLs', () => {
    expect(isValidUrl('vbscript:msgbox')).toBe(false);
  });

  it('rejects VBScript: URLs (case variation)', () => {
    expect(isValidUrl('VBScript:MsgBox("XSS")')).toBe(false);
  });

  it('rejects vbscript with control char bypass', () => {
    expect(isValidUrl('vb\x09script:msgbox')).toBe(false);
  });

  // --- data: URLs ---

  it('rejects data:image/svg+xml (XSS via SVG)', () => {
    expect(isValidUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBe(false);
  });

  it('rejects data:image/svg+xml;base64', () => {
    expect(isValidUrl('data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+')).toBe(false);
  });

  it('rejects data:text/html', () => {
    expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('rejects data:text/javascript', () => {
    expect(isValidUrl('data:text/javascript,alert(1)')).toBe(false);
  });

  it('rejects data:application/javascript', () => {
    expect(isValidUrl('data:application/javascript,alert(1)')).toBe(false);
  });

  it('rejects bare data: with no MIME type', () => {
    expect(isValidUrl('data:,alert(1)')).toBe(false);
  });

  it('allows data:image/png;base64,...', () => {
    expect(isValidUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==')).toBe(true);
  });

  it('allows data:image/jpeg;base64,...', () => {
    expect(isValidUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true);
  });

  it('allows data:image/gif;base64,...', () => {
    expect(isValidUrl('data:image/gif;base64,R0lGODlhAQABAIAAAP==')).toBe(true);
  });

  it('allows data:image/webp;base64,...', () => {
    expect(isValidUrl('data:image/webp;base64,UklGRh4AAABXRUJQVlA4')).toBe(true);
  });

  it('rejects data:image/bmp (not in allowlist)', () => {
    expect(isValidUrl('data:image/bmp;base64,Qk0=')).toBe(false);
  });

  // --- Valid URLs ---

  it('allows https://example.com', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('allows http://localhost:3000', () => {
    expect(isValidUrl('http://localhost:3000')).toBe(true);
  });

  it('allows relative paths /path/to/file', () => {
    expect(isValidUrl('/path/to/file')).toBe(true);
  });

  it('allows fragment identifiers #section', () => {
    expect(isValidUrl('#section')).toBe(true);
  });

  it('allows mailto: links', () => {
    expect(isValidUrl('mailto:user@example.com')).toBe(true);
  });

  it('allows ftp: links', () => {
    expect(isValidUrl('ftp://files.example.com/readme.txt')).toBe(true);
  });

  // --- Edge cases ---

  it('rejects empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });

  it('rejects null/undefined (type guard)', () => {
    expect(isValidUrl(null as unknown as string)).toBe(false);
    expect(isValidUrl(undefined as unknown as string)).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    expect(isValidUrl('   ')).toBe(false);
  });

  it('rejects javascript: with leading whitespace', () => {
    expect(isValidUrl('  javascript:alert(1)')).toBe(false);
  });

  it('rejects javascript: with mixed control chars and whitespace', () => {
    expect(isValidUrl(' \t\njavascript:alert(1)')).toBe(false);
  });
});

describe('isValidLinkUrl', () => {
  // It should pass the base security checks
  it('rejects javascript: URLs', () => {
    expect(isValidLinkUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects data:image/svg+xml', () => {
    expect(isValidLinkUrl('data:image/svg+xml,<svg>')).toBe(false);
  });

  it('rejects java\\x00script: bypass', () => {
    expect(isValidLinkUrl('java\x00script:alert(1)')).toBe(false);
  });

  // It should also enforce stricter link-specific validation
  it('allows https://example.com', () => {
    expect(isValidLinkUrl('https://example.com')).toBe(true);
  });

  it('allows http://localhost:3000', () => {
    expect(isValidLinkUrl('http://localhost:3000')).toBe(true);
  });

  it('allows relative paths /path/to/file', () => {
    expect(isValidLinkUrl('/path/to/file')).toBe(true);
  });

  it('allows fragment identifiers #section', () => {
    expect(isValidLinkUrl('#section')).toBe(true);
  });

  it('allows bare domain like example.com', () => {
    expect(isValidLinkUrl('example.com')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidLinkUrl('')).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    expect(isValidLinkUrl('   ')).toBe(false);
  });

  // data:image/png is valid for isValidUrl but not for isValidLinkUrl
  // (link dialog should not accept data: URLs even safe ones)
  it('rejects data:image/png (not a link)', () => {
    expect(isValidLinkUrl('data:image/png;base64,abc')).toBe(false);
  });
});
