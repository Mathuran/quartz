#!/usr/bin/env bash

# Project Status Script
#
# Scans projectManager/ for issues, design docs, and backlog items,
# extracts metadata, and prints a comprehensive status report.
#
# Usage:
#   ./issue-status.sh [feature-name]
#   ./issue-status.sh                  # all features
#   ./issue-status.sh undo-redo        # single feature
#
# Compatible with bash 3.2+ (macOS default).

set -euo pipefail

# Resolve project root (script lives in projectManager/skills/project-management/scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
PM_ROOT="$PROJECT_ROOT/projectManager"

ISSUES_DIR="$PM_ROOT/issues"
DOCS_DIR="$PM_ROOT/design-docs"
BACKLOG_DIR="$PM_ROOT/backlog"
FEATURE_FILTER="${1:-}"

# --- Helpers ---

get_title() {
  local file="$1"
  local line
  line=$(grep -m1 '^# ' "$file" 2>/dev/null || true)
  if [[ -n "$line" ]]; then
    echo "${line#\# }"
  else
    basename "$file" .md
  fi
}

# Extract inline metadata: **Key:** Value
get_inline() {
  local file="$1" key="$2"
  local line
  line=$(grep -m1 "^\*\*${key}:\*\*" "$file" 2>/dev/null || true)
  if [[ -n "$line" ]]; then
    echo "$line" | sed "s/^\*\*${key}:\*\* *//"
  else
    echo "—"
  fi
}

# Extract table metadata: | **Key** | Value |
get_table() {
  local file="$1" key="$2"
  local line
  line=$(grep -i -m1 "|\s*\*\*${key}\*\*" "$file" 2>/dev/null || true)
  if [[ -n "$line" ]]; then
    echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}'
  else
    echo "—"
  fi
}

