export interface EditorConfig {
  theme: 'auto' | 'light' | 'dark';
  fontFamily: string;
  fontSize: number;
  pageLayout: boolean;
  pageWidth: number;
  pageMargin: number;
  imageDir: string;
  preserveFormatting: boolean;
  showBlockHandles: boolean;
}

export interface EditorMessage {
  type: string;
  [key: string]: unknown;
}
