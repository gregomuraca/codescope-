# Benchmark methodology

## Purpose

The benchmark tests the core hypothesis: CodeScope should reduce context while preserving retrieval quality.

## Test-case format

```json
{
  "id": "checkout-session",
  "query": "Where is the Stripe checkout session created?",
  "expectedPaths": ["src/api/checkout.ts"]
}
```

Each case contains a natural-language information need and one or more accepted source paths.

## Strategies

### CodeScope

Returns the top five source chunks using lexical retrieval and, when configured, semantic reranking.

### Baseline

Uses query-term matching to identify five files and counts the full content of those files as context. This is a deliberately simple comparison baseline, not a simulation of any specific coding agent.

## Metrics

- **Recall@5:** fraction of cases where any accepted path appears in the first five results.
- **MRR:** mean reciprocal rank of the first accepted path.
- **Estimated context tokens:** `ceil(characters / 4)` for returned content.
- **Estimated token savings:** reduction in CodeScope context relative to baseline context.

## Quality gate

`qualityGatePass = true` only when:

```text
CodeScope Recall@5 >= baseline Recall@5
AND
CodeScope MRR >= baseline MRR
```

This prevents a smaller context window from being presented as a success when retrieval is worse.

## Limitations

The included self-suite is a smoke benchmark. It is small, authored against this repository, and susceptible to overfitting. Before making comparative product claims, add externally defined tasks across multiple unfamiliar repositories and report confidence intervals or, at minimum, raw per-case results.
