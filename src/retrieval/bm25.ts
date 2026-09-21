import path from "node:path";
import type { CodeChunk } from "../types.js";
import { tokenize } from "./tokenize.js";

export interface RankedChunk {
  chunk: CodeChunk;
  score: number;
}

function sourcePrior(filePath: string): number {
  const normalized = filePath.replaceAll("\\", "/").toLowerCase();
  const extension = path.extname(normalized);

  if (extension === ".md" || extension === ".mdx" || extension === ".rst" || extension === ".txt") {
    return 0.55;
  }
  if (/(^|\/)(test|tests|spec|specs|fixtures)(\/|$)/.test(normalized) || /\.(test|spec)\.[^.]+$/.test(normalized)) {
    return 0.8;
  }
  if (/(^|\/)(src|lib|app|packages)(\/|$)/.test(normalized)) {
    return 1.15;
  }
  return 1;
}

export function rankBm25(query: string, chunks: CodeChunk[], limit: number): RankedChunk[] {
  const queryTerms = [...new Set(tokenize(query))];
  if (queryTerms.length === 0 || chunks.length === 0) return [];

  const documents = chunks.map((chunk) => tokenize(`${chunk.path} ${chunk.symbol ?? ""} ${chunk.text}`));
  const lengths = documents.map((tokens) => tokens.length);
  const avgLength = Math.max(1, lengths.reduce((sum, n) => sum + n, 0) / lengths.length);
  const documentFrequency = new Map<string, number>();

  for (const tokens of documents) {
    const unique = new Set(tokens);
    for (const term of queryTerms) {
      if (unique.has(term)) documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const k1 = 1.2;
  const b = 0.75;
  const ranked: RankedChunk[] = chunks.map((chunk, index) => {
    const tokens = documents[index] ?? [];
    const frequencies = new Map<string, number>();
    for (const token of tokens) frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    let score = 0;

    for (const term of queryTerms) {
      const tf = frequencies.get(term) ?? 0;
      if (!tf) continue;
      const df = documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (chunks.length - df + 0.5) / (df + 0.5));
      const length = lengths[index] ?? 0;
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (length / avgLength))));
    }

    const pathTokens = tokenize(chunk.path);
    if (queryTerms.some((term) => pathTokens.includes(term))) score *= 1.15;

    const symbol = chunk.symbol;
    if (symbol && queryTerms.some((term) => tokenize(symbol).includes(term))) score *= 1.2;

    score *= sourcePrior(chunk.path);
    return { chunk, score };
  });

  return ranked
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.path.localeCompare(b.chunk.path))
    .slice(0, Math.max(1, limit));
}
