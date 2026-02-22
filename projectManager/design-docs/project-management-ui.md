# Project Management UI — Quartz VS Code Extension

**Author:** Mathuran Sadagopan
**Status:** ARCHIVED
**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Reviewers:** TBD
**Related Docs:** [notion-markdown-editor](./notion-markdown-editor.md), [claude-code-integration](./claude-code-integration.md)

---

## 1. Problem Statement

The Quartz project management plugin generates structured markdown files — design documents and numbered implementation issues — but provides no visual interface for managing them. Users interact with these files one at a time in the editor or via CLI commands. There is no way to see all issues for a feature at a glance, no way to understand the dependency chain between issues without reading each file, and no way to quickly navigate a 400-line design document without scrolling.

Today, tracking issue status requires opening each `.md` file and reading the `**Status:**` header. Understanding which issues block which requires mentally reconstructing a dependency graph from `Depends On:` and `Blocks:` fields scattered across files. Navigating a design document means scrolling through 12 sections with no table-of-contents sidebar. Creating a new design document means remembering the template structure or running a CLI command.

These are solvable UI problems. A list view with filters, a dependency graph visualization, a section sidebar, and template scaffolding would make the Quartz project management workflow visual and fast — without leaving VS Code.

## 2. Goals and Non-Goals

### Goals

- **P0: Issue list/table view** — A dedicated VS Code webview panel that displays all issues for a feature (or across all features) in a sortable, filterable table. Columns: issue number, title, status, scope, dependencies, blockers. Inline status toggling (click to change TODO → IN_PROGRESS → DONE). Clicking an issue opens it in the Quartz editor.
- **P0: Template insertion** — A VS Code command (`Quartz: New Design Document from Template`) that creates a new `.md` file with all 12 design doc sections pre-filled as stubs with guidance comments. The file opens in the Quartz editor, ready for the user to fill in content.
- **P1: Section navigation sidebar** — When a design document is open in the Quartz editor, display a table-of-contents sidebar listing all section headings. Clicking a section scrolls the editor to that heading. The sidebar highlights the currently visible section.
- **P1: Dependency graph — inline indicators** — In the issue list view, show visual dependency indicators (arrows or badges) showing which issues block which. Blocked issues are visually distinguished (grayed out or marked with a blocker icon).
- **P1: Dependency graph — dedicated DAG panel** — A separate webview panel that renders the full dependency graph as a directed acyclic graph (DAG). Nodes are issues (colored by status). Edges represent dependency relationships. Clicking a node opens the issue. The graph uses Mermaid or a lightweight layout library.
- **P2: Cross-feature dashboard** — A summary view showing all features with their design doc status and issue completion percentage. A high-level "portfolio view" of the project.
- **P2: Inline issue editing** — Edit issue fields (status, scope, description) directly in the list view without opening the file.

### Non-Goals

- **Not a full project management tool** — No sprint planning, time tracking, velocity charts, or team assignment features. This is a visualization layer over Quartz's markdown files, not a replacement for Jira/Linear.
- **Not a Git integration** — No branch-per-issue automation, no PR linking, no commit association. Issues are standalone markdown files.
- **Not a notification system** — No alerts for blocked issues, no due date reminders, no status change notifications.
- **No database or server** — All data lives in markdown files in the workspace. The UI reads and writes these files directly. No backend service.

## 3. Background and Context

### Quartz File Structure

The project management plugin creates files in a well-defined structure:

```
projectManager/
├── design-docs/
│   ├── feature-a.md          # Design document (12-section Amazon 6-pager)
│   └── feature-b.md
└── issues/
    ├── feature-a/
    │   ├── 001-scaffold.md    # Issue files with YAML-style metadata headers
    │   ├── 002-parser.md
    │   └── 003-serializer.md
    └── feature-b/
        └── 001-setup.md
```

**Issue file metadata format:**

```markdown
# Issue Title

**Status:** TODO | IN_PROGRESS | BLOCKED | DONE
**Depends On:** #001, #002
**Blocks:** #004
**Scope:** XS | S | M | L | XL
**Design Doc:** [feature-name](../../design-docs/feature-name.md)
```

**Design doc header format:**

```markdown
# Feature Name Design Document

**Author:** Name
**Status:** DRAFT | IN_REVIEW | APPROVED | IMPLEMENTED
**Created:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD
```

