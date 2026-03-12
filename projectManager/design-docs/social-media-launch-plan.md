# Social Media Launch Plan — Quartz Pretty Markdown Editor

**Author:** Mathuran Sadagopan + Claude Code
**Status:** DRAFT
**Created:** 2026-02-28
**Last Updated:** 2026-02-28
**Reviewers:** Mathuran Sadagopan

---

## 1. Problem Statement



Quartz is a polished, Notion-style WYSIWYG markdown editor for VS Code (v0.1.4, MIT licensed, published on the Marketplace), but it has near-zero public awareness. Developers who would benefit from a block-based markdown editing experience inside VS Code don't know it exists. Without a deliberate launch strategy, Quartz will remain undiscovered in a Marketplace of 50,000+ extensions, regardless of product quality. The GitHub repo (github.com/Mathuran/quartz) has no social proof, which creates a cold-start problem: developers won't try an unknown extension, and without users there's no organic growth.

## 2. Goals and Non-Goals

### Goals

- **P0: Launch week impact** — Generate 500+ VS Code Marketplace installs and 100+ GitHub stars within the first 14 days of the coordinated launch
- **P0: Content pipeline** — Create a reusable, Claude Code-managed content system that generates platform-specific posts with one command
- **P1: Community seeding** — Get Quartz discussed in 3+ Reddit threads (r/vscode, r/markdown, r/programming) and 1 Hacker News "Show HN" post reaching the front page or 50+ points
- **P1: Sustained cadence** — Maintain 3-5 posts/week across platforms for 8 weeks post-launch, managed by Claude Code with human review
- **P2: Contributor funnel** — Convert 2-3 developers into first-time contributors within 60 days via "good first issue" labels and community engagement

### Non-Goals

- Paid advertising or sponsored posts (organic only for v1)
- Building a standalone website or landing page (GitHub README + Marketplace listing are sufficient)
- YouTube video production (screen recordings are in scope, produced videos are not)
- Discord/Slack community server (premature at this stage)
- Influencer outreach or partnership deals

## 3. Background and Context

### Product Summary

Quartz is a VS Code extension that renders `.md` files as a Notion-style block editor with:

- WYSIWYG editing with round-trip markdown fidelity
- Slash commands, formatting toolbar, keyboard shortcuts
- Support for tables, code blocks, callouts, task lists, frontmatter
- Dark/light theme support
- Zero config — just open a `.md` file

### Competitive Landscape

| Extension                 | Installs | Differentiator                                |
| ------------------------- | -------- | --------------------------------------------- |
| Markdown All in One       | 7M+      | Shortcuts/preview, not WYSIWYG                |
| Markdown Preview Enhanced | 3M+      | Preview pane, not inline editing              |
| Foam / Dendron            | 100K+    | Knowledge management, not editing UX          |
| **Quartz**                | **New**  | **Notion-style block editing inside VS Code** |

### Key Insight

No VS Code extension offers true Notion-style block editing. Quartz occupies an empty niche. The messaging should center on: "What if your markdown files edited like Notion — right inside VS Code?"

### Current State

- GitHub repo is public at github.com/Mathuran/quartz
- VS Code Marketplace listing exists (v0.1.4)
- Some social accounts exist but no Quartz-specific posts yet
- No existing social proof (stars, reviews, installs)

## 4. Proposed Solution

### Overview

A 3-phase, 8-week social media launch managed primarily by Claude Code. The system works as a content pipeline: Claude Code generates platform-specific posts, maintains a content calendar, and adapts strategy based on engagement feedback you provide. You review, approve, and publish posts. Over time, the cadence becomes self-sustaining with minimal input.

### Architecture: Claude Code Content Pipeline

```
Human Input                    Claude Code Pipeline              Output
┌──────────────┐              ┌────────────────────────┐        ┌──────────────┐
│ /launch-post │──triggers──► │ 1. Read content calendar│        │ Twitter post │
│ /launch-week │              │ 2. Select next topic    │──────► │ Reddit post  │
│ /launch-stats│              │ 3. Generate platform    │        │ HN post      │
│              │              │    specific content     │        │ Metrics log  │
│ Feedback:    │──updates───► │ 4. Log to calendar      │        └──────────────┘
│ "HN got 80pts"│             │ 5. Suggest next actions │
└──────────────┘              └────────────────────────┘
```

