#!/bin/bash
# Validate design document structure
# Usage: validate-design-doc.sh <path-to-design-doc.md>

set -euo pipefail

if [ $# -eq 0 ]; then
    echo "Usage: validate-design-doc.sh <path-to-design-doc.md>"
    exit 1
fi

DOC_PATH="$1"

if [ ! -f "$DOC_PATH" ]; then
    echo "Error: File not found: $DOC_PATH"
    exit 1
fi

echo "Validating design document: $DOC_PATH"
echo "========================================="

ERRORS=0
WARNINGS=0

# Required sections
REQUIRED_SECTIONS=(
    "Problem Statement"
    "Goals"
    "Non-Goals"
    "Proposed Solution"
    "Alternative"
    "Security"
    "Testing"
    "Rollout"
    "Dependencies"
    "Risks"
)

# Check for required sections
echo ""
echo "Checking required sections..."
for section in "${REQUIRED_SECTIONS[@]}"; do
    if grep -qi "## .*${section}" "$DOC_PATH" || grep -qi "### .*${section}" "$DOC_PATH"; then
        echo "  ✓ Found: $section"
    else
        echo "  ✗ Missing: $section"
        ((ERRORS++))
    fi
done

# Check for metadata
echo ""
echo "Checking metadata..."
if grep -qi "Status:" "$DOC_PATH"; then
    STATUS=$(grep -i "Status:" "$DOC_PATH" | head -1)
    echo "  ✓ Status found: $STATUS"
else
    echo "  ✗ Missing: Status field"
    ((ERRORS++))
fi

if grep -qi "Author:" "$DOC_PATH"; then
    echo "  ✓ Author found"
else
    echo "  ✗ Missing: Author field"
    ((ERRORS++))
fi

if grep -qi "Created:" "$DOC_PATH" || grep -qi "Date:" "$DOC_PATH"; then
    echo "  ✓ Date found"
else
    echo "  ⚠ Warning: No creation date"
    ((WARNINGS++))
fi

# Check for vague language
echo ""
echo "Checking for vague language..."
VAGUE_PATTERNS=(
    "improve performance"
    "make it faster"
    "handle errors gracefully"
    "support large"
    "make it secure"
    "as needed"
    "when necessary"
    "etc\."
)

for pattern in "${VAGUE_PATTERNS[@]}"; do
    if grep -qi "$pattern" "$DOC_PATH"; then
        LINE=$(grep -ni "$pattern" "$DOC_PATH" | head -1)
        echo "  ⚠ Warning: Vague language found - '$pattern'"
        echo "    $LINE"
        ((WARNINGS++))
    fi
done

# Check for measurable goals
echo ""
echo "Checking for measurable goals..."
if grep -qiE "[0-9]+\s*(ms|seconds?|minutes?|hours?|%|percent|MB|GB|requests)" "$DOC_PATH"; then
    echo "  ✓ Found quantitative metrics"
else
    echo "  ⚠ Warning: No quantitative metrics found (consider adding specific numbers)"
    ((WARNINGS++))
fi

# Check for open questions
echo ""
echo "Checking open questions..."
if grep -qi "Open Questions" "$DOC_PATH"; then
    PENDING=$(grep -ci "PENDING\|TBD\|TODO" "$DOC_PATH" || echo "0")
    if [ "$PENDING" -gt 0 ]; then
        echo "  ⚠ Warning: $PENDING unresolved items found"
        ((WARNINGS++))
    else
        echo "  ✓ No unresolved items found"
    fi
else
    echo "  ⚠ Warning: No Open Questions section"
    ((WARNINGS++))
fi

# Summary
echo ""
echo "========================================="
echo "Validation Summary"
echo "========================================="
echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "❌ Document has $ERRORS error(s). Please address required sections."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo ""
    echo "⚠️  Document has $WARNINGS warning(s). Consider addressing before review."
    exit 0
else
    echo ""
    echo "✅ Document structure looks good!"
    exit 0
fi
