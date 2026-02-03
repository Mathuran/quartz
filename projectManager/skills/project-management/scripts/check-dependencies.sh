#!/bin/bash
# Check issue dependencies for cycles and validity
# Usage: check-dependencies.sh <path-to-issues-directory>
# Compatible with bash 3.2+ (macOS default)

set -euo pipefail

if [ $# -eq 0 ]; then
    echo "Usage: check-dependencies.sh <path-to-issues-directory>"
    exit 1
fi

ISSUES_DIR="$1"

if [ ! -d "$ISSUES_DIR" ]; then
    echo "Error: Directory not found: $ISSUES_DIR"
    exit 1
fi

echo "Checking issue dependencies in: $ISSUES_DIR"
echo "========================================="

ERRORS=0
WARNINGS=0

# Create temp directory for storing parsed data (compatible with both macOS and Linux)
TMPDIR_DEPS=$(mktemp -d 2>/dev/null || mktemp -d -t 'deps')
trap 'rm -rf "$TMPDIR_DEPS"' EXIT

mkdir -p "$TMPDIR_DEPS/issues"
mkdir -p "$TMPDIR_DEPS/depends"
mkdir -p "$TMPDIR_DEPS/blocks"

# Find all issue files
ISSUE_FILES=$(find "$ISSUES_DIR" -name "*.md" -type f | sort)

if [ -z "$ISSUE_FILES" ]; then
    echo "No issue files found in $ISSUES_DIR"
    exit 0
fi

# Collect all issue numbers
ALL_ISSUES=""

echo ""
echo "Found issues:"
for file in $ISSUE_FILES; do
    filename=$(basename "$file")
    # Extract issue number from filename (e.g., 001-setup.md -> 001)
    issue_num=$(echo "$filename" | grep -oE '^[0-9]+' || echo "")

    if [ -n "$issue_num" ]; then
        # Remove leading zeros for comparison
        issue_num_clean=$(echo "$issue_num" | sed 's/^0*//')
        [ -z "$issue_num_clean" ] && issue_num_clean="0"

        # Store issue file path
        echo "$file" > "$TMPDIR_DEPS/issues/$issue_num_clean"
        ALL_ISSUES="$ALL_ISSUES $issue_num_clean"
        echo "  [$issue_num] $filename"

        # Extract dependencies (handle "None" and empty)
        deps=$(grep -i "Depends On:" "$file" | sed 's/.*Depends On://i' | tr ',' '\n' | grep -oE '[0-9]+' || echo "")
        echo "$deps" > "$TMPDIR_DEPS/depends/$issue_num_clean"

        # Extract blocks (handle "None" and empty)
        blocks=$(grep -i "^- \*\*Blocks:\*\*" "$file" | sed 's/.*Blocks:\*\*//i' | tr ',' '\n' | grep -oE '[0-9]+' || echo "")
        echo "$blocks" > "$TMPDIR_DEPS/blocks/$issue_num_clean"
    fi
done

# Helper: check if an issue number exists
issue_exists() {
    [ -f "$TMPDIR_DEPS/issues/$1" ]
}

# Helper: get depends for an issue
get_depends() {
    cat "$TMPDIR_DEPS/depends/$1" 2>/dev/null | tr -s '\n' ' ' | sed 's/^ *//;s/ *$//'
}

# Helper: get blocks for an issue
get_blocks() {
    cat "$TMPDIR_DEPS/blocks/$1" 2>/dev/null | tr -s '\n' ' ' | sed 's/^ *//;s/ *$//'
}

# Check for invalid dependencies
echo ""
echo "Checking dependency validity..."
for issue_num in $ALL_ISSUES; do
    deps=$(get_depends "$issue_num")
    for dep in $deps; do
        dep_clean=$(echo "$dep" | sed 's/^0*//')
        [ -z "$dep_clean" ] && dep_clean="0"
        if ! issue_exists "$dep_clean"; then
            echo "  ✗ Issue $issue_num depends on non-existent issue $dep"
            ERRORS=$((ERRORS + 1))
        fi
    done
done

# Check for self-dependencies
echo ""
echo "Checking for self-dependencies..."
for issue_num in $ALL_ISSUES; do
    deps=$(get_depends "$issue_num")
    for dep in $deps; do
        dep_clean=$(echo "$dep" | sed 's/^0*//')
        [ -z "$dep_clean" ] && dep_clean="0"
        if [ "$dep_clean" = "$issue_num" ]; then
            echo "  ✗ Issue $issue_num depends on itself"
            ERRORS=$((ERRORS + 1))
        fi
    done
done

# Cycle detection (2-node cycles)
echo ""
echo "Checking for circular dependencies..."
for issue_a in $ALL_ISSUES; do
    deps_a=$(get_depends "$issue_a")
    for dep in $deps_a; do
        dep_clean=$(echo "$dep" | sed 's/^0*//')
        [ -z "$dep_clean" ] && dep_clean="0"
        deps_b=$(get_depends "$dep_clean")
        for dep_b in $deps_b; do
            dep_b_clean=$(echo "$dep_b" | sed 's/^0*//')
            [ -z "$dep_b_clean" ] && dep_b_clean="0"
            if [ "$dep_b_clean" = "$issue_a" ]; then
                echo "  ✗ Circular dependency: $issue_a <-> $dep_clean"
                ERRORS=$((ERRORS + 1))
            fi
        done
    done
done

# Check bidirectional consistency
echo ""
echo "Checking bidirectional link consistency..."
for issue_num in $ALL_ISSUES; do
    deps=$(get_depends "$issue_num")
    for dep in $deps; do
        dep_clean=$(echo "$dep" | sed 's/^0*//')
        [ -z "$dep_clean" ] && dep_clean="0"
        # Check if the dependency's "Blocks" field contains this issue
        blocks_of_dep=$(get_blocks "$dep_clean")
        found=0
        for b in $blocks_of_dep; do
            b_clean=$(echo "$b" | sed 's/^0*//')
            [ -z "$b_clean" ] && b_clean="0"
            if [ "$b_clean" = "$issue_num" ]; then
                found=1
                break
            fi
        done
        if [ "$found" -eq 0 ]; then
            echo "  ⚠ Issue $issue_num depends on $dep_clean, but $dep_clean does not list $issue_num in Blocks"
            WARNINGS=$((WARNINGS + 1))
        fi
    done

    blocks=$(get_blocks "$issue_num")
    for blk in $blocks; do
        blk_clean=$(echo "$blk" | sed 's/^0*//')
        [ -z "$blk_clean" ] && blk_clean="0"
        # Check if the blocked issue's "Depends On" field contains this issue
        deps_of_blk=$(get_depends "$blk_clean")
        found=0
        for d in $deps_of_blk; do
            d_clean=$(echo "$d" | sed 's/^0*//')
            [ -z "$d_clean" ] && d_clean="0"
            if [ "$d_clean" = "$issue_num" ]; then
                found=1
                break
            fi
        done
        if [ "$found" -eq 0 ]; then
            echo "  ⚠ Issue $issue_num blocks $blk_clean, but $blk_clean does not list $issue_num in Depends On"
            WARNINGS=$((WARNINGS + 1))
        fi
    done
done

# Check for too many dependencies
echo ""
echo "Checking dependency count..."
for issue_num in $ALL_ISSUES; do
    deps=$(get_depends "$issue_num")
    dep_count=0
    for _ in $deps; do
        dep_count=$((dep_count + 1))
    done
    if [ "$dep_count" -gt 3 ]; then
        echo "  ⚠ Issue $issue_num has $dep_count dependencies (consider restructuring)"
        WARNINGS=$((WARNINGS + 1))
    fi
done

# Check for missing status
echo ""
echo "Checking issue status..."
for file in $ISSUE_FILES; do
    filename=$(basename "$file")
    if ! grep -qi "Status:" "$file"; then
        echo "  ⚠ Missing status in $filename"
        WARNINGS=$((WARNINGS + 1))
    fi
done

# Check for issues without tests
echo ""
echo "Checking test requirements..."
for file in $ISSUE_FILES; do
    filename=$(basename "$file")
    if ! grep -qi "Tests Required\|Unit Tests\|Integration Tests" "$file"; then
        echo "  ⚠ No tests section in $filename"
        WARNINGS=$((WARNINGS + 1))
    fi
done

# Generate dependency visualization (text-based)
echo ""
echo "Dependency Graph:"
echo "-----------------"
for issue_num in $(echo "$ALL_ISSUES" | tr ' ' '\n' | sort -n); do
    deps=$(get_depends "$issue_num")
    blocks=$(get_blocks "$issue_num")

    if [ -n "$deps" ]; then
        deps_str=$(echo "$deps" | tr '\n' ',' | sed 's/,$//' | sed 's/,,*/,/g')
        echo "  [$issue_num] <- depends on: $deps_str"
    fi

    if [ -n "$blocks" ]; then
        blocks_str=$(echo "$blocks" | tr '\n' ',' | sed 's/,$//' | sed 's/,,*/,/g')
        echo "  [$issue_num] -> blocks: $blocks_str"
    fi

    if [ -z "$deps" ] && [ -z "$blocks" ]; then
        echo "  [$issue_num] (no dependencies)"
    fi
done

# Count total issues
ISSUE_COUNT=0
for _ in $ALL_ISSUES; do
    ISSUE_COUNT=$((ISSUE_COUNT + 1))
done

# Summary
echo ""
echo "========================================="
echo "Dependency Check Summary"
echo "========================================="
echo "Issues found: $ISSUE_COUNT"
echo "Errors:       $ERRORS"
echo "Warnings:     $WARNINGS"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "Found $ERRORS dependency error(s). Please fix before proceeding."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo ""
    echo "Found $WARNINGS warning(s). Consider addressing."
    exit 0
else
    echo ""
    echo "All dependencies look valid!"
    exit 0
fi