### How Claude Code Manages This

Claude Code will maintain the following files in `projectManager/launch/`:

| File                       | Purpose                                                  |
| -------------------------- | -------------------------------------------------------- |
| `content-calendar.md`      | Scheduled posts with dates, platforms, status            |
| `posts/week-N-platform.md` | Generated post content ready for review                  |
| `metrics.md`               | Engagement data you report back (likes, stars, installs) |
| `strategy.md`              | Living strategy doc that adapts based on what's working  |

**Workflow per post:**

1. You run a command (or Claude Code reminds you based on the calendar)
2. Claude Code generates the post content tailored to the platform
3. You review, tweak if needed, and publish
4. You report back engagement numbers
5. Claude Code updates metrics and adjusts future content

### Content Pillars (Rotating Topics)

| Pillar             | Example Post Angles                                                         |
| ------------------ | --------------------------------------------------------------------------- |
| **The Problem**    | "Markdown preview panes are a lie — you edit in one place, read in another" |
| **The Demo**       | GIF/screenshot showing Notion-style editing in VS Code                      |
| **The Technical**  | "How we built round-trip markdown fidelity with TipTap + markdown-it"       |
| **The Comparison** | Side-by-side: editing markdown the old way vs. Quartz                       |
| **The Community**  | "Looking for contributors — here are good first issues"                     |
| **The Story**      | "I built this because I was tired of context-switching to Notion"           |

## 5. Platform-Specific Strategy

### Twitter/X Strategy

**Account:** Your personal developer account (personal brand > product brand for early-stage)

**Post types:**

- **Launch thread** (7-10 tweets): The origin story + demo GIFs + link
- **Daily micro-posts**: Single feature highlights with screenshot/GIF
- **Engagement posts**: Polls ("How do you edit markdown?"), hot takes on dev tools
- **Build-in-public updates**: Star count milestones, user feedback screenshots

**Optimal posting times:** Weekdays 9-11am EST (peak dev Twitter)

**Sample Launch Thread:**

> **Tweet 1/7:**
> I built a Notion-style markdown editor that lives inside VS Code.
> >
> >
> >
> No preview pane. No split view. Just edit your .md files like blocks.
> >
> >
> >
> It's called Quartz, it's free & open source, and here's what it looks like: 👇
> >
> >
> >
> [GIF: typing in Quartz, showing slash menu, block editing]

> **Tweet 2/7:**
> The problem: Every markdown editor in VS Code is basically a glorified text preview.
> >
> >
> >
> You write in a code editor. You preview in a side panel. Two mental models for one file.
> >
> >
> >
> What if editing markdown felt like editing in Notion — but the file is still plain .md?

> **Tweet 3/7:**
> Quartz gives you:
> >
> >
> >
> - Slash commands (type / for blocks)
> - Formatting toolbar
> - Tables, code blocks, callouts
> - Task lists with checkboxes
> - Dark + light theme
> >
> >
> >
> And your file stays valid markdown. Always.

> **Tweet 4/7:**
> The hardest part was round-trip fidelity.
> >
> >
> >
> Parse markdown → edit visually → save back to markdown → parse again = identical.
> >
> >
> >
> No eating your formatting. No mangling your frontmatter. What you write is what you get.

> **Tweet 5/7:**
> Built with:
> >
> >
> >
> - TipTap 2.11 (ProseMirror under the hood)
> - markdown-it for parsing
> - Custom serializer for output
> - 9 custom extensions
> - 15 E2E test suites
> >
> >
> >
> Architecture doc is in the repo if you're curious.

> **Tweet 6/7:**
> It's MIT licensed and I'm looking for contributors.
> >
> >
> >
> If you've ever wanted to hack on a VS Code extension or a rich text editor, check out the "good first issue" labels.
> >
> >
> >
> GitHub: github.com/Mathuran/quartz