### Extension Architecture (from Design Docs #1 and #2)

The Quartz extension uses a webview (React + TipTap) for the editor, an extension host (Node.js) for file I/O and the Agent SDK, and VS Code's API for commands and UI integration. The Project Management UI adds new webview panels (issue list, dependency graph) and a sidebar view (section navigation) that communicate with the extension host via `postMessage`.

```
┌─────────────────────────────────────────────────────────────────┐
│                           VS Code                                │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Quartz Editor │  │  Issue List   │  │  Dependency Graph      │ │
│  │ (Webview)     │  │  (Webview)    │  │  (Webview)             │ │
│  │               │  │              │  │                         │ │
│  │ • TipTap      │  │ • Table      │  │ • DAG Visualization    │ │
│  │ • Section Nav │  │ • Filters    │  │ • Mermaid / ELK        │ │
│  │   Sidebar     │  │ • Sort       │  │ • Interactive nodes    │ │
│  └──────┬────────┘  └──────┬───────┘  └───────────┬────────────┘ │
│         │                  │                       │              │
│         └──────────────────┼───────────────────────┘              │
│                            │                                      │
│                            ▼                                      │
│              ┌──────────────────────────┐                        │
│              │     Extension Host        │                        │
│              │     (Node.js)             │                        │
│              │                           │                        │
│              │  • Issue File Parser      │                        │
│              │  • Design Doc Parser      │                        │
│              │  • File Watcher           │                        │
│              │  • Markdown Serializer    │                        │
│              │  • Agent SDK (from #2)    │                        │
│              └─────────────┬────────────┘                        │
│                            │                                      │
│                            ▼                                      │
│              ┌──────────────────────────┐                        │
│              │  .md Files (Issues,       │                        │
│              │   Design Docs)            │                        │
│              └──────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### Prior Art

| Tool | What it does | Limitation for us |
|------|-------------|-------------------|
| VS Code's built-in Outline | Shows headings in a sidebar | Read-only, no scrolling integration with custom editors, no design doc awareness |
| GitHub Issues | Issue list with labels, filters, milestones | Web-based, not integrated with local files |
| Mermaid Preview extensions | Render Mermaid diagrams in VS Code | Static preview only, no interactive click-to-open |
| Markdown TOC generators | Insert table of contents in markdown | Generates markdown text, not an interactive sidebar |

None of these provide an interactive project management UI backed by local markdown files.

## 4. Proposed Solution

### Overview

The Project Management UI adds three visual components to the Quartz extension:

1. **Issue List Panel** — A webview panel (React) that parses issue markdown files and renders them as a sortable, filterable table with inline status toggling.
2. **Dependency Graph Panel** — A webview panel (React + ELK layout engine) that renders the full issue dependency DAG with interactive nodes.
3. **Section Navigation Sidebar** — A VS Code TreeView provider that lists design doc headings and supports click-to-scroll.

All components read from and write to the same markdown files. A file watcher keeps the UI in sync with external changes (e.g., edits from the Quartz editor, Git pulls, terminal edits).

### 4.1 Issue File Parser

The extension host includes a parser that extracts structured data from issue markdown files. This is the data source for both the list view and the dependency graph.

```typescript
interface ParsedIssue {
  number: number;                    // Extracted from filename: 001-*.md → 1
  title: string;                     // First H1 in the file
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  dependsOn: number[];               // Parsed from "**Depends On:** #001, #002"
  blocks: number[];                  // Parsed from "**Blocks:** #004"
  scope: "XS" | "S" | "M" | "L" | "XL";
  designDoc: string;                 // Relative path to parent design doc
  feature: string;                   // Extracted from parent directory name
  filePath: string;                  // Absolute path to the issue file
  description: string;               // First paragraph after metadata
}

