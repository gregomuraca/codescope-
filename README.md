# CodeScope

**Quality-first semantic code retrieval for AI coding agents.**

CodeScope helps an agent find *where behavior lives* without reading broad parts of a repository. It narrows the repository locally, then optionally reranks only the best candidates with embeddings. It returns exact source excerpts, file paths, symbols, and line ranges.

> Status: `0.1.0` foundation. The implementation is usable, but the benchmark dataset is still a smoke test. Do not treat current self-benchmark results as evidence of general superiority.

## Why

Exact search is excellent when you already know the symbol:

```bash
rg "createCheckoutSession"
```

CodeScope targets a different question:

```bash
codescope search "Where is the checkout session connected to the logged-in user?"
```

The product objective is not merely fewer tokens. **Retrieval quality is the gate; context reduction is the optimization.**

## Architecture

```text
repository
   |
   v
Git-aware discovery + always-on exclusions
   |
   v
incremental local chunk cache
   |
   v
structural chunks
   |
   v
BM25 candidate retrieval
   |
   +---------- no embeddings ----------> ranked excerpts
   |
   +---------- embeddings configured --> semantic rerank --> ranked excerpts
```

There is no vector database in V0.1 and no `inspect` command.

## Install from source

Requirements: Node.js 20+ and Git.

```bash
git clone https://github.com/gregomuraca/codescope.git
cd codescope
npm install
npm run build
npm link
```

Then, from another Git repository:

```bash
codescope search "where is authentication handled?"
```

Machine-readable output:

```bash
codescope search "where is authentication handled?" --json
```

## Semantic reranking

Without configuration, `--mode auto` uses local lexical retrieval. To enable semantic reranking, point CodeScope at an embeddings endpoint that accepts an OpenAI-compatible `{ model, input }` request shape:

```bash
export CODESCOPE_EMBEDDINGS_URL="http://localhost:11434/v1/embeddings"
export CODESCOPE_EMBEDDINGS_MODEL="your-embedding-model"

codescope search "where do we invalidate expired sessions?"
```

For a non-local endpoint, CodeScope fails closed unless remote code processing is explicitly allowed:

```bash
export CODESCOPE_ALLOW_REMOTE=1
export CODESCOPE_EMBEDDINGS_URL="https://provider.example/v1/embeddings"
export CODESCOPE_EMBEDDINGS_MODEL="model-name"
export CODESCOPE_EMBEDDINGS_API_KEY="..."
```

CodeScope automatically excludes common credential files, private keys, dependencies, build output, and caches. That reduces risk but **cannot guarantee that ordinary source files contain no secrets**. Remote processing remains an explicit user decision.

## MCP

Start the stdio MCP server from the repository you want to search:

```bash
codescope mcp --root /absolute/path/to/repository
```

It exposes one V0.1 tool:

```text
semantic_search_code(query, max_results?, mode?)
```

The response contains exact source excerpts. CodeScope does not generate an explanation of the repository; the coding agent decides what the evidence means.

## Benchmark

```bash
npm run build
node dist/cli.js benchmark --root . --suite benchmarks/self.json --mode lexical --output benchmark-result.json
```

Reported metrics: Recall@5, mean reciprocal rank (MRR), baseline Recall@5/MRR, estimated context tokens, estimated token savings, and a quality-gate pass/fail.

Token counts are deliberately labeled **estimated**. V0.1 uses `ceil(characters / 4)` as a model-agnostic comparison metric.

The quality gate passes only when CodeScope's Recall@5 and MRR are at least as high as the baseline. Token savings with worse retrieval are treated as a failure.

See [`docs/BENCHMARK.md`](docs/BENCHMARK.md) for methodology and limitations.

## Development

```bash
npm install
npm run check
npm run dev -- search "where is semantic ranking implemented?"
```

Key documentation:

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — problem, hypothesis, scope, success criteria
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — runtime design and data handling
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — architecture decisions
- [`docs/BENCHMARK.md`](docs/BENCHMARK.md) — evaluation methodology

## V0.1 limitations

- Structural chunking is heuristic, not AST-based.
- Semantic reranking depends on a configured embeddings endpoint.
- Embeddings are computed only for the candidate set and are not yet cached.
- The self-benchmark is too small for external performance claims.
- The baseline approximates repository exploration; it does not measure actual Codex or Claude token billing.

These limitations are intentional: the project will add complexity only where benchmark evidence supports it.

## License

MIT
