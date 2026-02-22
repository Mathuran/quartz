# Claude Code Integration — Quartz VS Code Extension

**Author:** Mathuran Sadagopan
**Status:** ARCHIVED
**Created:** 2026-02-03
**Last Updated:** 2026-02-03 (Rev 2 — refactored to use Claude Agent SDK)
**Reviewers:** TBD
**Related Docs:** [notion-markdown-editor](./notion-markdown-editor.md), [project-management-ui](./project-management-ui.md)

---

## 1. Problem Statement

Writing design documents, issues, and technical prose is cognitively demanding. Authors stare at blank sections, struggle to articulate security considerations they haven't thought through, and produce inconsistent quality across sections. Review cycles catch gaps late — after the author has already committed to an approach.

The Quartz project management plugin for Claude Code already provides structured commands (`/design-doc`, `/review-doc`, `/create-issues`, `/issue-status`) that leverage Claude to assist with these tasks. But today these commands run exclusively in the CLI terminal. The output is plain text that the user must then manually locate and open. There is no feedback loop between the AI's suggestions and the editor where the document lives.

By integrating Claude directly into the Quartz markdown editor, we can close this gap: AI assistance happens in-context, at the cursor, inside the document — not in a separate terminal window. The author types `/expand` and Claude drafts the next paragraph inline. Claude reads the Proposed Solution section and flags that the Testing Strategy doesn't cover a key failure mode. Commands like `/design-doc` create files and open them directly in the rich editor, ready to work on.

## 2. Goals and Non-Goals

### Goals

- **P0: Inline AI slash commands** — Extend the editor's slash command menu with AI-powered actions (`/ask`, `/summarize`, `/expand`, `/rewrite`, `/draft-section`). Claude's response streams directly into the document as editable blocks at the cursor position.
- **P0: Native command bridge** — Run Quartz project management commands (`/design-doc`, `/review-doc`, `/create-issues`, `/issue-status`) from the VS Code command palette. The extension uses the Claude Agent SDK with specialized subagents for each command. Results are rendered in the editor or a dedicated output panel.
- **P0: API key management** — Secure configuration for Claude API credentials. Support Anthropic API key via VS Code settings (encrypted secret storage) or environment variable.
- **P1: Design-doc-aware section generation** — When editing a file that matches the design doc template structure, Claude can draft or expand individual sections using context from other sections in the same document (e.g., "Write the Testing Strategy based on the Proposed Solution").
- **P1: Proactive review suggestions** — Claude analyzes the document on save (or on demand) and surfaces actionable suggestions as inline annotations (e.g., "Security section doesn't address data encryption", "Goal #3 is not measurable — consider adding a metric").
- **P1: Streaming responses** — AI-generated content streams token-by-token into the editor, so the user sees output appearing in real-time rather than waiting for completion.
- **P2: Context-aware completions** — When the user pauses typing mid-sentence, offer a ghost-text completion (similar to Copilot) powered by Claude, using the document context. Accept with Tab.
- **P2: Prompt history** — Store the last 20 AI interactions per document for review and re-invocation.

### Non-Goals

- **Not a general-purpose AI chat assistant** — No side panel conversation UI. All interactions happen inline in the document or via the command palette. Chat-style interaction is out of scope.
- **Not a code generation tool** — This integration is for prose and documentation. Code completions within code blocks are left to GitHub Copilot or similar tools.
- **Not a Claude Code CLI wrapper** — We do not shell out to the Claude Code CLI. The extension uses the Claude Agent SDK as a library.
- **Not an autonomous agent** — Claude responds to explicit user actions (slash commands, command palette). It does not modify the document without user initiation (proactive suggestions are read-only annotations, not edits).

## 3. Background and Context

### Claude Agent SDK

The [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview) (`@anthropic-ai/claude-agent-sdk`) is a TypeScript/Python library that lets you build production AI agents using Claude Code's infrastructure. Unlike the raw Anthropic Client SDK (where you implement the tool loop yourself), the Agent SDK handles tool execution autonomously — you provide a prompt and consume a message stream.

**Key capabilities we will leverage:**

| Capability | How we use it |
|-----------|---------------|
| **`query()` with streaming** | All AI interactions stream `SDKMessage` objects. We consume `SDKAssistantMessage` and `SDKPartialAssistantMessage` events to render tokens into the editor in real-time. |
| **Subagents** | Each specialized AI role (writer, reviewer, section drafter, issue creator) is defined as a subagent with a tailored system prompt and restricted tool set. Subagents maintain isolated context, keeping the main session clean. |
| **Custom MCP tools** | We define in-process tools via `createSdkMcpServer()` that give Claude access to VS Code-specific operations: reading the active document, inserting blocks at the cursor, reading workspace files, and submitting review annotations. |
| **Structured output** | `outputFormat: { type: 'json_schema', schema }` constrains Claude to return structured JSON for review annotations and issue creation — no parsing of free-text needed. |
| **Sessions** | Each document gets a persistent session ID. Resuming a session (`resume: sessionId`) preserves context across multiple AI interactions on the same document, so Claude "remembers" earlier edits and feedback. |
| **Hooks** | `PreToolUse` and `PostToolUse` hooks validate and log tool calls. `Stop` hooks extract the final result for display. |
| **Permission modes** | `canUseTool` callback routes permission decisions through VS Code's UI (quick-pick dialogs, notifications) instead of a terminal prompt. |
| **Budget controls** | `maxTurns` and `maxBudgetUsd` prevent runaway agent loops. |