interface ParsedDesignDoc {
  name: string;                      // Extracted from filename
  title: string;                     // First H1
  status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "IMPLEMENTED";
  author: string;
  created: string;
  lastUpdated: string;
  sections: { heading: string; level: number; line: number; }[];
  issueCount: number;
  issuesDone: number;
  filePath: string;
}
```

**Parsing strategy:**
- Read the file as text.
- Extract metadata using regex patterns for the `**Key:** Value` format.
- Parse section headings for the section list.
- The parser is intentionally lenient — missing fields default to sensible values (status defaults to "TODO", scope defaults to "M"). This avoids breaking the UI if a user manually edits a file and omits a field.

### 4.2 Issue List Panel

A dedicated webview panel (`Quartz: Issue Tracker`) that displays issues in a table.

**Table columns:**

| Column | Content | Sortable | Filterable |
|--------|---------|----------|------------|
| # | Issue number (e.g., `001`) | Yes | No |
| Title | Issue title (linked — click opens in Quartz editor) | Yes | Yes (text search) |
| Status | Badge: TODO / IN_PROGRESS / BLOCKED / DONE | Yes | Yes (multi-select) |
| Scope | XS / S / M / L / XL | Yes | Yes (multi-select) |
| Depends On | List of issue numbers this depends on | No | No |
| Blocks | List of issue numbers this blocks | No | No |
| Feature | Parent feature name | Yes | Yes (multi-select) |

**Inline status toggling:**
- Each status badge is a clickable dropdown.
- Selecting a new status writes the change to the issue's `.md` file (updating the `**Status:**` line).
- The file watcher detects the change and updates the Quartz editor if the file is open.

**Dependency indicators:**
- Issues with unresolved dependencies (depends on issues that are not DONE) show a warning icon.
- BLOCKED issues are visually dimmed with a "Blocked by #X" tooltip.
- Issues that block other issues show a "Blocks #X, #Y" badge.

**Filters and sorting:**
- Filter bar at the top: status filter (multi-select checkboxes), scope filter, feature filter, text search.
- Click column headers to sort ascending/descending.
- Filters and sort state persist in `context.workspaceState`.

**Data flow:**

```
Issue .md files  →  File Watcher  →  Issue Parser  →  Extension Host
                                                            │
                                                     postMessage
                                                            │
                                                            ▼
                                                   Issue List Webview
                                                   (React table)
                                                            │
                                                     User clicks
                                                     status toggle
                                                            │
                                                     postMessage
                                                            │
                                                            ▼
                                                   Extension Host
                                                   writes .md file
```

**Opening the panel:**
- Command palette: `Quartz: Show Issues`
- Activity bar icon (sidebar icon that opens the issue panel)
- Status bar item showing "3/10 issues done" — click to open

### 4.3 Dependency Graph Panel

A dedicated webview panel (`Quartz: Dependency Graph`) that renders the full issue dependency DAG.

**Visualization:**

- Each issue is a node: a rounded rectangle containing the issue number, title (truncated), and a status-colored dot.
- Edges (arrows) go from dependency → dependent (i.e., arrow from #001 to #002 means #002 depends on #001).
- Node colors by status:
  - TODO: Gray
  - IN_PROGRESS: Blue
  - BLOCKED: Red
  - DONE: Green

**Layout engine:**

We use [ELK.js](https://github.com/kieler/elkjs) (Eclipse Layout Kernel) for automatic DAG layout. ELK is specifically designed for directed graph layout and produces clean, readable results for dependency chains. It runs entirely in the browser (WebAssembly), no server needed.

**Why ELK over Mermaid:**
- Mermaid renders static SVGs — no click interaction, no dynamic updates.
- ELK computes node positions, and we render with React (SVG or Canvas). This gives us full control: click to open issue, hover for details, drag to rearrange (optional).
- ELK handles large graphs (50+ nodes) with good performance.

**Interactions:**
- **Click a node** → opens the issue in the Quartz editor.
- **Hover a node** → shows a tooltip with issue title, status, scope, and description excerpt.
- **Zoom and pan** — mouse wheel to zoom, drag canvas to pan.
- **Filter** — toggle to show/hide DONE issues. Toggle to show only the current feature or all features.
- **Highlight critical path** — issues that are on the longest dependency chain are highlighted with a thicker border.

**Data flow:**

Same as the issue list — the extension host parses issue files, sends structured data to the webview, and the webview renders the graph using ELK for layout and React for rendering.

**Opening the panel:**
- Command palette: `Quartz: Show Dependency Graph`
- Button in the issue list panel header: "View Graph"

### 4.4 Section Navigation Sidebar

When a design document is open in the Quartz editor, a sidebar panel displays a table of contents listing all section headings.

**Implementation:**

We use VS Code's `TreeDataProvider` API to create a tree view in the sidebar (explorer or a custom Quartz activity bar section). This is not a webview — it's a native VS Code tree, which is lighter weight and visually consistent with the rest of the VS Code sidebar.

```typescript
class DesignDocOutlineProvider implements vscode.TreeDataProvider<SectionItem> {
  // Fires when the active editor changes or the document is edited
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  onDidChangeTreeData = this._onDidChangeTreeData.event;

