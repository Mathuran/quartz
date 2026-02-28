/**
 * Language definitions for the code block language selector.
 * Common languages appear first in the dropdown, followed by all languages.
 */

export interface LanguageEntry {
  id: string;
  label: string;
}

/** Most frequently used languages — shown at the top of the dropdown. */
export const COMMON_LANGUAGES: LanguageEntry[] = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'c', label: 'C' },
  { id: 'cpp', label: 'C++' },
  { id: 'csharp', label: 'C#' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'php', label: 'PHP' },
  { id: 'swift', label: 'Swift' },
  { id: 'kotlin', label: 'Kotlin' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'scss', label: 'SCSS' },
  { id: 'json', label: 'JSON' },
  { id: 'yaml', label: 'YAML' },
  { id: 'xml', label: 'XML' },
  { id: 'sql', label: 'SQL' },
  { id: 'bash', label: 'Bash' },
  { id: 'shell', label: 'Shell' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'diff', label: 'Diff' },
  { id: 'graphql', label: 'GraphQL' },
  { id: 'lua', label: 'Lua' },
  { id: 'r', label: 'R' },
  { id: 'perl', label: 'Perl' },
  { id: 'makefile', label: 'Makefile' },
  { id: 'ini', label: 'INI' },
];

/** All registered languages (superset of common). */
export const ALL_LANGUAGES: LanguageEntry[] = [
  ...COMMON_LANGUAGES,
  { id: 'arduino', label: 'Arduino' },
  { id: 'less', label: 'Less' },
  { id: 'objectivec', label: 'Objective-C' },
  { id: 'php-template', label: 'PHP Template' },
  { id: 'plaintext', label: 'Plain Text' },
  { id: 'python-repl', label: 'Python REPL' },
  { id: 'vbnet', label: 'VB.NET' },
  { id: 'wasm', label: 'WebAssembly' },
].sort((a, b) => a.label.localeCompare(b.label));

/** Set of common language IDs for quick lookup. */
export const COMMON_LANGUAGE_IDS = new Set(COMMON_LANGUAGES.map((l) => l.id));