**Runtime requirement:** The Agent SDK requires Claude Code to be installed on the machine. The extension checks for this on activation and prompts the user to install it if missing.

### Quartz Project Management Plugin

The existing Claude Code plugin provides four commands:

| Command | Function | Current Implementation |
|---------|----------|----------------------|
| `/design-doc <name>` | Create a new design document from template | CLI-based, writes .md file |
| `/review-doc <name>` | Iterative review with follow-up questions | CLI-based, reads/updates .md file |
| `/create-issues <name>` | Break approved doc into numbered issues | CLI-based, creates issue .md files |
| `/issue-status [name]` | Show progress across issues | CLI-based, reads issue files |

The native integration re-implements these as Agent SDK subagents with custom MCP tools for VS Code interaction.

### Extension Architecture (from Design Doc #1)

The Quartz editor uses a webview (React + TipTap) communicating with an extension host (Node.js) via `postMessage`. The Claude integration adds the Agent SDK layer:

```
┌──────────────────────────────────────────────────────────────┐
│                          VS Code                              │
│                                                               │
│  ┌──────────────────────┐    ┌────────────────────────────┐  │
│  │   Extension Host      │    │       Webview Panel         │  │
│  │   (Node.js)           │◄──►│   (React + TipTap)         │  │
│  │                       │    │                             │  │
│  │  ┌─────────────────┐ │    │  • AI Slash Commands        │  │
│  │  │ Agent SDK Client │ │    │  • Streaming Block Insert   │  │
│  │  │                  │ │    │  • Review Annotations       │  │
│  │  │ • query()        │ │    │  • Ghost-text Completions   │  │
│  │  │ • Subagents      │ │    │                             │  │
│  │  │ • MCP Tools      │ │    └────────────────────────────┘  │
│  │  │ • Sessions       │ │                                    │
│  │  │ • Hooks          │ │                                    │
│  │  └────────┬────────┘ │                                    │
│  │           │           │                                    │
│  │  ┌────────▼────────┐ │    ┌────────────────────────────┐  │
│  │  │ Custom MCP Tools │ │    │  .md Files                  │  │
│  │  │                  │ │    │  (design docs, issues)      │  │
│  │  │ • read_document  │ │    └────────────────────────────┘  │
│  │  │ • insert_blocks  │ │                                    │
│  │  │ • submit_review  │ │                                    │
│  │  │ • read_workspace │ │                                    │
│  │  │ • get_template   │ │                                    │
│  │  └─────────────────┘ │                                    │
│  └──────────┬───────────┘                                    │
│             │                                                 │
│             ▼                                                 │
│  ┌─────────────────────┐                                     │
│  │  Claude Code Runtime │                                     │
│  │  (Agent SDK ↔ API)   │                                     │
│  └─────────────────────┘                                     │
└──────────────────────────────────────────────────────────────┘
```

## 4. Proposed Solution

### Overview