> **Tweet 7/7:**
> Install it now from the VS Code Marketplace:
> >
> >
> >
> [Marketplace link]
> >
> >
> >
> Try it on any .md file. I'd love your feedback — what blocks are missing? What feels off?
> >
> >
> >
> RT if you think markdown editing in VS Code deserves better. 🪨

### Reddit Strategy

**Target subreddits:**

| Subreddit     | Subscribers | Post Style                                |
| ------------- | ----------- | ----------------------------------------- |
| r/vscode      | 200K+       | Feature showcase, "I made this"           |
| r/programming | 5M+         | Technical story, problem/solution         |
| r/markdown    | 15K+        | "New tool for markdown lovers"            |
| r/webdev      | 2M+         | Technical deep-dive on TipTap/ProseMirror |
| r/SideProject | 100K+       | Build story, lessons learned              |

**Sample Reddit Post (r/vscode):**

> **Title:** I built a Notion-style block editor for VS Code that edits real .md files — no preview pane needed
> >
> >
> >
> **Body:**
> Hey r/vscode! I've been working on Quartz, a WYSIWYG markdown editor that replaces the default text editor for .md files.
> >
> >
> >
> Instead of writing raw markdown and previewing it in a side panel, Quartz renders your file as editable blocks — like Notion or Google Docs, but the underlying file stays plain markdown.
> >
> >
> >
> **What it does:**
> >
> >
> >
> - Slash commands for inserting blocks (headings, code, tables, callouts)
> - Inline formatting toolbar
> - Full keyboard shortcut support
> - Round-trip fidelity: your markdown comes out exactly as it went in
> - Dark and light themes that match VS Code
> >
> >
> >
> **What it doesn't do (yet):**
> >
> >
> >
> - Images (coming soon)
> - Collaborative editing
> - Anything that would lock you into a proprietary format
> >
> >
> >
> It's free, open source (MIT), and I'd love feedback. What would make this useful for your workflow?
> >
> >
> >
> [Marketplace link] | [GitHub](https://github.com/Mathuran/quartz)
> >
> >
> >
> [Screenshot showing the editor in action]

### Hacker News Strategy

**Post type:** "Show HN" — one shot, make it count.

**Optimal timing:** Tuesday or Wednesday, 9-10am EST

**Sample Show HN:**

> **Title:** Show HN: Quartz – A Notion-style markdown editor inside VS Code
> >
> >
> >
> **Body:**
> Hi HN, I built Quartz because I was tired of the markdown preview pane workflow in VS Code. Write in a text editor, preview in a panel — it's 2026 and we can do better.
> >
> >
> >
> Quartz replaces the default .md editor with a block-based WYSIWYG experience. Think Notion's editor, but:
> >
> >
> >
> - Your file stays plain .md on disk (no proprietary format)
> - Round-trip fidelity: parse → edit → serialize → parse = identical
> - Works with any existing markdown file, including frontmatter
> >
> >
> >
> Technical stack: TipTap 2.11 (ProseMirror), markdown-it, custom serializer, 9 custom extensions. The hardest engineering problem was maintaining perfect round-trip fidelity — every parse/serialize cycle must produce identical output.
> >
> >
> >
> MIT licensed. VS Code Marketplace: [link]. GitHub: https://github.com/Mathuran/quartz
> >
> >
> >
> I'd especially love feedback on: what markdown features do you use that editors always get wrong?

## 6. Security, Privacy, and Compliance

- **No user data collection:** Quartz collects zero telemetry or user data. This is a selling point — mention it in posts.
- **No API keys or credentials** are involved in the content pipeline — all posts are manually published by the human.
- **Content review:** All posts are reviewed by you before publishing. Claude Code never posts autonomously.
- **Account security:** Use 2FA on all social accounts. Never share credentials with any tool or automation.
- **Open source compliance:** MIT license is permissive and clear. Include license badge in social assets.

## 7. Testing Strategy

"Testing" for a social media launch means validating content effectiveness:

| Test                        | Method                                                | Success Criteria                                                                |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Post quality**            | Human review of each generated post before publishing | Post reads naturally, no AI-sounding language, platform-appropriate tone        |
| **GIF/screenshot quality**  | Manual capture and review                             | Clear, readable at Twitter thumbnail size, shows the "aha moment" in <5 seconds |
| **Link validation**         | Check all links before posting                        | Marketplace link, GitHub link, and any other URLs resolve correctly             |
| **Reddit rules compliance** | Review subreddit rules before posting                 | No self-promotion violations, follows flair requirements                        |
| **Engagement tracking**     | Manual metrics logging after 24h and 7d               | Posts generate measurable engagement (see Goals)                                |
| **A/B content testing**     | Try different angles on same platform over time       | Identify which content pillars drive the most installs/stars                    |

## 8. Rollout Plan

### Phase 1: Pre-Launch Prep (Days 1-3) — 1 review cycle

**Agent delivers:**

- Content calendar for 8 weeks (all post topics, dates, platforms)
- Launch thread for Twitter (7 tweets with placeholders for GIFs)
- Reddit posts for 3 subreddits
- Show HN post draft
- GitHub README improvements for social proof readiness (badges, clear CTA)
- "Good first issue" labels on 5+ GitHub issues
- `projectManager/launch/` directory with all files

**Human reviews:**

- Tone and accuracy of all posts
- Screenshot/GIF captures (you need to create these)
- Subreddit rule compliance
- GitHub README changes

**Approved when:** All launch-day posts are finalized and GIFs/screenshots are ready

### Phase 2: Launch Week (Days 4-10) — 2 review cycles

**Day 1 (Tuesday):**

- Morning: Publish Show HN post
- Afternoon: Publish Twitter launch thread
- Evening: Post to r/vscode

**Day 2:**

- Post to r/SideProject
- Tweet a standalone feature highlight

**Day 3:**

- Post to r/programming (if HN got traction, reference it)
- Tweet about the technical architecture

**Day 4-7:**

- Daily tweets (1 per day, rotating content pillars)
- Respond to all comments on Reddit and HN
- Post to r/markdown and r/webdev

**Human reviews:**

- Approve each day's posts the evening before
- Report engagement metrics daily (Claude Code logs them)
- Decide whether to adjust timing or messaging

**Approved when:** Launch week posts are all published and initial metrics are logged

### Phase 3: Sustained Growth (Weeks 2-8) — 1 review cycle per week

**Cadence:**

- 3 tweets per week (Mon/Wed/Fri)
- 1 Reddit post per week (rotating subreddits)
- Monthly changelog post when new versions ship

**Agent delivers weekly:**

- Next week's post drafts (all platforms)
- Metrics summary from previous week
- Strategy adjustment recommendations
- New content angles based on what's performing

**Human reviews:**

- Batch-approve weekly posts (15 min/week)
- Report engagement numbers
- Flag any community questions or feature requests

**Approved when:** Engagement is stable or growing week-over-week

## 9. Human Validation Plan

| Checkpoint              | Agent Produces                  | Human Validates                      | Blocks               |
| ----------------------- | ------------------------------- | ------------------------------------ | -------------------- |
| Pre-launch content      | All launch day posts + calendar | Tone, accuracy, GIF quality          | Launch cannot start  |
| GIF/screenshot creation | Descriptions of what to capture | Actual screen recordings/screenshots | Posts need visuals   |
| Show HN timing          | Recommended date/time           | Final go/no-go decision              | HN post              |
| Daily launch posts      | Ready-to-publish text           | Review + publish                     | Each day's posts     |
| Comment responses       | Suggested reply drafts          | Review + post replies                | Community engagement |
| Weekly content batch    | 5-7 posts for next week         | 15-min batch review                  | Next week's content  |
| Strategy pivots         | Data-driven recommendations     | Decision on direction changes        | Content strategy     |

**Key human-only decisions:**

1. When exactly to publish the Show HN (timing is everything)
2. Whether to engage or ignore hostile comments
3. When to introduce new features vs. keep promoting existing ones
4. Whether engagement justifies continued effort or strategy needs a major pivot

## 10. Dependencies and Risks

### Dependencies

| Dependency                                        | Owner | Status                 |
| ------------------------------------------------- | ----- | ---------------------- |
| GIF/screenshot creation tool (e.g., Kap, LICEcap) | Human | Needed before launch   |
| Twitter/X account with developer following        | Human | Exists                 |
| Reddit account with sufficient karma              | Human | Exists                 |
| Hacker News account                               | Human | Verify before launch   |
| VS Code Marketplace listing optimization          | Agent | Can be done in Phase 1 |
| GitHub "good first issue" labels                  | Agent | Can be done in Phase 1 |

### Risks and Mitigations

| Risk                                   | Impact | Likelihood | Mitigation                                                                          |
| -------------------------------------- | ------ | ---------- | ----------------------------------------------------------------------------------- |
| Show HN doesn't gain traction          | High   | Medium     | Have backup plan: post to r/programming same day for alternative exposure           |
| Reddit removes post as self-promotion  | Medium | Medium     | Build comment history in target subreddits before posting; follow all rules exactly |
| Negative feedback on product quality   | Medium | Low        | Have honest responses ready; treat feedback as feature requests; product is solid   |
| Content feels AI-generated             | High   | Medium     | Heavy human editing pass; inject personal voice and specific anecdotes              |
| Launch fatigue (human stops reviewing) | High   | Medium     | Batch weekly reviews; keep time commitment to <15 min/week after launch week        |
| Competitor launches similar feature    | Low    | Low        | Move fast; first-mover advantage in this niche                                      |

## 11. Open Questions

| Question                                                                                                | Owner | Blocking?           |
| ------------------------------------------------------------------------------------------------------- | ----- | ------------------- |
| What's your Twitter handle? Need to optimize thread for your existing audience                          | Human | Yes — Phase 1       |
| Do you have a personal story about why you built Quartz? Authentic origin stories perform 3-5x better   | Human | No, but high impact |
| Are there any features shipping in the next 2 weeks that should be included in launch messaging?        | Human | No                  |
| Do you want to include a short screen recording (30-60s) or stick with GIFs?                            | Human | No                  |
| Should we set up a simple analytics approach (e.g., UTM links) to track which platform drives installs? | Human | No                  |

## 12. Implementation Issues

*To be populated after design doc approval via **`/create-issues social-media-launch-plan`*

| #   | Title | Status | Scope |
| --- | ----- | ------ | ----- |
| —   | —     | —      | —     |

**Progress:** 0/0 issues complete (0%)

## 13. Appendix

### A. Content Calendar Overview (Week 1-4)

| Week       | Monday            | Wednesday           | Friday                     | Reddit                  | Notes                |
| ---------- | ----------------- | ------------------- | -------------------------- | ----------------------- | -------------------- |
| 1 (Launch) | —                 | HN + Twitter thread | Feature highlight          | r/vscode, r/SideProject | Big push             |
| 2          | Comparison post   | Technical deep-dive | User story/feedback        | r/programming           | Ride launch momentum |
| 3          | Feature spotlight | "Did you know" tip  | Build-in-public update     | r/markdown              | Sustain              |
| 4          | Problem/solution  | Behind-the-scenes   | Community/contributor call | r/webdev                | Expand reach         |

### B. Key Metrics to Track

| Metric                              | Source                | Target (8 weeks) |
| ----------------------------------- | --------------------- | ---------------- |
| VS Code Marketplace installs        | Marketplace dashboard | 500+             |
| GitHub stars                        | GitHub                | 100+             |
| Twitter impressions (launch thread) | Twitter analytics     | 50,000+          |
| HN points                           | Hacker News           | 50+              |
| Reddit upvotes (total across posts) | Reddit                | 200+             |
| GitHub issues opened by community   | GitHub                | 10+              |
| First-time contributors             | GitHub                | 2-3              |

### C. Tools for Content Creation

| Task                     | Recommended Tool                                         |
| ------------------------ | -------------------------------------------------------- |
| GIF recording            | Kap (macOS, free) or LICEcap                             |
| Screenshot annotation    | CleanShot X or Shottr                                    |
| Link shortening/tracking | Short.io (free tier) with UTM params                     |
| Twitter scheduling       | Buffer (free tier) or manual                             |
| Metrics tracking         | `projectManager/launch/metrics.md` (Claude Code managed) |
