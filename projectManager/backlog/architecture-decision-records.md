# Architecture Decision Records

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P3                           |
| **Tags**       | devex, infrastructure        |
| **Related**    | [developer-experience-improvements](../design-docs/developer-experience-improvements.md), [quartz-system-architecture](../design-docs/quartz-system-architecture.md) |
| **Created**    | 2026-02-21                   |

## Problem

Key architectural decisions (why TipTap over Slate, why esbuild over Vite, why markdown-it over unified, why React instead of Svelte) are not formally recorded. New contributors or AI assistants must rediscover the reasoning behind these choices, sometimes proposing alternatives that were already evaluated and rejected.

## Desired Outcome

A `docs/adr/` directory contains 5-7 concise Architecture Decision Records documenting key past decisions. Each ADR explains the context, decision, and consequences. CLAUDE.md links to the ADR directory for AI context.

## Scope & Boundaries

**In scope:**
- Create `docs/adr/` directory structure
- Document 5-7 key decisions in ADR format
- Link from CLAUDE.md

**Out of scope:**
- Retroactively documenting every decision
- Creating an ADR process/template for future decisions
- Detailed technical comparisons or benchmarks

## Open Questions

- Which decisions are most important to document first?

## Notes

- Candidate ADRs: TipTap over Slate, esbuild over Vite, markdown-it over unified, React for webview, Custom Editor API over Markdown Preview, monolithic vs modular parser (now resolved — modular)
- This was scoped but deferred from the DX design doc implementation as lowest priority (P2/Impact 3/10)