The Claude Code Integration is a module within the Quartz VS Code extension built on the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`). Instead of manually constructing prompts and calling the Anthropic Messages API, we define **specialized subagents** for each AI role (writing, reviewing, section drafting, project management) and **custom MCP tools** that give those agents access to the editor and workspace.

All AI interactions follow the same pattern: the extension host calls `query()` with a prompt targeting the appropriate subagent, streams `SDKMessage` events, and the webview renders output as editable blocks. The user always has the final say — AI output is inserted as normal editable content, not as locked or special blocks.

### 4.1 Subagent Definitions

Each AI role is a subagent defined in the `agents` parameter of `query()`. Subagents have tailored system prompts and restricted tool sets. They maintain isolated context (they don't pollute the main session) and can run concurrently when independent.

```typescript
const agents: Record<string, AgentDefinition> = {

  "writer": {
    description: "Use for inline writing tasks: expanding, summarizing, rewriting, and answering questions about document content.",
    prompt: `You are a writing assistant embedded in Quartz, a markdown editor.
Output only the requested content in valid markdown.
Do not include preambles, explanations, or meta-commentary.
Match the tone and style of the existing document.
Be specific — avoid vague language like "improve", "better", "as needed".
Use the read_document tool to read the current document context.
Use the insert_blocks tool to stream your output into the editor.`,
    tools: ["mcp__quartz__read_document", "mcp__quartz__insert_blocks"],
    model: "sonnet"
  },

  "reviewer": {
    description: "Use for reviewing documents. Analyzes completeness, specificity, gaps, and clarity. Returns structured annotations.",
    prompt: `You are a document reviewer. Analyze the document for:
1. Completeness — are all required sections present and substantive?
2. Specificity — are goals measurable? Are metrics concrete?
3. Gaps — what edge cases, failure modes, or scenarios are missing?
4. Clarity — is the problem statement compelling? Is the solution unambiguous?
Use the read_document tool to read the full document.
Use the submit_review tool to return structured annotations.
Every annotation must include a specific, actionable suggestion.`,
    tools: ["mcp__quartz__read_document", "mcp__quartz__submit_review"],
    model: "sonnet"
  },

  "section-drafter": {
    description: "Use for drafting individual design doc sections. Reads the full document and template guidance to write contextually appropriate content.",
    prompt: `You are a design document author. You draft individual sections of Amazon-style 6-pager design documents.
Use the read_document tool to read the current document.
Use the get_template tool to read the section-specific template guidance.
Draft the requested section based on context from other sections in the document.
Use the insert_blocks tool to stream your output into the editor.
Follow Amazon 6-pager conventions. Be specific and measurable.`,
    tools: ["mcp__quartz__read_document", "mcp__quartz__get_template",
            "mcp__quartz__insert_blocks"],
    model: "sonnet"
  },

  "project-manager": {
    description: "Use for project management commands: creating design docs, creating issues, and checking status. Has full workspace read/write access.",
    prompt: `You are a project manager assistant. You help create design documents, break them into issues, and track progress.
Use read_workspace to read templates and existing documents.
Use write_workspace to create or update files.
Follow the Quartz project management conventions:
- Design docs go in projectManager/design-docs/
- Issues go in projectManager/issues/{feature-name}/
- Use the templates from projectManager/skills/project-management/references/
Always ask clarifying questions before creating a design document.`,
    tools: ["mcp__quartz__read_workspace", "mcp__quartz__write_workspace",
            "mcp__quartz__read_document", "mcp__quartz__insert_blocks"],
    model: "sonnet"
  }
};
```

**Why subagents instead of a single agent with mode switching:**
- **Context isolation:** The reviewer doesn't carry context from writing sessions. Each invocation starts clean (or resumes its own session).
- **Tool restriction:** The writer can only read documents and insert blocks. It cannot write arbitrary workspace files. The reviewer can only read and submit annotations. This follows the principle of least privilege.
- **Prompt clarity:** Each agent has a focused system prompt. A single agent with a "mode" parameter would need a complex prompt covering all behaviors.
- **Parallel execution:** Future features (e.g., running a style check and security review simultaneously) can invoke multiple subagents concurrently.

### 4.2 Custom MCP Tools

We define in-process MCP tools using `createSdkMcpServer()` that bridge the Agent SDK with VS Code's APIs. These tools give agents controlled access to the editor and workspace.

```typescript
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const quartzMcpServer = createSdkMcpServer({
  name: "quartz",
  version: "1.0.0",
  tools: [

    tool("read_document", "Read the contents of the currently active document in the editor", {
      includeMetadata: z.boolean().optional()
        .describe("If true, include filename, cursor position, selection, and detected document type")
    }, async (args) => {
      const doc = getActiveDocument(); // VS Code API
      const content = doc.getText();
      const metadata = args.includeMetadata ? {
        filename: doc.uri.fsPath,
        cursorLine: getCursorLine(),
        selection: getSelectedText(),
        documentType: detectDocumentType(content), // "design-doc" | "issue" | "generic"
      } : {};
      return { content: [{ type: "text",
        text: JSON.stringify({ content, ...metadata }) }] };
    }),

    tool("insert_blocks", "Insert markdown content into the document at the current cursor position", {
      markdown: z.string().describe("The markdown content to insert"),
      position: z.enum(["cursor", "below", "replace-selection"])
        .describe("Where to insert relative to cursor")
    }, async (args) => {
      await postToWebview("insert-blocks", {
        markdown: args.markdown,
        position: args.position
      });
      return { content: [{ type: "text", text: "Blocks inserted." }] };
    }),

    tool("submit_review", "Submit structured review annotations for the current document", {
      summary: z.string().describe("1-2 sentence overall assessment"),
      annotations: z.array(z.object({
        type: z.enum(["gap", "vague", "suggestion", "question"]),
        section: z.string().describe("Section heading this applies to"),
        lineAnchor: z.string().describe("Text near the target line for fuzzy matching"),
        message: z.string().describe("The review comment"),
        suggestion: z.string().optional().describe("Suggested text to insert or replace")
      }))
    }, async (args) => {
      await postToWebview("show-annotations", args);
      return { content: [{ type: "text", text: `Review submitted: ${args.annotations.length} annotations.` }] };
    }),

    tool("get_template", "Read a Quartz project management template file", {
      template: z.enum(["design-doc", "issue", "review-questions"])
        .describe("Which template to read")
    }, async (args) => {
      const paths = {
        "design-doc": "projectManager/skills/project-management/references/design-doc-template.md",
        "issue": "projectManager/skills/project-management/references/issue-template.md",
        "review-questions": "projectManager/skills/project-management/references/review-questions.md"
      };
      const content = await readWorkspaceFile(paths[args.template]);
      return { content: [{ type: "text", text: content }] };
    }),

    tool("read_workspace", "Read a file from the current VS Code workspace", {
      path: z.string().describe("Workspace-relative file path")
    }, async (args) => {
      const content = await readWorkspaceFile(args.path);
      return { content: [{ type: "text", text: content }] };
    }),

    tool("write_workspace", "Write a file to the current VS Code workspace", {
      path: z.string().describe("Workspace-relative file path"),
      content: z.string().describe("File content to write")
    }, async (args) => {
      await writeWorkspaceFile(args.path, args.content);
      return { content: [{ type: "text", text: `File written: ${args.path}` }] };
    })
  ]
});
```

### 4.3 Inline AI Slash Commands

The editor's existing slash command menu (from design doc #1) is extended with AI-powered commands. These appear in the same `/` menu, grouped under an "AI" heading.

**Available commands:**

| Command | Subagent | Input | Output |
|---------|----------|-------|--------|
| `/ask` | `writer` | Free-text prompt typed after `/ask ` | Blockquote block with Claude's response |
| `/expand` | `writer` | Current block or selected text | Replacement or additional paragraph blocks |
| `/summarize` | `writer` | Selected text or N preceding blocks | Single paragraph block |
| `/rewrite` | `writer` | Selected text + optional instruction | Replacement text |
| `/draft-section` | `section-drafter` | Section name (e.g., "Testing Strategy") | Multiple blocks filling in the section |
| `/review` | `reviewer` | Entire document | Inline annotations (see §4.5) |

**Interaction flow for `/expand` (representative example):**

1. User places cursor at the end of a paragraph, types `/expand`.
2. Slash command menu shows "Expand — Claude writes more detail for this content".
3. User selects it (Enter or click).
4. Extension host calls `query()` targeting the `writer` subagent:
   ```typescript
   const session = query({
     prompt: "Expand the content at the user's cursor with more detail. Use the read_document tool to get context, then use insert_blocks to add the expanded content below the cursor.",
     options: {
       agents,
       mcpServers: { quartz: quartzMcpServer },
       maxTurns: 5,
       maxBudgetUsd: 0.05,
       permissionMode: "acceptEdits",
       includePartialMessages: true, // for streaming
     }
   });
   ```
5. The agent calls `read_document` to get the document content and cursor context.
6. The agent calls `insert_blocks` with the expanded content. As the Agent SDK streams partial messages, the webview renders tokens in real-time into a "streaming block" below the cursor.
7. When the agent completes, the streaming block becomes a normal editable paragraph.
8. User can undo (Cmd+Z) to remove the entire AI-generated block in one step.
9. The session ID is stored so future commands on this document can resume context.

### 4.4 Native Command Bridge

The four Quartz project management commands are available in VS Code's command palette (`Cmd+Shift+P`):

- `Quartz: Create Design Document`
- `Quartz: Review Design Document`
- `Quartz: Create Issues from Design Document`
- `Quartz: Show Issue Status`

Each command invokes the `project-manager` subagent (or `reviewer` for review) with appropriate prompts. The subagent has access to `read_workspace` and `write_workspace` tools so it can read templates, read/write design docs, and create issue files autonomously.

**Command: Create Design Document**

```typescript
// User triggers: Cmd+Shift+P → "Quartz: Create Design Document"
// Quick-pick collects: featureName

