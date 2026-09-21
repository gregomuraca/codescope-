# Architecture

## Search path

```text
query
  |
  v
Git-aware scanner
  |
  v
incremental chunk cache
  |
  v
heuristic structural chunks
  |
  v
BM25 candidate retrieval (local)
  |
  +-----------------------+
  |                       |
  | no embeddings         | embeddings configured
  v                       v
ranked excerpts       candidate-only embeddings
                          |
                          v
                   cosine similarity
                          |
                          v
               30% lexical + 70% semantic
                          |
                          v
                    ranked excerpts
```

## Components

### `indexer.ts`

Uses `git ls-files -co --exclude-standard` so repository discovery follows Git's tracked/untracked and ignore behavior. Eligible text files are chunked and cached under the user's cache directory, not inside the target repository.

### `security.ts`

Applies deny rules before any content is eligible for semantic processing. Common secret files, private keys, dependency directories, generated output, and caches are excluded automatically. This replaces a separate `inspect` workflow, but it does not guarantee that secrets embedded in ordinary source files can never be sent to a remote provider.

### `chunker.ts`

V0.1 uses deterministic structural heuristics for common function, class, variable-function, and Markdown boundaries. Sections larger than the maximum chunk size are split with bounded overlap.

AST/Tree-sitter chunking is intentionally deferred until the benchmark shows that structural heuristics are the limiting factor.

### `bm25.ts`

Provides local candidate generation. Query terms are compared against path, symbol, and source text. Path and symbol matches receive small boosts.

### `providers/embeddings.ts`

Implements a minimal embeddings interface compatible with endpoints that accept `{ model, input }` and return indexed embeddings. Remote endpoints require explicit `CODESCOPE_ALLOW_REMOTE=1`; localhost is allowed without that flag.

### `search.ts`

Coordinates indexing, candidate retrieval, and optional semantic reranking. Semantic mode embeds only the query and lexical candidates, not the full repository.

### `benchmark.ts`

Evaluates CodeScope against a simple lexical file-level baseline. The baseline returns whole files, providing a conservative proxy for context that a coding agent might consume after locating candidate files.

## Data handling

- Repository cache: local only.
- Cache contents: source chunks and file metadata.
- Semantic remote calls: only when an endpoint is configured and remote use is explicitly allowed.
- Generated answers: none. Source excerpts remain the evidence boundary.
