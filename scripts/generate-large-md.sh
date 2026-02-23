#!/usr/bin/env bash
#
# Generate a large markdown file for performance testing.
#
# Usage:
#   ./scripts/generate-large-md.sh [LINE_COUNT] [OUTPUT_FILE]
#
# Defaults:
#   LINE_COUNT  = 10000
#   OUTPUT_FILE = test/fixtures/large-test.md
#
# The template block (~120 lines) exercises every supported markdown feature.
# It is repeated until the target line count is reached.

set -euo pipefail

TARGET_LINES="${1:-10000}"
OUTPUT="${2:-test/fixtures/large-test.md}"

mkdir -p "$(dirname "$OUTPUT")"

# ---------------------------------------------------------------------------
# Template block — covers all supported markdown features (~120 lines)
# ---------------------------------------------------------------------------
generate_template() {
  local n="$1"  # repetition number (1-based)
  cat <<BLOCK
---

# Heading 1 — Section ${n}

## Heading 2 — Subsection ${n}.1

### Heading 3 — Topic ${n}.1.1

#### Heading 4

##### Heading 5

###### Heading 6

This is a regular paragraph in section ${n}. It contains **bold text**, *italic text*, ~~strikethrough~~, and \`inline code\`. Here is a [link to example](https://example.com/${n}) and some <mark>highlighted text</mark> for good measure.

Another paragraph with mixed formatting: **bold and *nested italic*** plus ~~strikethrough with \`code inside\`~~. This tests inline mark combinations that the parser must handle correctly.

A third paragraph to add density. Performance testing requires realistic content distribution — most real documents are paragraph-heavy with occasional structural elements interspersed.

---

- Bullet item ${n}.1
- Bullet item ${n}.2 with **bold**
  - Nested bullet ${n}.2.1
  - Nested bullet ${n}.2.2
    - Deeply nested ${n}.2.2.1
- Bullet item ${n}.3

1. Ordered item ${n}.1
2. Ordered item ${n}.2
   1. Nested ordered ${n}.2.1
   2. Nested ordered ${n}.2.2
3. Ordered item ${n}.3 with *italic*

- [x] Completed task ${n}.1
- [ ] Pending task ${n}.2
- [ ] Pending task ${n}.3 with \`code\`
  - [x] Nested completed ${n}.3.1
  - [ ] Nested pending ${n}.3.2

> This is a blockquote in section ${n}.
> It spans multiple lines to test paragraph wrapping
> inside quoted blocks.
>
> Second paragraph inside the blockquote.

> [!note] Note — Section ${n}
> This is a note callout. It provides supplementary information
> that the reader might find useful.

> [!tip] Tip
> A helpful tip for section ${n}. Tips are rendered with
> a distinct color and icon.

> [!warning] Warning
> Be careful with section ${n}. Warnings highlight potential
> issues that could cause problems.

> [!danger] Danger
> Critical issue in section ${n}. This callout type is for
> the most severe warnings.

> [!info] Information
> General information callout for section ${n}.

> [!example] Example ${n}
> Here is an example demonstrating a concept.

> [!quote] Quote
> "A quoted passage relevant to section ${n}."

> [!abstract] Abstract
> Summary of key points in section ${n}.

\`\`\`typescript
// Code block ${n} — TypeScript
interface Section${n}Config {
  id: number;
  name: string;
  enabled: boolean;
}

function processSection${n}(config: Section${n}Config): void {
  const { id, name, enabled } = config;
  if (!enabled) return;
  console.log(\`Processing section \${id}: \${name}\`);
}
\`\`\`

\`\`\`python
# Code block ${n} — Python
def process_section_${n}(data: dict) -> None:
    """Process section ${n} data."""
    for key, value in data.items():
        print(f"Section ${n} — {key}: {value}")
\`\`\`

| Column A | Column B | Column C |
|----------|----------|----------|
| Row ${n}.1 A | Row ${n}.1 B | Row ${n}.1 C |
| Row ${n}.2 A | Row ${n}.2 B | Row ${n}.2 C |
| Row ${n}.3 A | **Bold cell** | \`code cell\` |

![Alt text for image ${n}](https://example.com/image-${n}.png)

Paragraph after image ${n}. This ensures proper spacing between block-level elements. The serializer must maintain blank lines between different block types.

A final paragraph for section ${n} to round out the template. The next section follows after the horizontal rule below.

BLOCK
}

# ---------------------------------------------------------------------------
# Generate the file
# ---------------------------------------------------------------------------

# Frontmatter (once at the top)
{
  cat <<'FRONT'
---
title: Large Performance Test Document
description: Auto-generated file for scroll and rendering performance testing
tags: [test, performance, large-file]
date: 2026-01-01
---

# Performance Test Document

This document is auto-generated for testing editor performance with large files. It exercises every supported markdown feature across many repeated sections.

FRONT

  # Calculate how many template repetitions we need.
  # Each template is ~120 lines. The frontmatter is ~10 lines.
  TEMPLATE_LINES=110
  HEADER_LINES=10
  REMAINING=$((TARGET_LINES - HEADER_LINES))
  if [ "$REMAINING" -lt "$TEMPLATE_LINES" ]; then
    REMAINING="$TEMPLATE_LINES"
  fi
  REPS=$(( (REMAINING + TEMPLATE_LINES - 1) / TEMPLATE_LINES ))

  for i in $(seq 1 "$REPS"); do
    generate_template "$i"
  done
} > "$OUTPUT"

ACTUAL_LINES=$(wc -l < "$OUTPUT")
echo "Generated ${OUTPUT} — ${ACTUAL_LINES} lines (target: ${TARGET_LINES}, ${REPS} sections)"