const session = query({
  prompt: `Create a new design document for the feature "${featureName}".
Use get_template to read the design-doc template.
Follow the Amazon 6-pager structure.
Ask the user clarifying questions before writing (use the document to list questions).
Write the document to projectManager/design-docs/${featureName}.md using write_workspace.`,
  options: {
    agents,
    mcpServers: { quartz: quartzMcpServer },
    maxTurns: 15,
    maxBudgetUsd: 0.20,
    permissionMode: "acceptEdits",
  }
});

// After completion, open the created file in the Quartz editor
for await (const message of session) {
  if (message.type === "result" && message.subtype === "success") {
    openInQuartzEditor(`projectManager/design-docs/${featureName}.md`);
  }
}
```

**Command: Review Design Document**

```typescript
// Uses the reviewer subagent directly
const session = query({
  prompt: `Review the design document at projectManager/design-docs/${featureName}.md.
Read the full document with read_document.
Read the review questions guide with get_template("review-questions").
Analyze for completeness, specificity, gaps, and clarity.
Submit your findings using submit_review.`,
  options: {
    agents,
    mcpServers: { quartz: quartzMcpServer },
    maxTurns: 10,
    maxBudgetUsd: 0.10,
    permissionMode: "acceptEdits",
  }
});
```

**Command: Create Issues**

```typescript
const session = query({
  prompt: `Break the approved design document at projectManager/design-docs/${featureName}.md into implementation issues.
Use read_workspace to read the design doc and get_template("issue") for the issue template.
Create numbered issue files in projectManager/issues/${featureName}/ using write_workspace.
Define dependencies between issues. Use XS/S/M/L scope sizing.
Update the design doc's Implementation Issues table.`,
  options: {
    agents,
    mcpServers: { quartz: quartzMcpServer },
    maxTurns: 20,
    maxBudgetUsd: 0.30,
    permissionMode: "acceptEdits",
    outputFormat: {
      type: "json_schema",
      schema: issueListSchema // structured output for the extension to parse
    }
  }
});
```

**Command: Issue Status**

```typescript
// This command reads issue files and renders a dashboard — no AI needed for basic status.
// However, the agent can provide a summary analysis if requested.
const session = query({
  prompt: `Read all issue files in projectManager/issues/${featureName}/ using read_workspace.
Summarize the status: how many issues are TODO/IN_PROGRESS/DONE, which are blocked, and what should be worked on next.`,
  options: {
    agents,
    mcpServers: { quartz: quartzMcpServer },
    maxTurns: 10,
    maxBudgetUsd: 0.05,
    permissionMode: "acceptEdits",
  }
});
```

### 4.5 Proactive Review Suggestions

When the user runs `/review` or triggers `Quartz: Review Design Document`, the `reviewer` subagent analyzes the full document and calls the `submit_review` custom MCP tool with structured annotations. This feedback is displayed as **inline annotations** — visual markers in the editor gutter with hover-to-reveal details.

**Annotation types:**

| Type | Icon | Color | Meaning |
|------|------|-------|---------|
| Gap | ⚠ | Yellow | Missing content (e.g., "Security section doesn't mention encryption") |
| Vague | ◐ | Orange | Non-specific language (e.g., "'improve performance' — add a metric") |
| Suggestion | 💡 | Blue | Improvement idea (e.g., "Consider adding a sequence diagram here") |
| Question | ? | Purple | Needs clarification (e.g., "What happens if the API is unavailable?") |

**Implementation:**

- The `reviewer` subagent calls the `submit_review` MCP tool, which enforces the annotation schema via Zod validation. No free-text parsing needed.
- The extension maps each annotation to the nearest matching line in the document using the `lineAnchor` field.
- Annotations appear as gutter icons. Hovering shows the message. Clicking "Apply" inserts the suggestion at the appropriate location.
- Annotations are ephemeral — they disappear on the next edit to the annotated region and are fully cleared on the next review pass.

### 4.6 Session Management

Each document maintains a persistent Agent SDK session, enabling contextual continuity across multiple AI interactions.

**Session lifecycle:**

1. **First AI interaction on a document:** A new session is created. The session ID is stored in memory, keyed by the document URI.
2. **Subsequent interactions:** The session is resumed via `resume: sessionId`. Claude retains context from previous interactions — it knows what it expanded, what review feedback it gave, and what sections it drafted.
3. **Document close:** The session ID is stored in the extension's workspace state (`context.workspaceState`) so it persists across VS Code restarts.
4. **Session expiry:** Agent SDK sessions are retained for 30 days. After expiry, a new session is created.

**Benefits of persistent sessions:**
- When the user runs `/review` after addressing feedback from a previous review, Claude can see what changed and provide incremental feedback rather than re-reviewing from scratch.
- When the user runs `/draft-section` for multiple sections sequentially, each draft is informed by the previous ones.
- The `project-manager` subagent remembers the clarifying questions it asked when resuming a document creation flow.

### 4.7 Hooks and Permission Handling

**Agent SDK hooks** intercept agent execution for logging, validation, and VS Code integration.

```typescript
const hooks = {
  PreToolUse: [{
    matcher: "mcp__quartz__write_workspace",
    hooks: [async (input) => {
      // Log file writes to the VS Code output channel
      outputChannel.appendLine(`[Agent] Writing: ${input.tool_input.path}`);
      return {};
    }]
  }],

  PostToolUse: [{
    matcher: "mcp__quartz__insert_blocks",
    hooks: [async (input) => {
      // Update status bar with token count
      updateStatusBar(input);
      return {};
    }]
  }],

  Stop: [{
    matcher: "*",
    hooks: [async (input) => {
      // Log completion stats
      outputChannel.appendLine(`[Agent] Completed: ${input.num_turns} turns, $${input.cost_usd}`);
      return {};
    }]
  }]
};
```

**Permission handling via `canUseTool`:**

The `canUseTool` callback routes permission decisions through VS Code's UI instead of a terminal prompt. For most operations, we use `permissionMode: "acceptEdits"` to auto-approve file operations. For sensitive operations (e.g., the `project-manager` writing to new paths), the callback shows a VS Code quick-pick dialog:

```typescript
canUseTool: async (toolName, input) => {
  if (toolName === "mcp__quartz__write_workspace") {
    const approved = await vscode.window.showInformationMessage(
      `Claude wants to write to: ${input.path}`,
      "Allow", "Deny"
    );
    return approved === "Allow"
      ? { behavior: "allow", updatedInput: input }
      : { behavior: "deny", message: "User denied file write." };
  }
  return { behavior: "allow", updatedInput: input };
}
```

### 4.8 Streaming into the Editor

The Agent SDK's streaming mode (`includePartialMessages: true`) emits `SDKPartialAssistantMessage` events as Claude generates tokens. We use these to render content progressively in the webview.

**Flow:**

1. `query()` is called with `includePartialMessages: true`.
2. For each `SDKPartialAssistantMessage` (type `stream_event`), extract the text delta.
3. Post the delta to the webview via `postMessage`.
4. The webview appends the delta to a "streaming block" — a TipTap node with a typing animation.
5. When the agent calls `insert_blocks`, the streaming block is finalized as a normal editable block.
6. If the user presses Escape, call `session.interrupt()` to cancel the agent mid-stream.

**Cancellation:** The `Query` object returned by `query()` exposes an `interrupt()` method. Escape triggers this, stopping the agent immediately. Any partially inserted content remains in the document (the user can undo it).

### 4.9 Authentication and Configuration

**Authentication methods (in priority order):**

1. **VS Code Secret Storage** — The extension prompts for an API key on first use and stores it in VS Code's encrypted secret storage (`context.secrets`). The key is passed to the Agent SDK via the `env` option: `env: { ANTHROPIC_API_KEY: key }`.
2. **Environment variable** — If `ANTHROPIC_API_KEY` is set in the user's environment, the Agent SDK picks it up automatically.
3. **Settings file** — As a fallback, the user can set `quartz.claude.apiKey` in VS Code settings. A warning is shown that this is stored in plaintext in `settings.json`.

**Configuration:**

```jsonc
// settings.json
{
  "quartz.claude.model": "sonnet",                     // Model: "sonnet" | "opus" | "haiku"
  "quartz.claude.maxBudgetPerRequest": 0.10,           // Max USD per AI request
  "quartz.claude.maxTurns": 10,                        // Max agent turns per request
  "quartz.claude.apiKey": "",                           // Fallback (plaintext warning)
  "quartz.claude.autoReview": false,                    // Run review on save
  "quartz.claude.ghostCompletions": false,              // Enable Tab completions (P2)
  "quartz.claude.showTokenUsage": true                  // Show token/cost in status bar
}
```

## 5. Alternative Solutions Considered

### Alternative A: Raw Anthropic Messages API (Previous Design)

**Approach:** Use `@anthropic-ai/sdk` to call the Messages API directly. Manually construct prompts, handle streaming, implement tool loops, manage conversation state.

**Pros:**
- No dependency on Claude Code runtime.
- Full control over every API call.

**Cons:**
- Must implement the tool execution loop manually (call API → parse tool_use → execute tool → send result → call API again). This is the main complexity the Agent SDK eliminates.
- No built-in subagent support — we'd need to implement our own agent orchestration for the project management commands.
- No session management — we'd need to persist and replay conversation history ourselves.
- No built-in hooks, permissions, or budget controls.
- Significantly more code to write and maintain.

**Why rejected:** The Agent SDK provides the tool loop, subagents, sessions, streaming, hooks, and permissions out of the box. Using the raw API would mean reimplementing all of these, which is the exact infrastructure the SDK was built to provide.

### Alternative B: Shell Out to Claude Code CLI

**Approach:** Run the existing Claude Code CLI commands as subprocesses from the extension. Parse their stdout and render it.

**Pros:**
- Zero reimplementation — reuse existing CLI command logic.
- Automatically gets CLI updates and improvements.

**Cons:**
- Requires Claude Code CLI to be installed and configured separately (the Agent SDK also requires it, but integrates more cleanly).
- No streaming into the editor — CLI output is text, not structured blocks.
- Parsing CLI output is brittle (format could change between versions).
- No way to do inline slash commands — CLI operates on whole files, not cursor positions.
- Subprocess management (spawning, killing, error handling) adds complexity.
- No custom tool integration — can't give the CLI access to VS Code APIs.

**Why rejected:** The CLI is designed for terminal interaction, not editor integration. The Agent SDK gives us the same underlying engine as a library with streaming, custom tools, and subagent support.

### Alternative C: Language Server Protocol (LSP) Extension

**Approach:** Implement Claude integration as an LSP server that provides completions, code actions, and diagnostics for markdown files.

**Pros:**
- LSP is a well-defined protocol with built-in support for completions, diagnostics, and code actions.
- Could work with any LSP-compatible editor, not just VS Code.

**Cons:**
- LSP is designed for programming languages, not prose documents. Its completion model is awkward for document-level AI operations like "draft a section."
- Streaming is not part of the LSP spec — completions are expected to be synchronous.
- Diagnostics are limited to severity levels and text messages — no custom rendering.
- Would require a separate server process, adding deployment complexity.

**Why rejected:** LSP's interaction model is wrong for document-level AI assistance. The Agent SDK's streaming + custom tools model is purpose-built for this use case.

## 6. Security, Privacy, and Compliance

### API Key Security

- **Primary storage:** VS Code's `SecretStorage` API, which uses the OS keychain (macOS Keychain, Windows Credential Locker, Linux libsecret). Encrypted at rest.
- **Passed to Agent SDK** via the `env` option — never written to disk by the extension.
- **Environment variable:** Read-only. The extension never writes to environment variables.
- **Settings fallback:** If the user stores the key in `settings.json`, the extension shows a persistent warning: "Your API key is stored in plaintext. Use the secure storage instead." The key is never logged, never included in error reports, and never sent anywhere except to the Agent SDK.

### Data Sent to Anthropic

- **Document content:** The full document (or relevant excerpt) is sent to the Anthropic API as part of the prompt, via the Agent SDK. Users must understand this — a one-time consent dialog appears on first AI use: *"Quartz will send the contents of this document to Claude (Anthropic's API) to generate suggestions. Your data is processed under Anthropic's API terms. Continue?"*
- **No telemetry:** The extension does not send usage analytics, file names, or workspace metadata to any service.
- **No caching on our side:** The extension does not store API responses beyond the current session. Prompt history (P2) stores only the user's prompts, not Claude's responses.

### Anthropic API Data Handling

- Per Anthropic's API terms: API inputs and outputs are not used to train models.
- Data is transmitted over HTTPS (TLS 1.2+).
- No data is retained by Anthropic after the response is delivered (for API usage).

### Agent SDK Sandboxing

- Custom MCP tools (`read_workspace`, `write_workspace`) are scoped to the current VS Code workspace. No file access outside the workspace root.
- The `write_workspace` tool validates that the target path is within allowed directories (`projectManager/design-docs/`, `projectManager/issues/`, or explicitly user-approved paths).
- The `canUseTool` callback provides a last line of defense — the user can deny any tool call via a VS Code dialog.
- Agent SDK budget controls (`maxBudgetUsd`, `maxTurns`) prevent runaway agent loops.

### File System Access

- The command bridge writes files only to well-known directories (`projectManager/design-docs/`, `projectManager/issues/`).
- All file writes go through VS Code's workspace file system API, respecting workspace trust settings.
- The extension does not read files outside the current workspace.

## 7. Testing Strategy

### Unit Tests

- **Subagent definition tests:** Verify each agent definition has the correct tools, model, and prompt. Assert that restricted agents cannot access tools outside their allowed set.
- **Custom MCP tool tests:** Test each tool in isolation. Mock VS Code APIs (active document, workspace file system). Verify `read_document` returns correct metadata, `insert_blocks` posts correct messages to the webview, `submit_review` validates annotation schema, `write_workspace` enforces path restrictions.
- **Session management tests:** Verify session IDs are stored and retrieved correctly. Test resume behavior. Test session expiry fallback (create new session).
- **Hook tests:** Verify `PreToolUse` hooks log correctly. Verify `Stop` hooks extract cost/turn data.

### Integration Tests

- **Slash command → Agent SDK → document insertion:** End-to-end test in a VS Code instance. Type `/expand`, let the Agent SDK process the request (with mocked Claude responses), verify the streamed content appears as an editable block.
- **Command bridge → file creation:** Trigger `Quartz: Create Design Document`, let the `project-manager` subagent run (mocked), verify the file is written and opened in the Quartz editor.
- **Review annotations:** Trigger a review, let the `reviewer` subagent run (mocked), verify `submit_review` is called with valid annotations and gutter icons appear.
- **Permission flow:** Trigger a `write_workspace` call, verify `canUseTool` presents a VS Code dialog, verify deny prevents the write.
- **Streaming cancellation:** Start a slash command, press Escape, verify `interrupt()` is called and the agent stops.

### End-to-End Tests (with Live Agent SDK)

- **Gated behind a flag** (`QUARTZ_E2E_LIVE=true`) — not run in CI by default, only in manual test passes.
- Test a full workflow: create a design doc → review it → address feedback → create issues.
- Verify that the Agent SDK correctly orchestrates subagent tool calls.
- Verify streaming renders correctly in the webview with no dropped tokens.

### Performance Tests

- **Streaming latency:** Measure time-to-first-token after triggering a slash command. Target: <2 seconds (depends on API latency + Agent SDK overhead).
- **Large document context:** Test with documents at 10K, 50K, and 100K tokens. Verify the agent handles context correctly (the Agent SDK manages context window limits internally).
- **Agent turn count:** Verify typical operations complete within `maxTurns`. Monitor for cases where the agent loops unnecessarily.

## 8. Rollout Plan

### Phase 1: Agent SDK Foundation + Core Slash Commands

- Agent SDK integration with `query()`, streaming, and custom MCP tools.
- `writer` subagent with `/ask`, `/expand`, `/summarize`, `/rewrite`.
- API key setup via VS Code secret storage.
- Consent dialog on first use.
- Cancellation via Escape / `interrupt()`.
- Error handling (rate limits, network errors, invalid key, Claude Code not installed).

### Phase 2: Command Bridge via Subagents

- `project-manager` subagent with all four Quartz commands.
- Quick-pick UI for parameter input with auto-complete.
- File creation and auto-open in Quartz editor.
- `canUseTool` callback for write permission dialogs.
- Issue status rendered in a dedicated panel.

### Phase 3: Design-Doc-Aware Features

- `section-drafter` subagent with `/draft-section` and template awareness.
- `reviewer` subagent with proactive review annotations.
- Session persistence for contextual continuity across interactions.
- "Apply" action on review suggestions.

### Phase 4: Polish (P2 features)

- Ghost-text completions (Tab to accept).
- Prompt history per document.
- Concurrent subagent execution (parallel review + style check).
- `quartz.claude.autoReview` on save.

### Monitoring

- Agent SDK hooks log request metadata (model, turn count, cost, latency) to the VS Code output channel ("Quartz" panel). No document content is logged.
- Status bar shows cumulative token usage and cost for the current session.
- Error rates tracked via the output channel — if a user reports issues, they can share this log.

## 9. Dependencies and Risks

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| `@anthropic-ai/claude-agent-sdk` | Library | Core dependency. Handles agent loop, streaming, tools, sessions, hooks, permissions. TypeScript SDK. |
| Claude Code runtime | Runtime | Required by the Agent SDK. Must be installed on the user's machine. |
| Anthropic API | External Service | Claude models accessed via the Agent SDK through the Anthropic API. |
| VS Code SecretStorage API | Platform | For encrypted API key storage. |
| Quartz Editor (Design Doc #1) | Internal | The editor webview and TipTap infrastructure this module extends. |
| Design doc templates | Internal | Template files from `projectManager/skills/project-management/references/`. Bundled with the extension. |
| `zod` | Library | Schema validation for custom MCP tool inputs. Already a dependency of TipTap. |

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Claude Code runtime not installed | High | Medium | Check on extension activation. Show a prominent notification with install instructions. Gracefully disable AI features if missing. |
| Agent SDK breaking changes | Medium | Medium | Pin to a specific SDK version. Wrap SDK calls in an adapter layer. Monitor the SDK changelog and test against new versions before upgrading. |
| Anthropic API downtime or latency spikes | High | Low | All AI features degrade gracefully — the editor remains fully functional without AI. Show toast on failure. No blocking operations. |
| API costs — users generate large bills from heavy usage | Medium | Medium | `maxBudgetUsd` cap per request (default $0.10). Status bar shows cumulative cost. Model defaults to `sonnet` (not `opus`). |
| Claude generates inaccurate or harmful content in documents | Medium | Medium | AI output is always editable, never auto-saved. The user must explicitly save. Review annotations are suggestions, not auto-applied edits. |
| Subagent context isolation leaks | Low | Low | Each subagent is a separate Agent SDK invocation with its own context. No shared state except through explicit MCP tool calls. |
| Custom MCP tool security — agent writes to unexpected paths | Medium | Low | `write_workspace` validates paths against an allowlist. `canUseTool` callback provides user-level approval for sensitive writes. |
| Agent loops — subagent consumes all turns without producing useful output | Medium | Medium | `maxTurns` cap per invocation. Monitor turn counts via `Stop` hook. Alert user if an agent hits the turn limit without completing. |

## 10. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Should we support API key sharing across Quartz instances via a team settings file, or is per-user storage sufficient for v1? | Product | Open |
| 2 | Should `/draft-section` require the user to confirm before inserting, or stream directly? Direct insertion is faster but the user might want to preview first. | Product | Open |
| 3 | The Agent SDK requires Claude Code to be installed. Should we bundle it with the extension, document it as a prerequisite, or attempt auto-install on first use? | Engineering | Open |
| 4 | Should we use `forkSession` for review passes (creating a branch from the main session) or always start fresh sessions for reviews? Forking preserves context but may bias the reviewer. | Engineering | Open |

## 11. Implementation Issues

*This section will be populated when `/create-issues claude-code-integration` is run after this document is approved.*

| # | Title | Status | Scope |
|---|-------|--------|-------|
| — | — | — | — |

**Progress:** 0/0 issues complete (0%)

## 12. Appendix

### A. Subagent Architecture Diagram

```
                    ┌─────────────────────────────┐
                    │  VS Code Command / Slash Cmd  │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │       Agent SDK query()       │
                    │                               │
                    │  agents: {                    │
                    │    writer,                    │
                    │    reviewer,                  │
                    │    section-drafter,           │
                    │    project-manager            │
                    │  }                            │
                    │                               │
                    │  mcpServers: {                │
                    │    quartz: quartzMcpServer    │
                    │  }                            │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
             ┌───────────┐ ┌───────────┐ ┌───────────┐
             │  writer    │ │  reviewer  │ │  project-  │
             │  subagent  │ │  subagent  │ │  manager   │
             │            │ │            │ │  subagent  │
             │ Tools:     │ │ Tools:     │ │ Tools:     │
             │ • read_doc │ │ • read_doc │ │ • read_ws  │
             │ • insert   │ │ • submit   │ │ • write_ws │
             │            │ │   _review  │ │ • read_doc │
             └──────┬─────┘ └─────┬──────┘ │ • insert   │
                    │             │         └──────┬─────┘
                    ▼             ▼                ▼
             ┌─────────────────────────────────────────┐
             │         Custom MCP Tools (quartz)        │
             │                                          │
             │  read_document  │  insert_blocks         │
             │  submit_review  │  get_template          │
             │  read_workspace │  write_workspace       │
             └──────────────────┬──────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
              ┌──────────┐ ┌────────┐ ┌──────────┐
              │ VS Code  │ │ Webview│ │Workspace │
              │ API      │ │ Panel  │ │ Files    │
              └──────────┘ └────────┘ └──────────┘
