# CI Benchmark Regression Gate

| Field          | Value                        |
|----------------|------------------------------|
| **Status**     | BACKLOG                      |
| **Priority**   | P2                           |
| **Tags**       | infrastructure, performance, testing |
| **Related**    | [performance-improvements](../design-docs/performance-improvements.md) |
| **Created**    | 2026-02-21                   |

## Problem

The performance benchmark system (`npm run bench`) was implemented but only measures performance — it doesn't compare against a stored baseline or block CI on regressions. This means performance degradations can slip in undetected. The `test/benchmarks/baseline.json` file exists but is still a stub.

Currently, a developer could introduce a change that doubles parse time and nothing would catch it until users report lag.

## Desired Outcome

When a developer pushes code:
1. CI runs the benchmark suite automatically
2. Results are compared against a stored baseline
3. If any metric (parse time, serialize time, roundtrip time) regresses by >10%, the CI build **fails** with a clear message showing which metric regressed and by how much
4. A command like `npm run bench:update-baseline` lets developers intentionally update the baseline when a known-slower change is acceptable

## Scope & Boundaries

**In scope:**
- Populate `baseline.json` with current benchmark results
- Script to compare current run against baseline
- CI step that fails on >10% regression
- Command to update baseline intentionally

**Out of scope:**
- Historical performance tracking over time
- Performance dashboards or visualizations
- Alerting or notifications beyond CI failure

## Open Questions

- Should the comparison use median or p99 values?
- Should we use 5 runs and take median to reduce flakiness?

## Notes

- Current benchmark results: parse ~1000 lines in 0.51ms, serialize in 0.08ms, roundtrip in 0.54ms
- The benchmark infrastructure (`vitest bench`) is already in place at `test/benchmarks/benchmark.bench.ts`
- Reference document: `test/benchmarks/reference-document.md` (1,026 lines)
