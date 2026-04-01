export const EDITOR_THEMES = ['default', 'clean', 'warm', 'academic', 'minimal'] as const;
export type EditorTheme = (typeof EDITOR_THEMES)[number];

export interface EditorConfig {
  editorTheme: EditorTheme;
  imageDir: string;
  preserveFormatting: boolean;
  showBlockHandles: boolean;
}

export interface EditorMessage {
  type: string;
  [key: string]: unknown;
}
