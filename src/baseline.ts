import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildIndex } from "./indexer.js";
import { tokenize } from "./retrieval/tokenize.js";
import { estimateTokens } from "./token-estimator.js";

export interface BaselineResult {
  path: string;
  score: number;
  estimatedTokens: number;
}

export async function lexicalFileBaseline(
  root: string,
  query: string,
  topK = 5,
  excludedPaths: string[] = []
): Promise<BaselineResult[]> {
  const index = await buildIndex(root);
  const excluded = new Set(excludedPaths);
  const terms = [...new Set(tokenize(query))];
  const byPath = new Map<string, number>();

  for (const chunk of index.chunks) {
    if (excluded.has(chunk.path)) continue;
    const haystack = tokenize(`${chunk.path} ${chunk.symbol ?? ""} ${chunk.text}`);
    const unique = new Set(haystack);
    let score = 0;
    for (const term of terms) {
      if (unique.has(term)) score += 1;
    }
    if (score > 0) byPath.set(chunk.path, Math.max(byPath.get(chunk.path) ?? 0, score));
  }

  const ranked = [...byPath.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, Math.max(1, topK));

  return Promise.all(ranked.map(async ([relativePath, score]) => {
    const content = await readFile(path.join(root, relativePath), "utf8");
    return { path: relativePath, score, estimatedTokens: estimateTokens(content) };
  }));
}
