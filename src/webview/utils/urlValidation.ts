/**
 * Shared URL validation utility.
 *
 * All code paths that accept a URL from user input (link input rule,
 * Mod-K shortcut, image slash command, LinkDialog) MUST funnel through
 * `isValidUrl()` so that security policy is enforced in one place.
 */

/**
 * Allowlisted data: image MIME types.
 * SVG is intentionally excluded because SVG can embed `<script>` tags
 * and event-handler attributes (e.g., `onload`).
 */
const SAFE_DATA_IMAGE_PREFIXES = [
  'data:image/png',
  'data:image/jpeg',
  'data:image/gif',
  'data:image/webp',
] as const;

/**
 * Strip ASCII control characters (0x00-0x1F) and DEL (0x7F) from a string.
 * Attackers can embed these to bypass naive `startsWith` checks — for
 * example `java\x09script:` looks different from `javascript:` to a
 * string comparison but some engines may ignore the control character.
 */
export function stripControlCharacters(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x1f\x7f]/g, '');
}

/**
 * Validates a URL to ensure it is safe to use as an `href` or image `src`.
 *
 * Policy:
 *   - Block `javascript:` protocol (XSS vector)
 *   - Block `vbscript:` protocol (legacy IE XSS vector)
 *   - Block all `data:` URLs except a small allowlist of safe image types
 *   - Strip control characters before every check to prevent bypass
 *   - Allow http, https, relative paths, and fragment identifiers
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  // 1. Strip control characters and trim whitespace
  const cleaned = stripControlCharacters(url).trim().toLowerCase();

  if (!cleaned) return false;

  // 2. Block dangerous protocols
  if (cleaned.startsWith('javascript:')) return false;
  if (cleaned.startsWith('vbscript:')) return false;

  // 3. Handle data: URLs — only allow safe image MIME types
  if (cleaned.startsWith('data:')) {
    return SAFE_DATA_IMAGE_PREFIXES.some((prefix) => cleaned.startsWith(prefix));
  }

  // 4. Allow everything else (http, https, relative paths, fragments, mailto, etc.)
  return true;
}

/**
 * Stricter URL validation for link dialogs — only allows http/https,
 * relative paths (starting with `/`), and fragment identifiers (`#`).
 *
 * This is a superset check: it first runs the security validation from
 * `isValidUrl()`, then additionally requires the URL to be one of the
 * recognised "link-safe" forms.
 */
export function isValidLinkUrl(url: string): boolean {
  if (!url || !url.trim()) return false;

  // Must pass the base security check first
  const cleaned = stripControlCharacters(url).trim();

  if (!isValidUrl(cleaned)) return false;

  // Allow relative URLs starting with / or #
  if (cleaned.startsWith('/') || cleaned.startsWith('#')) return true;

  // Check for valid http/https URLs
  try {
    const parsed = new URL(cleaned);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    // If it doesn't have a protocol, try adding https://
    try {
      const parsed = new URL('https://' + cleaned);
      return parsed.hostname.includes('.');
    } catch {
      return false;
    }
  }
}
