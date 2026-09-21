import { performance } from "node:perf_hooks";
import { buildIndex } from "./indexer.js";
import { providerFromEnvironment } from "./providers/embeddings.js";
import { rankBm25 } from "./retrieval/bm25.js";
import { cosineSimilarity, normalizeScores } from "./retrieval/math.js";
import { estimateTokens } from "./token-estimator.js";
import type { SearchOptions, SearchResponse, SearchResult } from "./types.js";

export async function searchCode(options: SearchOptions): Promise<SearchResponse> {
  const started = performance.now();
  const topK = Math.max(1, options.topK ?? 8);
  const candidateK = Math.max(topK, options.candidateK ?? 40);
  const requestedMode = options.mode ?? "auto";
  const index = await buildIndex(options.root);
  const excluded = new Set(options.excludedPaths ?? []);
  const eligibleChunks = excluded.size === 0
    ? index.chunks
    : index.chunks.filter((chunk) => !excluded.has(chunk.path));
  const lexical = rankBm25(options.query, eligibleChunks, candidateK);
  const provider = requestedMode === "lexical" ? null : providerFromEnvironment();

  if (requestedMode === "semantic" && !provider) {
    throw new Error(
      "Semantic mode requires CODESCOPE_EMBEDDINGS_URL. Use --mode lexical or configure an embeddings endpoint."
    );
  }

  let mode: "lexical" | "semantic" = "lexical";
  let results: SearchResult[];

  if (provider && lexical.length > 0) {
    mode = "semantic";
    const inputs = [
      options.query,
      ...lexical.map(({ chunk }) => `${chunk.path}\n${chunk.symbol ?? ""}\n${chunk.text}`)
    ];
    const embeddings = await provider.embed(inputs);
    const queryEmbedding = embeddings[0] ?? [];
    const semantic = lexical.map((_, index) => cosineSimilarity(queryEmbedding, embeddings[index + 1] ?? []));
    const lexicalNormalized = normalizeScores(lexical.map((item) => item.score));
    const semanticNormalized = normalizeScores(semantic);

    results = lexical.map(({ chunk, score }, index) => {
      const semanticScore = semantic[index] ?? 0;
      const combined = 0.3 * (lexicalNormalized[index] ?? 0) + 0.7 * (semanticNormalized[index] ?? 0);
      return {
        ...chunk,
        lexicalScore: score,
        semanticScore,
        score: combined,
        estimatedTokens: estimateTokens(chunk.text)
      };
    });
    results.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
    results = results.slice(0, topK);
  } else {
    results = lexical.slice(0, topK).map(({ chunk, score }) => ({
      ...chunk,
      lexicalScore: score,
      score,
      estimatedTokens: estimateTokens(chunk.text)
    }));
  }

  return {
    query: options.query,
    mode,
    root: index.root,
    ...index.stats,
    durationMs: Math.round((performance.now() - started) * 100) / 100,
    estimatedContextTokens: results.reduce((sum, result) => sum + result.estimatedTokens, 0),
    results
  };
}