```

### B. SDK Message Flow Example

```typescript
// Complete example: handling a /expand slash command

import { query } from "@anthropic-ai/claude-agent-sdk";

async function handleExpandCommand(documentUri: string) {
  const sessionId = getSessionForDocument(documentUri);

  const session = query({
    prompt: "Expand the content at the user's cursor with more detail.",
    options: {
      agents,
      mcpServers: { quartz: quartzMcpServer },
      hooks,
      maxTurns: 5,
      maxBudgetUsd: 0.05,
      permissionMode: "acceptEdits",
      includePartialMessages: true,
      ...(sessionId ? { resume: sessionId } : {}),
    }
  });

  for await (const message of session) {
    switch (message.type) {
      case "system":
        // Capture session ID for future resume
        if (message.subtype === "init") {
          storeSessionForDocument(documentUri, message.session_id);
        }
        break;

      case "stream_event":
        // Forward partial tokens to webview for live rendering
        postToWebview("stream-token", { delta: extractDelta(message) });
        break;

      case "assistant":
        // Agent completed a turn — may include tool_use blocks
        for (const block of message.content) {
          if (block.type === "tool_use" && block.name === "mcp__quartz__insert_blocks") {
            // Tool was executed by the SDK — blocks are already inserted
          }
        }
        break;

      case "result":
        if (message.subtype === "success") {
          updateStatusBar({
            cost: message.total_cost_usd,
            turns: message.num_turns,
            duration: message.duration_ms
          });
        } else {
          showErrorToast(`AI request failed: ${message.error}`);
        }
        postToWebview("stream-complete", {});
        break;
    }
  }
}
```

### C. Consent Dialog Text

> **Quartz — AI Features**
>
> Quartz can use Claude (by Anthropic) to help you write and review documents. When you use an AI feature, the contents of your current document are sent to Anthropic's API for processing.
>
> - Your data is transmitted over HTTPS and is not used to train AI models (per Anthropic's API terms).
> - Quartz does not collect telemetry or send data to any other service.
> - You can disable AI features at any time in settings.
> - Requires Claude Code to be installed on your machine.
>
> **Do you want to enable AI features?**
> [Enable] [Not Now] [Learn More]
