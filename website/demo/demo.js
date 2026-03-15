/**
 * Quartz Editor Demo — Standalone browser instance
 *
 * Phase 3 will integrate the actual TipTap editor from the Quartz codebase.
 * For now, this provides a static sample document that demonstrates the
 * editor's output quality. The contentEditable attribute makes it interactive.
 */

const SAMPLE_CONTENT = `
<h1>Welcome to Quartz</h1>
<p>A <strong>Notion-style</strong> markdown editor that lives inside VS Code. Start typing to see how it feels.</p>

<h2>Features</h2>
<ul>
  <li>Rich block editing with <strong>slash commands</strong></li>
  <li>Round-trip <code>markdown</code> fidelity</li>
  <li>Obsidian-compatible callouts</li>
  <li>Inline code, <strong>bold</strong>, <em>italic</em>, and more</li>
</ul>

<h2>Code Example</h2>
<pre><code>function greet(name) {
  return \`Hello, \${name}! Welcome to Quartz.\`;
}

console.log(greet("World"));</code></pre>

<blockquote>
  <strong>Tip:</strong> Everything you edit here is standard markdown under the hood. No proprietary formats, no lock-in.
</blockquote>

<h2>Try It</h2>
<p>Click anywhere and start editing. This is the same rendering engine that powers the VS Code extension.</p>

<hr>

<p><em>Install Quartz from the VS Code Marketplace to get the full experience with slash commands, drag-and-drop blocks, and more.</em></p>
`;

document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('editor');
  if (!editor) return;

  editor.innerHTML = SAMPLE_CONTENT;
  editor.setAttribute('contenteditable', 'true');
  editor.setAttribute('spellcheck', 'true');
  editor.setAttribute('role', 'textbox');
  editor.setAttribute('aria-label', 'Quartz editor demo');
  editor.setAttribute('aria-multiline', 'true');

  // Focus the editor
  editor.focus();

  // Notify parent that demo is loaded
  try {
    window.parent.postMessage({ type: 'quartz-demo-loaded' }, '*');
  } catch {
    // Silently fail if cross-origin
  }
});