  getTreeItem(element: SectionItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.heading);
    item.command = {
      command: "quartz.scrollToSection",
      title: "Scroll to Section",
      arguments: [element.line]
    };
    // Highlight the currently visible section
    item.iconPath = element.isActive
      ? new vscode.ThemeIcon("arrow-right")
      : undefined;
    return item;
  }

  getChildren(): SectionItem[] {
    const doc = getActiveDesignDoc();
    if (!doc) return [];
    return doc.sections.map(s => ({
      heading: s.heading,
      level: s.level,
      line: s.line,
      isActive: isVisibleInEditor(s.line)
    }));
  }
}
```

**Behavior:**
- Automatically populates when a design doc is open in the Quartz editor.
- Clears when a non-design-doc file is active.
- Updates in real-time as the user adds/removes/renames headings.
- Clicking a section heading sends a message to the Quartz editor webview, which scrolls TipTap to that heading.
- The currently visible section is highlighted with an arrow icon.
- Indentation reflects heading level (H2 at root, H3 indented, etc.).

**Detection:** The sidebar activates when the active file is in `projectManager/design-docs/` or matches the design doc header pattern (same heuristic as design doc #2, §4.4).

### 4.5 Template Insertion

A VS Code command that scaffolds a new design document from the template.

**Command:** `Quartz: New Design Document from Template`

**Flow:**

1. User triggers the command via the command palette or a button in the sidebar.
2. Quick-pick prompt: "Enter feature name" (text input).
3. The extension reads `projectManager/skills/project-management/references/design-doc-template.md`.
4. Generates a new file at `projectManager/design-docs/{feature-name}.md` with:
   - The header block pre-filled (author from Git config, status DRAFT, today's date).
   - All 12 section headings with stub content and guidance comments.
5. Opens the file in the Quartz editor.
6. The section navigation sidebar populates immediately.

**Stub content example:**

```markdown
## 1. Problem Statement

<!-- Describe the problem from the customer's perspective. What pain do they experience?
     Why is this problem worth solving now? What is the cost of not solving it? -->

## 2. Goals and Non-Goals

### Goals

<!-- List specific, measurable goals. Prioritize as P0 (must have), P1 (should have), P2 (nice to have).
     Example: P0: Reduce API response time from 500ms to 100ms for 95th percentile requests. -->

- P0:
- P1:
- P2:

### Non-Goals

<!-- Explicitly state what this project will NOT do. Prevents scope creep. -->

