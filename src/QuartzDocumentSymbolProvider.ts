import * as vscode from 'vscode';
import { extractHeadingsFromMarkdown } from './utils/headingExtractor';

export class QuartzDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.DocumentSymbol[] {
    const headings = extractHeadingsFromMarkdown(document.getText());

    return headings.map((h) => {
      const line = document.lineAt(h.line);
      const range = line.range;
      return new vscode.DocumentSymbol(
        h.text,
        `H${h.level}`,
        vscode.SymbolKind.String,
        range,
        range,
      );
    });
  }
}