# Extract issue metadata: **Key:** Value (anywhere in line)
get_issue_field() {
  local file="$1" key="$2"
  local line
  line=$(grep -i -m1 "\*\*${key}:\*\*" "$file" 2>/dev/null || true)
  if [[ -n "$line" ]]; then
    local value
    value=$(echo "$line" | sed 's/.*:\*\*[[:space:]]*//' | sed 's/^\*\*//' | sed 's/\*\*$//' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
    if [[ -z "$value" ]]; then echo "—"; else echo "$value"; fi
  else
    echo "—"
  fi
}

upper() {
  echo "$1" | tr '[:lower:]' '[:upper:]'
}

# --- Design Documents ---

print_design_docs() {
  [[ -d "$DOCS_DIR" ]] || return 0

  local files=()
  while IFS= read -r f; do
    [[ -n "$f" ]] && files+=("$f")
  done <<< "$(find "$DOCS_DIR" -maxdepth 1 -name '*.md' 2>/dev/null | sort)"

  [[ ${#files[@]} -eq 0 ]] && return 0

  # Collect doc data: "title|status|author|updated"
  local doc_lines=()
  local all_statuses=""

  for f in "${files[@]}"; do
    local title status author updated
    title=$(get_title "$f")
    status=$(get_inline "$f" "Status")
    author=$(get_inline "$f" "Author")
    updated=$(get_inline "$f" "Last Updated")
    doc_lines+=("${title}|${status}|${author}|${updated}")
    all_statuses="${all_statuses}$(upper "$status")"$'\n'
  done

  # Sort by title
  local sorted=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && sorted+=("$line")
  done <<< "$(printf '%s\n' "${doc_lines[@]}" | sort -t'|' -k1,1)"

  echo "## Design Documents"
  echo ""
  echo "| Document | Status | Author | Last Updated |"
  echo "|----------|--------|--------|--------------|"
  for line in "${sorted[@]}"; do
    local title status author updated
    IFS='|' read -r title status author updated <<< "$line"
    echo "| $title | $status | $author | $updated |"
  done
  echo ""

  # Status counts summary
  local summary=""
  local seen_statuses=""
  while IFS= read -r s; do
    [[ -z "$s" ]] && continue
    # Skip if already counted
    case "$seen_statuses" in *"|${s}|"*) continue ;; esac
    seen_statuses="${seen_statuses}|${s}|"
    local count
    count=$(echo "$all_statuses" | grep -c "^${s}$" || true)
    [[ -n "$summary" ]] && summary="${summary}, "
    summary="${summary}${s}: ${count}"
  done <<< "$(echo "$all_statuses" | sort -u)"

  echo "> ${#sorted[@]} docs — $summary"
  echo ""
}

# --- Backlog ---

print_backlog() {
  [[ -d "$BACKLOG_DIR" ]] || return 0

  local files=()
  while IFS= read -r f; do
    [[ -n "$f" ]] && files+=("$f")
  done <<< "$(find "$BACKLOG_DIR" -maxdepth 1 -name '*.md' 2>/dev/null | sort)"

  [[ ${#files[@]} -eq 0 ]] && return 0

  # Collect: "priority|title|tags|created"
  local item_lines=()
  for f in "${files[@]}"; do
    local title priority tags created
    title=$(get_title "$f")
    priority=$(get_table "$f" "Priority")
    tags=$(get_table "$f" "Tags")
    created=$(get_table "$f" "Created")
    item_lines+=("${priority}|${title}|${tags}|${created}")
  done

  local sorted=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && sorted+=("$line")
  done <<< "$(printf '%s\n' "${item_lines[@]}" | sort -t'|' -k1,1 -k2,2)"

  echo "## Backlog"
  echo ""
  echo "| Item | Priority | Tags | Created |"
  echo "|------|----------|------|---------|"
  for line in "${sorted[@]}"; do
    local priority title tags created
    IFS='|' read -r priority title tags created <<< "$line"
    echo "| $title | $priority | $tags | $created |"
  done
  echo ""
}

# --- Issues ---

# Issue data stored as flat arrays (bash 3.2 compatible)
# Each issue: "feature|number|title|status|scope|dependsOn"
ISSUE_LINES=()
# Feature stats: "feature|total|done|todo|ip|blocked"
FEATURE_STATS=()

scan_issues() {
  [[ -d "$ISSUES_DIR" ]] || return 0

  ISSUE_LINES=()
  FEATURE_STATS=()

  for feature_dir in "$ISSUES_DIR"/*/; do
    [[ -d "$feature_dir" ]] || continue
    local feature
    feature=$(basename "$feature_dir")
    [[ -n "$FEATURE_FILTER" && "$feature" != "$FEATURE_FILTER" ]] && continue

    # Find or create feature stats entry
    local idx=-1 i=0
    for entry in "${FEATURE_STATS[@]+"${FEATURE_STATS[@]}"}"; do
      local f
      IFS='|' read -r f _ <<< "$entry"
      if [[ "$f" == "$feature" ]]; then idx=$i; break; fi
      i=$((i + 1))
    done
    if [[ $idx -eq -1 ]]; then
      idx=${#FEATURE_STATS[@]}
      FEATURE_STATS[idx]="${feature}|0|0|0|0|0"
    fi

    for issue_file in "$feature_dir"*.md; do
      [[ -f "$issue_file" ]] || continue

      local number title status depends_on scope
      number=$(basename "$issue_file" | grep -oE '^[0-9]+' || echo "???")
      title=$(get_title "$issue_file")
      title=$(echo "$title" | sed 's/^\[*[0-9]*\]*[[:space:]]*//')
      status=$(get_issue_field "$issue_file" "Status")
      depends_on=$(get_issue_field "$issue_file" "Depends On")
      scope=$(get_issue_field "$issue_file" "Scope")

      ISSUE_LINES+=("${feature}|${number}|${title}|${status}|${scope}|${depends_on}")

      # Update feature stats
      local old_entry total done todo ip blocked
      old_entry="${FEATURE_STATS[idx]}"
      IFS='|' read -r _ total done todo ip blocked <<< "$old_entry"
      total=$((total + 1))

      local us
      us=$(upper "$status")
      case "$us" in
        DONE) done=$((done + 1)) ;;
        IN_PROGRESS|"IN PROGRESS") ip=$((ip + 1)) ;;
        BLOCKED) blocked=$((blocked + 1)) ;;
        *) todo=$((todo + 1)) ;;
      esac

      FEATURE_STATS[idx]="${feature}|${total}|${done}|${todo}|${ip}|${blocked}"
    done
  done
}

print_issues() {
  [[ ${#FEATURE_STATS[@]} -eq 0 ]] && return 0

  # Aggregate totals
  local total_all=0 done_all=0 todo_all=0 ip_all=0 blocked_all=0
  for entry in "${FEATURE_STATS[@]}"; do
    local f total done todo ip blocked
    IFS='|' read -r f total done todo ip blocked <<< "$entry"
    total_all=$((total_all + total))
    done_all=$((done_all + done))
    todo_all=$((todo_all + todo))
    ip_all=$((ip_all + ip))
    blocked_all=$((blocked_all + blocked))
  done

  # Progress bar
  local pct=0
  [[ $total_all -gt 0 ]] && pct=$((done_all * 100 / total_all))
  local bar_filled=$((pct / 5))
  local bar_empty=$((20 - bar_filled))
  local bar=""
  local i
  for ((i=0; i<bar_filled; i++)); do bar+="█"; done
  for ((i=0; i<bar_empty; i++)); do bar+="░"; done

  echo "## Issues"
  echo ""
  echo '```'
  printf "Total Issues: %d\n" "$total_all"
  printf "  DONE:          %3d  (%d%%)\n" "$done_all" "$pct"
  printf "  TODO:          %3d\n" "$todo_all"
  printf "  IN_PROGRESS:   %3d\n" "$ip_all"
  printf "  BLOCKED:       %3d\n" "$blocked_all"
  printf "Progress: %s %d%%\n" "$bar" "$pct"
  echo '```'
  echo ""

  # Sort feature stats by name
  local sorted_stats=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && sorted_stats+=("$line")
  done <<< "$(printf '%s\n' "${FEATURE_STATS[@]}" | sort -t'|' -k1,1)"

  # Active features
  local has_active=false
  for entry in "${sorted_stats[@]}"; do
    local f total done todo ip blocked
    IFS='|' read -r f total done todo ip blocked <<< "$entry"
    [[ $done -ge $total ]] && continue

    if [[ "$has_active" == false ]]; then
      echo "## Active Features"
      echo ""
      has_active=true
    fi

    local f_pct=$((done * 100 / total))
    echo "### $f (${done}/${total} — ${f_pct}%)"
    echo ""
    echo "| # | Title | Status | Scope | Depends On |"
    echo "|---|-------|--------|-------|------------|"

    for line in "${ISSUE_LINES[@]}"; do
      local lf num title status scope deps
      IFS='|' read -r lf num title status scope deps <<< "$line"
      [[ "$lf" != "$f" ]] && continue
      [[ "$(upper "$status")" == "DONE" ]] && continue
      echo "| $num | $title | $status | $scope | $deps |"
    done
    echo ""
  done

  # In-progress issues
  local has_ip=false
  for line in "${ISSUE_LINES[@]}"; do
    local feature num title status scope deps
    IFS='|' read -r feature num title status scope deps <<< "$line"
    local us
    us=$(upper "$status")
    if [[ "$us" == "IN_PROGRESS" || "$us" == "IN PROGRESS" ]]; then
      if [[ "$has_ip" == false ]]; then
        echo "## In Progress"
        echo ""
        echo "| Feature | # | Title | Scope |"
        echo "|---------|---|-------|-------|"
        has_ip=true
      fi
      echo "| $feature | $num | $title | $scope |"
    fi
  done
  [[ "$has_ip" == true ]] && echo ""

  # Blocked issues
  local has_blocked=false
  for line in "${ISSUE_LINES[@]}"; do
    local feature num title status scope deps
    IFS='|' read -r feature num title status scope deps <<< "$line"
    if [[ "$(upper "$status")" == "BLOCKED" ]]; then
      if [[ "$has_blocked" == false ]]; then
        echo "## Blocked"
        echo ""
        echo "| Feature | # | Title | Blocked By |"
        echo "|---------|---|-------|------------|"
        has_blocked=true
      fi
      echo "| $feature | $num | $title | $deps |"
    fi
  done
  [[ "$has_blocked" == true ]] && echo ""

  # Ready to start / Waiting on dependencies
  local ready_lines=()
  local waiting_lines=()

  for line in "${ISSUE_LINES[@]}"; do
    local feature num title status scope deps
    IFS='|' read -r feature num title status scope deps <<< "$line"
    [[ "$(upper "$status")" != "TODO" ]] && continue

    local ready=true
    if [[ "$deps" != "—" && "$deps" != "none" && "$deps" != "None" ]]; then
      local dep_nums
      dep_nums=$(echo "$deps" | grep -oE '[0-9]{3}' || true)
      if [[ -n "$dep_nums" ]]; then
        for dep_num in $dep_nums; do
          for check_line in "${ISSUE_LINES[@]}"; do
            local cf cn ct cs _ _
            IFS='|' read -r cf cn ct cs _ _ <<< "$check_line"
            if [[ "$cf" == "$feature" && "$cn" == "$dep_num" ]]; then
              [[ "$(upper "$cs")" != "DONE" ]] && ready=false
            fi
          done
        done
      fi
    fi

    if [[ "$ready" == true ]]; then
      ready_lines+=("| $feature | $num | $title | $scope |")
    else
      waiting_lines+=("| $feature | $num | $title | $deps |")
    fi
  done

  if [[ ${#ready_lines[@]} -gt 0 ]]; then
    echo "## Ready to Start"
    echo ""
    echo "| Feature | # | Title | Scope |"
    echo "|---------|---|-------|-------|"
    for rl in "${ready_lines[@]}"; do echo "$rl"; done
    echo ""
  fi

  if [[ ${#waiting_lines[@]} -gt 0 ]]; then
    echo "## Waiting on Dependencies"
    echo ""
    echo "| Feature | # | Title | Waiting On |"
    echo "|---------|---|-------|------------|"
    for wl in "${waiting_lines[@]}"; do echo "$wl"; done
    echo ""
  fi

  # Completed features
  local has_completed=false
  for entry in "${sorted_stats[@]}"; do
    local f total done todo ip blocked
    IFS='|' read -r f total done todo ip blocked <<< "$entry"
    [[ $done -lt $total ]] && continue

    if [[ "$has_completed" == false ]]; then
      echo "## Completed Features"
      echo ""
      echo "| Feature | Issues |"
      echo "|---------|--------|"
      has_completed=true
    fi
    echo "| $f | ${total}/${total} |"
  done
  [[ "$has_completed" == true ]] && echo ""
}

# --- Main ---

if [[ ! -d "$PM_ROOT" ]]; then
  echo "Error: Directory not found: $PM_ROOT" >&2
  echo "Make sure you're running from the project root." >&2
  exit 1
fi

echo "# Project Status Report"
echo ""

print_design_docs
print_backlog

scan_issues

if [[ ${#FEATURE_STATS[@]} -gt 0 ]]; then
  print_issues
elif [[ -n "$FEATURE_FILTER" ]]; then
  echo "No issues found for feature: $FEATURE_FILTER"
  echo "Available features in projectManager/issues/:"
  for d in "$ISSUES_DIR"/*/; do
    [[ -d "$d" ]] && echo "  - $(basename "$d")"
  done
fi