-
```

This is a pure file-generation operation — no AI involved. It's fast and offline. For AI-assisted doc creation, the user uses `Quartz: Create Design Document` from design doc #2 (which invokes the `project-manager` subagent).

### 4.6 File Watcher and Sync

A VS Code `FileSystemWatcher` monitors the `projectManager/` directory for changes.

**Watched paths:**
- `projectManager/design-docs/*.md` — design doc changes
- `projectManager/issues/**/*.md` — issue changes

**Events:**
- **File created:** Re-parse all issues for the affected feature. Update the issue list and dependency graph.
- **File changed:** Re-parse the changed file. Update relevant UI elements (status badge, dependency arrows, section sidebar).
- **File deleted:** Remove the issue/doc from the UI. Show a warning if deleted issue was depended on by others.

**Debouncing:** File change events are debounced (200ms) to avoid excessive re-parsing during rapid edits or Git operations.

**Consistency:** When the user toggles a status in the issue list (which writes to a file), the file watcher detects the change and updates the Quartz editor if that file is open. This ensures the editor and the list view are always in sync without direct coupling.

### 4.7 Configuration

```jsonc
// settings.json
{
  "quartz.issues.defaultView": "list",           // "list" (table view is the only view in v1)
  "quartz.issues.showDoneIssues": true,          // Show completed issues in the list
  "quartz.issues.defaultFeatureFilter": "all",   // "all" or a specific feature name
  "quartz.graph.layout": "layered",              // ELK layout algorithm: "layered" | "force"
  "quartz.graph.showDoneNodes": false,           // Hide completed issues in the graph
  "quartz.sidebar.autoActivate": true            // Auto-show section nav when a design doc is open
}
```

## 5. Alternative Solutions Considered

### Alternative A: Render Issue Tracking Inside the Quartz Editor

**Approach:** Instead of a separate webview panel, render the issue list as a special block type inside a markdown file (e.g., `issues.md` that auto-generates a live table).

**Pros:**
- No new UI surface — everything lives in the editor.
- The issue list is itself a markdown file, consistent with the "everything is markdown" philosophy.

**Cons:**
- A live-updating table embedded in a markdown file is technically complex (the block must watch external files and re-render).
- Can't sort/filter a TipTap table the way a dedicated React table can.
- Mixes document editing and project management in a single view, which is confusing.
- The dependency graph can't be meaningfully embedded in a text editor.

**Why rejected:** The issue list and dependency graph are fundamentally different UIs from a document editor. Separate panels give us the right interaction model for each.

### Alternative B: Use VS Code's Native TreeView for Issues

**Approach:** Render the issue list as a VS Code TreeView (like the section sidebar) instead of a webview panel.

**Pros:**
- Lighter weight — no webview, no React.
- Visually consistent with VS Code's native UI.

**Cons:**
- TreeViews have limited formatting: no columns, no sortable headers, no inline status toggles, no badges.
- Filtering requires a custom search UI that TreeView doesn't support well.
- Dependency indicators (arrows, badges) are impossible in a TreeView.
- The dependency graph can't be rendered in a TreeView at all.

**Why rejected:** TreeViews are great for simple lists (like the section sidebar) but inadequate for a data-rich table with sorting, filtering, and inline editing. The issue list needs a React-based webview for the right UX.

### Alternative C: Use Mermaid for the Dependency Graph

**Approach:** Generate a Mermaid flowchart definition from the issue data and render it using a Mermaid rendering library.

**Pros:**
- Mermaid is already a dependency (from design doc #1 for Mermaid code blocks in the editor).
- Simple to generate: just output `graph TD; 001 --> 002; 002 --> 003;` etc.

**Cons:**
- Mermaid renders static SVGs. No click-to-open, no hover tooltips, no dynamic updates without full re-render.
- Layout quality degrades with larger graphs (20+ nodes). Mermaid's built-in layout isn't optimized for DAGs.
- No zoom/pan interaction — the SVG is rendered at a fixed size.
- Mermaid in a webview requires significant CSP exceptions for inline SVG rendering.

**Why rejected:** The dependency graph needs to be interactive (click nodes, hover for details, zoom/pan). Mermaid produces static output. ELK.js computes positions, and React renders interactive nodes — giving us the right interaction model.

## 6. Security, Privacy, and Compliance

### File Access

- All data is read from and written to local markdown files in the workspace. No external services or APIs are used by this component.
- The issue list writes only to the specific `**Status:**` line when the user toggles a status. It uses a targeted line replacement, not a full file rewrite, to minimize the risk of data loss.
- The template insertion command writes only to `projectManager/design-docs/` — a well-known, expected directory.

### Webview Security

- The issue list and dependency graph webviews run with the same strict CSP as the Quartz editor (design doc #1, §6).
- No external network requests. All rendering libraries (React, ELK.js) are bundled with the extension.
- Webviews communicate with the extension host exclusively via `postMessage`.

### Data Integrity

- The file watcher debounces changes to avoid race conditions between the UI and file system.
- Status writes are atomic (single line replacement). If the write fails (file locked, permissions), the UI reverts to the previous state and shows an error toast.
- The parser is lenient — malformed metadata is ignored rather than causing the UI to crash. Missing fields get default values.

## 7. Testing Strategy

### Unit Tests

- **Issue file parser tests:** Parse 50+ fixture files covering edge cases: missing fields, extra fields, malformed metadata, empty files, non-standard formatting, unusual filenames.
- **Design doc parser tests:** Parse fixture files with varying numbers of sections, non-standard heading levels, missing headers.
- **Dependency graph construction:** Given parsed issues, build the DAG. Test for cycles (should be detected and reported), orphan nodes, disconnected subgraphs.
- **Status write tests:** Mock the file system. Verify that toggling a status writes the correct `**Status:** NEW_STATUS` line without affecting other content.

### Integration Tests

- **Issue list panel:** Open the panel in a VS Code test instance. Verify the table renders with correct data. Toggle a status, verify the file is updated. Add a filter, verify the table updates.
- **Dependency graph panel:** Open the panel. Verify nodes and edges render correctly. Click a node, verify the issue opens in the editor.
- **Section sidebar:** Open a design doc. Verify the sidebar lists all sections. Click a section, verify the editor scrolls. Edit a heading, verify the sidebar updates.
- **File watcher:** Create/modify/delete issue files externally. Verify the UI updates within 500ms.
- **Template insertion:** Run the command. Verify the file is created with correct content. Verify it opens in the Quartz editor.

### End-to-End Tests

- Full workflow: create a design doc from template → fill in sections (verify sidebar works) → create issues via design doc #2 → view in issue list → check dependency graph → toggle statuses → verify design doc issue table updates.
- Cross-platform: test on macOS, Windows, and Linux.

### Performance Tests

- **Large issue sets:** Render the issue list and dependency graph with 50, 100, and 200 issues. Measure render time (target: <500ms for 100 issues).
- **File watcher throughput:** Simulate rapid file changes (Git checkout switching branches). Verify the UI remains responsive and doesn't queue excessive re-parses.
- **ELK layout performance:** Measure layout computation time for graphs with 100+ nodes (target: <1 second).

## 8. Rollout Plan

### Phase 1: Issue List Panel + File Parser

- Issue file parser with metadata extraction.
- Issue list webview panel with sortable table.
- Status filter (multi-select checkboxes).
- Inline status toggling with file write-back.
- File watcher for live updates.
- Command: `Quartz: Show Issues`.

### Phase 2: Section Sidebar + Template Insertion

- Section navigation sidebar (TreeView) for design docs.
- Click-to-scroll integration with the Quartz editor webview.
- Active section highlighting.
- Template insertion command: `Quartz: New Design Document from Template`.

### Phase 3: Dependency Graph

- Dependency graph webview panel with ELK.js layout.
- Interactive nodes (click to open, hover for details).
- Zoom and pan.
- Filter toggles (show/hide DONE, feature filter).
- Inline dependency indicators in the issue list.
- Critical path highlighting.

### Phase 4: Polish (P2 features)

- Cross-feature dashboard.
- Inline issue editing in the list view.
- Scope filter, text search in the issue list.
- Graph layout algorithm toggle (layered vs. force-directed).

### Monitoring

- No external monitoring needed — this is a fully local component.
- VS Code output channel ("Quartz") logs parse errors and file watcher events for debugging.
- If the parser encounters a malformed file, it logs a warning and skips the file rather than crashing.

## 9. Dependencies and Risks

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| VS Code Webview API | Platform | For the issue list and dependency graph panels. |
| VS Code TreeView API | Platform | For the section navigation sidebar. |
| VS Code FileSystemWatcher | Platform | For monitoring issue and design doc file changes. |
| React | Library | UI framework for webview panels. Shared with the Quartz editor (design doc #1). |
| ELK.js | Library | Eclipse Layout Kernel for DAG layout. MIT licensed. ~500KB (WASM). |
| Quartz Editor (Design Doc #1) | Internal | The TipTap editor webview that the section sidebar and template insertion integrate with. |
| Issue/Design Doc file format | Internal | The markdown metadata format used by the Quartz project management plugin. |

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Issue file format drift — users manually edit files and break the metadata format | Medium | High | Lenient parser with defaults for missing fields. Log warnings for malformed files. Consider a "fix format" command that normalizes metadata. |
| File watcher race conditions — UI reads a file while it's being written | Low | Medium | Debounce (200ms). Read files with retry on failure. Use VS Code's text document API (which handles locking) instead of raw `fs.readFile`. |
| ELK.js bundle size — 500KB WASM adds to extension size | Low | Low | ELK.js is only loaded when the dependency graph panel is opened (lazy load). Not included in the main extension bundle. |
| Dependency cycles in issue files — user creates circular dependencies | Medium | Medium | Detect cycles during parsing. Display a warning in both the issue list and the graph. Highlight the cyclic edges in red. |
| Large numbers of issues (100+) — table rendering and graph layout become slow | Medium | Low | Virtual scrolling for the table (render only visible rows). ELK.js layout is async (doesn't block the UI thread). Pagination as a fallback. |
| Section sidebar out of sync with editor — sidebar shows stale headings after rapid edits | Low | Medium | Debounce sidebar updates (300ms). Trigger on TipTap's `onUpdate` event via postMessage, not on file save. |

## 10. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Should the issue list panel live in the sidebar (activity bar) or as a full editor-width panel? Sidebar saves space but is narrower. | Product | Open |
| 2 | Should we support issue re-numbering when issues are deleted or reordered? Currently, gaps in numbering (001, 003 after deleting 002) are allowed. | Product | Open |
| 3 | Should the dependency graph support manual node positioning (drag to rearrange) or always use automatic layout? Manual positioning adds complexity but lets users create cleaner visualizations. | Product | Open |
| 4 | Should the section sidebar show the word count per section? This could help authors ensure sections are balanced. | Product | Open |

## 11. Implementation Issues

*This section will be populated when `/create-issues project-management-ui` is run after this document is approved.*

| # | Title | Status | Scope |
|---|-------|--------|-------|
| — | — | — | — |

**Progress:** 0/0 issues complete (0%)

## 12. Appendix

### A. Issue List Mockup (Text)

```
┌──────────────────────────────────────────────────────────────────┐
│  Quartz: Issue Tracker                              [View Graph] │
│                                                                  │
│  Feature: [All ▼]  Status: [☑ TODO ☑ IN_PROGRESS ☐ DONE]       │
│  Search: [________________]                                      │
│                                                                  │
│  #   │ Title                    │ Status      │ Scope │ Deps    │
│  ────┼──────────────────────────┼─────────────┼───────┼─────────│
│  001 │ Extension Scaffold       │ ● DONE      │ M     │ —       │
│  002 │ Markdown Parser          │ ● IN_PROG   │ M     │ #001    │
│  003 │ Serializer               │ ○ TODO      │ M     │ #001    │
│  004 │ Round-trip Tests         │ ⊘ BLOCKED   │ M     │ #002,03 │
│  005 │ Core Editor              │ ○ TODO      │ M     │ #001    │
│                                                                  │
│  5 issues │ 1 done │ 1 in progress │ 1 blocked │ 2 todo         │
└──────────────────────────────────────────────────────────────────┘
```

### B. Dependency Graph Mockup (Text)

```
┌──────────────────────────────────────────────────────────────────┐
│  Quartz: Dependency Graph — notion-markdown-editor               │
│  [☑ Show DONE] [All features ▼]                    [Zoom: 100%] │
│                                                                  │
│       ┌─────────┐                                                │
│       │ 001     │                                                │
│       │ Scaffold│                                                │
│       │ ● DONE  │                                                │
│       └────┬────┘                                                │
│       ┌────┼────────────┐                                        │
│       │    │            │                                        │
│       ▼    ▼            ▼                                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                         │
│  │ 002     │  │ 003     │  │ 005     │                          │
│  │ Parser  │  │ Serial. │  │ Editor  │                          │
│  │ ● PROG  │  │ ○ TODO  │  │ ○ TODO  │                          │
│  └────┬────┘  └────┬────┘  └─────────┘                          │
│       │            │                                             │
│       └─────┬──────┘                                             │
│             ▼                                                    │
│       ┌─────────┐                                                │
│       │ 004     │                                                │
│       │ Tests   │                                                │
│       │ ⊘ BLOCK │                                                │
│       └─────────┘                                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### C. Section Sidebar Mockup (Text)

```
┌──────────────────────────┐
│ QUARTZ: SECTIONS         │
│                          │
│ → 1. Problem Statement   │
│   2. Goals and Non-Goals │
│   3. Background          │
│   4. Proposed Solution   │
│     4.1 Subagent Defs    │
│     4.2 Custom MCP Tools │
│     4.3 Slash Commands   │
│     4.4 Command Bridge   │
│     4.5 Review Suggest.  │
│     4.6 Session Mgmt     │
│   5. Alternatives        │
│   6. Security            │
│   7. Testing             │
│   8. Rollout             │
│   9. Dependencies        │
│  10. Open Questions      │
│  11. Implementation      │
│  12. Appendix            │
└──────────────────────────┘
```
