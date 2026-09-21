# Architecture decisions

## ADR-001 — Quality before token savings

**Status:** Accepted

A reduction in context is useful only if retrieval quality does not regress. Benchmark output therefore includes a `qualityGatePass` field. Token savings are not treated as a product win when Recall@5 or MRR fall below the baseline.

## ADR-002 — Hybrid retrieval instead of semantic scoring of the full repository

**Status:** Accepted

CodeScope first generates a small local candidate set, then optionally applies semantic ranking. This limits latency, provider cost, and the amount of source text that can leave the machine.

## ADR-003 — No `inspect` command

**Status:** Accepted

The normal workflow must not require a separate repository inspection step. Sensitive path filtering is always-on and remote semantic calls require explicit permission when the endpoint is not local.

## ADR-004 — No vector database in V0.1

**Status:** Accepted

A vector database adds synchronization and operational complexity before its value is proven. V0.1 caches structural chunks, then semantically evaluates only local candidates.

## ADR-005 — Heuristic structural chunking before Tree-sitter

**Status:** Accepted, revisit after benchmark

Tree-sitter can improve language-aware boundaries, but introduces grammar and native/runtime complexity. V0.1 establishes a measurable baseline first. Add AST chunking only if benchmark failure analysis shows chunk boundaries are a material quality constraint.

## ADR-006 — Estimated tokens are explicitly approximate

**Status:** Accepted

The benchmark uses `ceil(characters / 4)` as a model-agnostic comparison metric. Results must label this as estimated context, not exact model billing or exact agent token consumption.
