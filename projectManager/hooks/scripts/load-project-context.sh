#!/bin/bash
# Load project management context at session start
# This script runs at SessionStart to provide Claude with context about
# the current state of design docs and issues

set -euo pipefail

# Get project directory from environment or use current directory
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
PM_DIR="$PROJECT_DIR/projectManager"

# Output JSON structure
output_json() {
    local status="$1"
    local message="$2"
    echo "{\"continue\": true, \"systemMessage\": \"$message\"}"
}

# Check if projectManager directory exists
if [ ! -d "$PM_DIR" ]; then
    # No project manager directory, silently continue
    echo '{"continue": true}'
    exit 0
fi

# Count design docs
DESIGN_DOCS_DIR="$PM_DIR/design-docs"
DESIGN_DOC_COUNT=0
DRAFT_DOCS=""
APPROVED_DOCS=""

if [ -d "$DESIGN_DOCS_DIR" ]; then
    for doc in "$DESIGN_DOCS_DIR"/*.md 2>/dev/null; do
        if [ -f "$doc" ]; then
            ((DESIGN_DOC_COUNT++))
            filename=$(basename "$doc" .md)

            # Check status
            if grep -qi "Status:.*DRAFT" "$doc" 2>/dev/null; then
                DRAFT_DOCS="$DRAFT_DOCS $filename"
            elif grep -qi "Status:.*APPROVED" "$doc" 2>/dev/null; then
                APPROVED_DOCS="$APPROVED_DOCS $filename"
            fi
        fi
    done
fi

# Count issues by feature
ISSUES_DIR="$PM_DIR/issues"
TOTAL_ISSUES=0
TODO_COUNT=0
IN_PROGRESS_COUNT=0
DONE_COUNT=0
BLOCKED_COUNT=0
FEATURES_WITH_ISSUES=""

if [ -d "$ISSUES_DIR" ]; then
    for feature_dir in "$ISSUES_DIR"/*/; do
        if [ -d "$feature_dir" ]; then
            feature_name=$(basename "$feature_dir")
            FEATURES_WITH_ISSUES="$FEATURES_WITH_ISSUES $feature_name"

            for issue in "$feature_dir"/*.md 2>/dev/null; do
                if [ -f "$issue" ]; then
                    ((TOTAL_ISSUES++))

                    if grep -qi "Status:.*TODO" "$issue" 2>/dev/null; then
                        ((TODO_COUNT++))
                    elif grep -qi "Status:.*IN_PROGRESS" "$issue" 2>/dev/null; then
                        ((IN_PROGRESS_COUNT++))
                    elif grep -qi "Status:.*DONE" "$issue" 2>/dev/null; then
                        ((DONE_COUNT++))
                    elif grep -qi "Status:.*BLOCKED" "$issue" 2>/dev/null; then
                        ((BLOCKED_COUNT++))
                    fi
                fi
            done
        fi
    done
fi

# Build context message
CONTEXT_MSG="[Project Manager Context] "

if [ $DESIGN_DOC_COUNT -gt 0 ] || [ $TOTAL_ISSUES -gt 0 ]; then
    CONTEXT_MSG="${CONTEXT_MSG}Found projectManager folder with: "

    if [ $DESIGN_DOC_COUNT -gt 0 ]; then
        CONTEXT_MSG="${CONTEXT_MSG}${DESIGN_DOC_COUNT} design doc(s)"
        if [ -n "$DRAFT_DOCS" ]; then
            CONTEXT_MSG="${CONTEXT_MSG} (drafts:$DRAFT_DOCS)"
        fi
        if [ -n "$APPROVED_DOCS" ]; then
            CONTEXT_MSG="${CONTEXT_MSG} (approved:$APPROVED_DOCS)"
        fi
        CONTEXT_MSG="${CONTEXT_MSG}. "
    fi

    if [ $TOTAL_ISSUES -gt 0 ]; then
        CONTEXT_MSG="${CONTEXT_MSG}${TOTAL_ISSUES} issue(s) across features:$FEATURES_WITH_ISSUES "
        CONTEXT_MSG="${CONTEXT_MSG}[TODO: $TODO_COUNT, In Progress: $IN_PROGRESS_COUNT, Done: $DONE_COUNT, Blocked: $BLOCKED_COUNT]. "
    fi

    # Add suggestions based on state
    if [ -n "$DRAFT_DOCS" ]; then
        CONTEXT_MSG="${CONTEXT_MSG}Use /review-doc to continue reviewing draft documents. "
    fi

    if [ $IN_PROGRESS_COUNT -gt 0 ]; then
        CONTEXT_MSG="${CONTEXT_MSG}Use /issue-status to see current progress. "
    fi

    if [ $BLOCKED_COUNT -gt 0 ]; then
        CONTEXT_MSG="${CONTEXT_MSG}Warning: $BLOCKED_COUNT blocked issue(s) need attention. "
    fi
else
    CONTEXT_MSG="${CONTEXT_MSG}projectManager folder exists but is empty. Use /design-doc <feature-name> to start a new feature."
fi

# Escape quotes for JSON
CONTEXT_MSG=$(echo "$CONTEXT_MSG" | sed 's/"/\\"/g')

# Output the context
echo "{\"continue\": true, \"systemMessage\": \"$CONTEXT_MSG\"}"
