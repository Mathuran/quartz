// Mock VS Code API for tests
export const workspace = {
  getConfiguration: () => ({
    get: (key: string, defaultValue: unknown) => defaultValue,
  }),
  onDidChangeTextDocument: () => ({ dispose: () => {} }),
  onDidChangeConfiguration: () => ({ dispose: () => {} }),
  applyEdit: async () => true,
};

export const window = {
  registerCustomEditorProvider: () => ({ dispose: () => {} }),
  showInformationMessage: async () => undefined,
};

export const Uri = {
  joinPath: (...args: unknown[]) => ({ fsPath: args.join('/') }),
  file: (path: string) => ({ fsPath: path }),
};

export const Range = class {
  constructor(
    public startLine: number,
    public startChar: number,
    public endLine: number,
    public endChar: number
  ) {}
};

export const WorkspaceEdit = class {
  replace() {}
};

export enum TextDocumentChangeReason {
  Undo = 1,
  Redo = 2,
}
