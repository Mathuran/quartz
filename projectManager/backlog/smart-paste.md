# Smart Paste

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P1                           |
| **Tags**       | editor, ux                   |
| **Related**    | [ai-agent-compatibility](./ai-agent-compatibility.md) |
| **Created**    | 2026-02-21                   |

## Problem

Users frequently paste markdown content from AI chat interfaces (ChatGPT, Claude.ai, Gemini), web pages, terminals, and other editors into the Quartz WYSIWYG view. The pasted content almost always has formatting artifacts that require manual cleanup:

- **AI chat output** includes framing like `**Assistant:**` prefixes, unnecessary triple-backtick wrappers around non-code content, and conversational preamble ("Sure! Here's the updated section:")
- **Web pages** produce deeply nested HTML that converts to messy markdown with redundant styling, broken links, and inline styles
- **Terminal output** has ANSI escape codes, prompt characters, and inconsistent whitespace
- **Other editors** (Notion, Google Docs) paste with proprietary formatting that doesn't map cleanly to standard markdown

This is high-frequency friction. Users paste AI-generated content multiple times per session and spend time manually stripping artifacts every time.

## Desired Outcome

When the user pastes content into the Quartz editor, a normalization pipeline detects the source format and cleans the content before it enters the document. The user sees clean, well-structured markdown blocks appear — not raw artifacts.

The pipeline should handle the most common sources:
- Strip AI chat framing and conversational prefixes
- Unwrap unnecessary code fences around prose content
- Normalize HTML paste into clean markdown structure
- Clean whitespace and line-ending inconsistencies
- Preserve intentional formatting (actual code blocks, tables, lists)

The normalization is invisible by default — paste just works. For advanced users, a "Paste as raw markdown" option is available via Cmd+Shift+V to bypass the pipeline.

## Scope & Boundaries

**In scope:**
- Paste event interception in the TipTap editor
- Source-format detection heuristics (AI chat, HTML, plain text, terminal)
- Normalization rules for each detected format
- Bypass mechanism for raw paste
- Handling clipboard content in both `text/html` and `text/plain` formats

**Out of scope:**
- Paste from image clipboard (screenshots, diagrams)
- Paste from spreadsheets (Excel, Google Sheets → table conversion)
- User-configurable normalization rules
- Paste history or clipboard manager features

## Open Questions

- Should the editor show a brief toast ("Cleaned up AI chat formatting") so the user knows normalization happened, or should it be completely silent?
- How aggressively should the pipeline strip content — e.g., should it remove ALL text before the first markdown heading in an AI response, or use more conservative heuristics?
- Can we detect the source application from clipboard metadata, or do we rely purely on content-based heuristics?

## Notes

- TipTap supports custom paste handling via `PasteRule` extensions and the `handlePaste` editor prop
- ProseMirror's `clipboardTextParser` and `clipboardSerializer` hooks provide low-level paste interception
- VS Code's built-in markdown editor has basic paste handling for URLs (auto-linking) — we can extend this pattern
