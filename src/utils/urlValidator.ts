/**
 * Validates a URL to ensure it's safe to use in the editor.
 * Blocks javascript:, vbscript:, and non-image data: URIs.
 */
export function isValidUrl(url: string): boolean {
  const trimmedUrl = url.trim().toLowerCase();

  if (trimmedUrl.startsWith('javascript:')) {
    return false;
  }

  if (trimmedUrl.startsWith('data:') && !trimmedUrl.startsWith('data:image/')) {
    return false;
  }

  if (trimmedUrl.startsWith('vbscript:')) {
    return false;
  }

  return true;
}
