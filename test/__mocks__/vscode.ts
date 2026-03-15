// Mock VS Code API for tests
//
// This mock provides enough of the VS Code API surface for unit tests that
// import from 'vscode'. It is NOT exhaustive — only APIs actually used by the
// extension (or likely to be used in tests) are stubbed here.
//
// For full end-to-end coverage of webview behaviour, see the Playwright E2E
// tests under test/e2e/.

import * as pathPosix from 'path/posix';

// ---------------------------------------------------------------------------
// Configuration override helper
// ---------------------------------------------------------------------------

/**
 * Per-test configuration overrides. Call `__setConfigOverrides` in a test to
 * make `workspace.getConfiguration().get()` return specific values instead of
 * the supplied defaults.
 *
 * Keys should be fully-qualified, e.g. `"quartz.editor.theme"`.
 * Call `__resetConfigOverrides()` in `afterEach` to clean up.
 */
let configOverrides: Record<string, unknown> = {};

export function __setConfigOverrides(overrides: Record<string, unknown>): void {
  configOverrides = { ...overrides };
}

export function __resetConfigOverrides(): void {
  configOverrides = {};
}

// ---------------------------------------------------------------------------
// Core classes
// ---------------------------------------------------------------------------

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number,
  ) {}
}

export class Range {
  public readonly start: Position;
  public readonly end: Position;

  constructor(startLine: number, startChar: number, endLine: number, endChar: number);
  constructor(start: Position, end: Position);
  constructor(
    startLineOrPos: number | Position,
    startCharOrEnd: number | Position,
    endLine?: number,
    endChar?: number,
  ) {
    if (typeof startLineOrPos === 'number') {
      this.start = new Position(startLineOrPos, startCharOrEnd as number);
      this.end = new Position(endLine!, endChar!);
    } else {
      this.start = startLineOrPos;
      this.end = startCharOrEnd as Position;
    }
  }
}

export class WorkspaceEdit {
  /** Captured edits — inspect this array in tests to assert on edits applied. */
  _edits: Array<{ uri: unknown; range: unknown; newText: string }> = [];

  replace(uri: unknown, range: unknown, newText: string): void {
    this._edits.push({ uri, range, newText });
  }
}

export class Disposable {
  constructor(private callOnDispose: () => void) {}

  static from(...disposables: { dispose: () => unknown }[]): Disposable {
    return new Disposable(() => {
      disposables.forEach((d) => d.dispose());
    });
  }

  dispose(): void {
    this.callOnDispose();
  }
}

export class EventEmitter<T = unknown> {
  private listeners: Array<(e: T) => unknown> = [];

  /** Subscribe to this event. Returns a Disposable that removes the listener. */
  event = (listener: (e: T) => unknown): Disposable => {
    this.listeners.push(listener);
    return new Disposable(() => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    });
  };

  /** Fire the event, notifying all current listeners. */
  fire(data: T): void {
    this.listeners.forEach((l) => l(data));
  }

  dispose(): void {
    this.listeners = [];
  }
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum TextDocumentChangeReason {
  Undo = 1,
  Redo = 2,
}

export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
}

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

// ---------------------------------------------------------------------------
// Uri
// ---------------------------------------------------------------------------

export const Uri = {
  /**
   * Join path segments onto a base URI. Uses posix path joining so that
   * tests get realistic path separators regardless of platform.
   */
  joinPath: (base: { fsPath: string }, ...segments: string[]) => ({
    fsPath: pathPosix.join(base.fsPath, ...segments),
    toString: () => pathPosix.join(base.fsPath, ...segments),
  }),

  file: (filePath: string) => ({
    fsPath: filePath,
    path: filePath,
    scheme: 'file',
    toString: () => `file://${filePath}`,
  }),

  parse: (value: string) => ({
    fsPath: value.replace(/^file:\/\//, ''),
    path: value.replace(/^file:\/\//, ''),
    scheme: 'file',
    toString: () => value,
  }),
};

// ---------------------------------------------------------------------------
// commands namespace
// ---------------------------------------------------------------------------

const registeredCommands = new Map<string, (...args: unknown[]) => unknown>();

export const commands = {
  /**
   * Register a command. Returns a Disposable that unregisters it.
   */
  registerCommand(id: string, handler: (...args: unknown[]) => unknown): Disposable {
    registeredCommands.set(id, handler);
    return new Disposable(() => {
      registeredCommands.delete(id);
    });
  },

  /**
   * Execute a previously registered command. Returns undefined if the
   * command is not registered (mirrors VS Code behaviour for unknown
   * built-in commands in a test environment).
   */
  async executeCommand(id: string, ...args: unknown[]): Promise<unknown> {
    const handler = registeredCommands.get(id);
    if (handler) return handler(...args);
    return undefined;
  },
};

// ---------------------------------------------------------------------------
// workspace namespace
// ---------------------------------------------------------------------------

export const workspace = {
  getConfiguration: (section?: string) => ({
    get: <T>(key: string, defaultValue?: T): T => {
      const fullKey = section ? `${section}.${key}` : key;
      if (fullKey in configOverrides) {
        return configOverrides[fullKey] as T;
      }
      return defaultValue as T;
    },
    update: async () => {},
  }),
  onDidChangeTextDocument: () => new Disposable(() => {}),
  onDidChangeConfiguration: () => new Disposable(() => {}),
  applyEdit: async () => true,
  openTextDocument: async () => ({ getText: () => '', lineCount: 0 }),
};

// ---------------------------------------------------------------------------
// window namespace
// ---------------------------------------------------------------------------

export const window = {
  registerCustomEditorProvider: () => new Disposable(() => {}),
  showInformationMessage: async () => undefined,
  showWarningMessage: async () => undefined,
  showErrorMessage: async () => undefined,
  createTreeView: () => ({ dispose: () => {} }),
  activeTextEditor: undefined as unknown,
  tabGroups: {
    activeTabGroup: {
      activeTab: undefined as unknown,
    },
  },
};

// ---------------------------------------------------------------------------
// languages namespace
// ---------------------------------------------------------------------------

export const languages = {
  registerDocumentSymbolProvider: () => new Disposable(() => {}),
};

// ---------------------------------------------------------------------------
// extensions namespace
// ---------------------------------------------------------------------------

export const extensions = {
  getExtension: () => undefined,
};
