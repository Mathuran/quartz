#!/usr/bin/env -S deno run --allow-read

/**
 * Project Status Script
 *
 * Scans projectManager/ for issues, design docs, and backlog items,
 * extracts metadata, and prints a comprehensive status report.
 *
 * Usage:
 *   deno run --allow-read issue-status.ts [feature-name]
 *   deno run --allow-read issue-status.ts                  # all features
 *   deno run --allow-read issue-status.ts undo-redo        # single feature
 */

import { walk } from "https://deno.land/std@0.224.0/fs/walk.ts";
import { basename, dirname, resolve } from "https://deno.land/std@0.224.0/path/mod.ts";

interface Issue {
  number: string;
  filename: string;
  title: string;
  status: string;
  dependsOn: string;
  blocks: string;
  scope: string;
  designDoc: string;
  feature: string;
}

interface FeatureSummary {
  name: string;
  issues: Issue[];
  todo: number;
  inProgress: number;
  blocked: number;
  done: number;
  total: number;
}

interface DesignDoc {
  filename: string;
  title: string;
  status: string;
  author: string;
  created: string;
  lastUpdated: string;
}

interface BacklogItem {
  filename: string;
  title: string;
  status: string;
  priority: string;
  tags: string;
  created: string;
}

function parseIssueFile(content: string, filename: string, feature: string): Issue {
  const lines = content.split("\n");

  // Extract title from first heading
  const titleLine = lines.find((l) => l.startsWith("# "));
  const title = titleLine?.replace(/^#\s*\[?\d*\]?\s*/, "").trim() ?? basename(filename, ".md");

  // Extract metadata fields
  const get = (key: string): string => {
    const line = lines.find((l) => l.toLowerCase().includes(`**${key.toLowerCase()}:**`));
    if (!line) return "—";
    const value = line.split(":**")[1]?.trim() ?? "—";
    return value.replace(/^\*\*/, "").replace(/\*\*$/, "").trim() || "—";
  };

  // Extract issue number from filename (e.g., "001-some-title.md" -> "001")
  const number = basename(filename).match(/^(\d+)/)?.[1] ?? "???";

  return {
    number,
    filename,
    title,
    status: get("Status"),
    dependsOn: get("Depends On"),
    blocks: get("Blocks"),
    scope: get("Scope"),
    designDoc: get("Design Doc"),
    feature,
  };
}

async function scanIssues(issuesDir: string, featureFilter?: string): Promise<Map<string, FeatureSummary>> {
  const features = new Map<string, FeatureSummary>();

  for await (const entry of walk(issuesDir, { exts: [".md"], maxDepth: 2 })) {
    if (!entry.isFile) continue;

    const feature = basename(dirname(entry.path));
    if (feature === "issues") continue; // skip files directly in issues/
    if (featureFilter && feature !== featureFilter) continue;

    const content = await Deno.readTextFile(entry.path);
    const issue = parseIssueFile(content, entry.path, feature);

    if (!features.has(feature)) {
      features.set(feature, {
        name: feature,
        issues: [],
        todo: 0,
        inProgress: 0,
        blocked: 0,
        done: 0,
        total: 0,
      });
    }

    const summary = features.get(feature)!;
    summary.issues.push(issue);
    summary.total++;

    const status = issue.status.toUpperCase();
    if (status === "DONE") summary.done++;
    else if (status === "IN_PROGRESS" || status === "IN PROGRESS") summary.inProgress++;
    else if (status === "BLOCKED") summary.blocked++;
    else summary.todo++;
  }

  // Sort issues within each feature by number
  for (const summary of features.values()) {
    summary.issues.sort((a, b) => a.number.localeCompare(b.number));
  }

  return features;
}

function parseDesignDoc(content: string, filename: string): DesignDoc {
  const lines = content.split("\n");

  const titleLine = lines.find((l) => l.startsWith("# "));
  const title = titleLine?.replace(/^#\s*/, "").trim() ?? basename(filename, ".md");

  const getInline = (key: string): string => {
    const line = lines.find((l) => l.startsWith(`**${key}:**`));
    if (!line) return "—";
    return line.replace(`**${key}:**`, "").trim() || "—";
  };

  return {
    filename,
    title,
    status: getInline("Status"),
    author: getInline("Author"),
    created: getInline("Created"),
    lastUpdated: getInline("Last Updated"),
  };
}

function parseBacklogItem(content: string, filename: string): BacklogItem {
  const lines = content.split("\n");

  const titleLine = lines.find((l) => l.startsWith("# "));
  const title = titleLine?.replace(/^#\s*/, "").trim() ?? basename(filename, ".md");

  // Backlog items use table format: | **Key** | Value |
  const getTable = (key: string): string => {
    const line = lines.find((l) => l.toLowerCase().includes(`**${key.toLowerCase()}**`));
    if (!line) return "—";
    const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
    return parts[1]?.trim() ?? "—";
  };

  return {
    filename,
    title,
    status: getTable("Status"),
    priority: getTable("Priority"),
    tags: getTable("Tags"),
    created: getTable("Created"),
  };
}

async function scanDesignDocs(docsDir: string): Promise<DesignDoc[]> {
  const docs: DesignDoc[] = [];
  try {
    for await (const entry of Deno.readDir(docsDir)) {
      if (!entry.isFile || !entry.name.endsWith(".md")) continue;
      const content = await Deno.readTextFile(resolve(docsDir, entry.name));
      docs.push(parseDesignDoc(content, entry.name));
    }
  } catch {
    // Directory may not exist
  }
  docs.sort((a, b) => a.title.localeCompare(b.title));
  return docs;
}

async function scanBacklog(backlogDir: string): Promise<BacklogItem[]> {
  const items: BacklogItem[] = [];
  try {
    for await (const entry of Deno.readDir(backlogDir)) {
      if (!entry.isFile || !entry.name.endsWith(".md")) continue;
      const content = await Deno.readTextFile(resolve(backlogDir, entry.name));
      items.push(parseBacklogItem(content, entry.name));
    }
  } catch {
    // Directory may not exist
  }
  // Sort by priority (P0 first), then alphabetically
  items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority.localeCompare(b.priority);
    return a.title.localeCompare(b.title);
  });
  return items;
}

function printReport(features: Map<string, FeatureSummary>, designDocs: DesignDoc[], backlogItems: BacklogItem[]): string {
  const lines: string[] = [];
  const push = (s = "") => lines.push(s);

  // Aggregate totals
  let totalAll = 0, doneAll = 0, todoAll = 0, inProgressAll = 0, blockedAll = 0;
  const active: FeatureSummary[] = [];
  const completed: FeatureSummary[] = [];

  for (const f of features.values()) {
    totalAll += f.total;
    doneAll += f.done;
    todoAll += f.todo;
    inProgressAll += f.inProgress;
    blockedAll += f.blocked;

    if (f.done === f.total) {
      completed.push(f);
    } else {
      active.push(f);
    }
  }

  // Sort active features: in-progress first, then by completion %
  active.sort((a, b) => {
    const aProgress = a.done / a.total;
    const bProgress = b.done / b.total;
    if (a.inProgress !== b.inProgress) return b.inProgress - a.inProgress;
    return bProgress - aProgress;
  });

  // Header
  push("# Project Status Report");
  push();

  // Design Docs summary
  if (designDocs.length > 0) {
    const byStatus = new Map<string, number>();
    for (const doc of designDocs) {
      const s = doc.status.toUpperCase();
      byStatus.set(s, (byStatus.get(s) ?? 0) + 1);
    }

    push("## Design Documents");
    push();
    push("| Document | Status | Author | Last Updated |");
    push("|----------|--------|--------|--------------|");
    for (const doc of designDocs) {
      push(`| ${doc.title} | ${doc.status} | ${doc.author} | ${doc.lastUpdated} |`);
    }
    push();

    const statusCounts = [...byStatus.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([s, n]) => `${s}: ${n}`)
      .join(", ");
    push(`> ${designDocs.length} docs — ${statusCounts}`);
    push();
  }

  // Backlog summary
  if (backlogItems.length > 0) {
    push("## Backlog");
    push();
    push("| Item | Priority | Tags | Created |");
    push("|------|----------|------|---------|");
    for (const item of backlogItems) {
      push(`| ${item.title} | ${item.priority} | ${item.tags} | ${item.created} |`);
    }
    push();
  }

  // Issue summary stats
  push("## Issues");
  push();
  const pct = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0;
  const barFilled = Math.round(pct / 5);
  const bar = "█".repeat(barFilled) + "░".repeat(20 - barFilled);
  push("```");
  push(`Total Issues: ${totalAll}`);
  push(`  DONE:          ${String(doneAll).padStart(3)}  (${pct}%)`);
  push(`  TODO:          ${String(todoAll).padStart(3)}`);
  push(`  IN_PROGRESS:   ${String(inProgressAll).padStart(3)}`);
  push(`  BLOCKED:       ${String(blockedAll).padStart(3)}`);
  push(`Progress: ${bar} ${pct}%`);
  push("```");
  push();

  // Active features (not fully complete)
  if (active.length > 0) {
    push("## Active Features");
    push();

    for (const f of active) {
      const fPct = Math.round((f.done / f.total) * 100);
      push(`### ${f.name} (${f.done}/${f.total} — ${fPct}%)`);
      push();
      push("| # | Title | Status | Scope | Depends On |");
      push("|---|-------|--------|-------|------------|");

      for (const issue of f.issues) {
        const status = issue.status.toUpperCase();
        if (status === "DONE") continue; // skip completed issues within active features
        push(`| ${issue.number} | ${issue.title} | ${issue.status} | ${issue.scope} | ${issue.dependsOn} |`);
      }
      push();
    }
  }

  // In-progress issues (across all features)
  const inProgressIssues = [...features.values()]
    .flatMap((f) => f.issues)
    .filter((i) => i.status.toUpperCase() === "IN_PROGRESS" || i.status.toUpperCase() === "IN PROGRESS");

  if (inProgressIssues.length > 0) {
    push("## In Progress");
    push();
    push("| Feature | # | Title | Scope |");
    push("|---------|---|-------|-------|");
    for (const i of inProgressIssues) {
      push(`| ${i.feature} | ${i.number} | ${i.title} | ${i.scope} |`);
    }
    push();
  }

  // Blocked issues
  const blockedIssues = [...features.values()]
    .flatMap((f) => f.issues)
    .filter((i) => i.status.toUpperCase() === "BLOCKED");

  if (blockedIssues.length > 0) {
    push("## Blocked");
    push();
    push("| Feature | # | Title | Blocked By |");
    push("|---------|---|-------|------------|");
    for (const i of blockedIssues) {
      push(`| ${i.feature} | ${i.number} | ${i.title} | ${i.dependsOn} |`);
    }
    push();
  }

  // Ready to start (TODO with no unmet dependencies)
  const todoIssues = [...features.values()]
    .flatMap((f) => f.issues)
    .filter((i) => i.status.toUpperCase() === "TODO");

  const readyIssues = todoIssues.filter((i) => {
    if (i.dependsOn === "—" || i.dependsOn.toLowerCase() === "none") return true;
    // Check if dependencies reference issues that are all DONE
    const feature = features.get(i.feature);
    if (!feature) return false;
    // Simple heuristic: if dependency references issue numbers, check them
    const depNums = i.dependsOn.match(/\d{3}/g);
    if (!depNums) return true; // can't parse deps, assume ready
    return depNums.every((num) => {
      const dep = feature.issues.find((d) => d.number === num);
      return dep && dep.status.toUpperCase() === "DONE";
    });
  });

  const waitingIssues = todoIssues.filter((i) => !readyIssues.includes(i));

  if (readyIssues.length > 0) {
    push("## Ready to Start");
    push();
    push("| Feature | # | Title | Scope |");
    push("|---------|---|-------|-------|");
    for (const i of readyIssues) {
      push(`| ${i.feature} | ${i.number} | ${i.title} | ${i.scope} |`);
    }
    push();
  }

  if (waitingIssues.length > 0) {
    push("## Waiting on Dependencies");
    push();
    push("| Feature | # | Title | Waiting On |");
    push("|---------|---|-------|------------|");
    for (const i of waitingIssues) {
      push(`| ${i.feature} | ${i.number} | ${i.title} | ${i.dependsOn} |`);
    }
    push();
  }

  // Completed features (collapsed)
  if (completed.length > 0) {
    push("## Completed Features");
    push();
    push("| Feature | Issues |");
    push("|---------|--------|");
    for (const f of completed) {
      push(`| ${f.name} | ${f.total}/${f.total} |`);
    }
    push();
  }

  return lines.join("\n");
}

// --- Main ---

const pmRoot = resolve(Deno.cwd(), "projectManager");
const issuesDir = resolve(pmRoot, "issues");
const designDocsDir = resolve(pmRoot, "design-docs");
const backlogDir = resolve(pmRoot, "backlog");
const featureFilter = Deno.args[0];

try {
  const [features, designDocs, backlogItems] = await Promise.all([
    scanIssues(issuesDir, featureFilter),
    scanDesignDocs(designDocsDir),
    scanBacklog(backlogDir),
  ]);

  if (features.size === 0 && designDocs.length === 0 && backlogItems.length === 0) {
    if (featureFilter) {
      console.log(`No issues found for feature: ${featureFilter}`);
      console.log(`Available features in projectManager/issues/:`);
      try {
        for await (const entry of Deno.readDir(issuesDir)) {
          if (entry.isDirectory) console.log(`  - ${entry.name}`);
        }
      } catch { /* dir may not exist */ }
    } else {
      console.log("No items found in projectManager/");
    }
    Deno.exit(1);
  }

  console.log(printReport(features, designDocs, backlogItems));
} catch (err) {
  if (err instanceof Deno.errors.NotFound) {
    console.error(`Error: Directory not found: ${pmRoot}`);
    console.error("Make sure you're running from the project root.");
    Deno.exit(1);
  }
  throw err;
}
