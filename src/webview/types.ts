export interface EditorConfig {
  theme: 'auto' | 'light' | 'dark';
  fontFamily: string;
  fontSize: number;
  pageLayout: boolean;
  pageMargin: number;
  imageDir: string;
  preserveFormatting: boolean;
  showBlockHandles: boolean;
}

export interface EditorMessage {
  type: string;
  [key: string]: unknown;
}
