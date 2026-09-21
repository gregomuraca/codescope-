# Product definition

## Problem

Coding agents spend context and time discovering where behavior is implemented. Exact search is efficient when the symbol is known, but weaker when the agent knows the intent and not the implementation vocabulary.

## Product hypothesis

CodeScope can reduce repository-discovery context while preserving or improving retrieval quality by using a two-stage pipeline:

1. cheap local candidate retrieval;
2. optional semantic reranking of only the best candidates.

The product is successful only when quality is maintained. Fewer tokens with worse retrieval is a failure.

## Primary user

Developers using coding agents through MCP, or developers searching unfamiliar repositories from a terminal.

## V0.1 scope

- Git-aware repository file discovery.
- Automatic sensitive-path and generated-artifact exclusion.
- Incremental local chunk cache.
- Heuristic structural chunking.
- BM25-style local candidate retrieval.
- Optional embedding reranking through an OpenAI-compatible embeddings endpoint.
- CLI search.
- MCP `semantic_search_code` tool.
- Reproducible benchmark harness with quality gating and estimated context-token comparison.

## Explicit non-goals for V0.1

- No vector database.
- No repository-wide precomputed embedding index.
- No `inspect` command.
- No generated answer about the codebase; CodeScope returns source evidence.
- No claim of model-exact token accounting.
- No claim that the self-benchmark represents real-world agent performance.

## Success metrics

Quality is evaluated before efficiency:

- Recall@5
- mean reciprocal rank (MRR)
- baseline Recall@5 and MRR
- estimated context tokens returned
- estimated token savings versus the baseline
- search latency

The benchmark quality gate passes only when CodeScope Recall@5 and MRR are not lower than the baseline.
