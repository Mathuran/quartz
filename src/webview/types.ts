export interface EditorConfig {
  theme: 'auto' | 'light' | 'dark';
  fontFamily: string;
  fontSize: number;
  pageLayout: boolean;
  // Note: pageWidth and pageMargin removed in √2 layout system (v1)
  // Width (800px) and margin (48px) are now CSS-defined constants
  // derived from √2 ratio. See editor.css for details.
  imageDir: string;
  preserveFormatting: boolean;
  showBlockHandles: boolean;
}

export interface EditorMessage {
  type: string;
  [key: string]: unknown;
}
