export type SearchMode = "auto" | "lexical" | "semantic";

export interface CodeChunk {
  id: string;
  path: string;
  language: string;
  symbol?: string;
  startLine: number;
  endLine: number;
  text: string;
  hash: string;
}

export interface SearchResult extends CodeChunk {
  lexicalScore: number;
  semanticScore?: number;
  score: number;
  estimatedTokens: number;
}

export interface SearchOptions {
  root: string;
  query: string;
  topK?: number;
  candidateK?: number;
  mode?: SearchMode;
  excludedPaths?: string[];
}

export interface SearchResponse {
  query: string;
  mode: "lexical" | "semantic";
  root: string;
  scannedFiles: number;
  chunks: number;
  cacheHits: number;
  cacheMisses: number;
  durationMs: number;
  estimatedContextTokens: number;
  results: SearchResult[];
}

export interface IndexStats {
  scannedFiles: number;
  chunks: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface RepositoryIndex {
  root: string;
  chunks: CodeChunk[];
  stats: IndexStats;
}
