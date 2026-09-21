import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { lexicalFileBaseline } from "./baseline.js";
import { searchCode } from "./search.js";
import type { SearchMode } from "./types.js";

export interface BenchmarkCase {
  id: string;
  query: string;
  expectedPaths: string[];
}

export interface BenchmarkSuite {
  name: string;
  cases: BenchmarkCase[];
}

export interface BenchmarkSummary {
  suite: string;
  cases: number;
  mode: "lexical" | "semantic";
  recallAt5: number;
  mrr: number;
  baselineRecallAt5: number;
  baselineMrr: number;
  contextTokens: number;
  baselineContextTokens: number;
  tokenSavingsPct: number;
  qualityGatePass: boolean;
  results: Array<{
    id: string;
    query: string;
    expectedPaths: string[];
    foundPaths: string[];
    baselinePaths: string[];
    reciprocalRank: number;
    baselineReciprocalRank: number;
    contextTokens: number;
    baselineContextTokens: number;
  }>;
}

function reciprocalRank(found: string[], expected: Set<string>): number {
  const rank = found.findIndex((item) => expected.has(item));
  return rank === -1 ? 0 : 1 / (rank + 1);
}

function hitAt(found: string[], expected: Set<string>, k: number): number {
  return found.slice(0, k).some((item) => expected.has(item)) ? 1 : 0;
}

export async function runBenchmark(options: {
  root: string;
  suitePath: string;
  mode?: SearchMode;
  outputPath?: string;
}): Promise<BenchmarkSummary> {
  const suite = JSON.parse(await readFile(options.suitePath, "utf8")) as BenchmarkSuite;
  if (!suite.name || !Array.isArray(suite.cases) || suite.cases.length === 0) {
    throw new Error("Benchmark suite must contain a name and at least one case.");
  }

  const rows: BenchmarkSummary["results"] = [];
  let effectiveMode: "lexical" | "semantic" = "lexical";

  for (const testCase of suite.cases) {
    const expected = new Set(testCase.expectedPaths);
    const search = await searchCode({
      root: options.root,
      query: testCase.query,
      mode: options.mode ?? "auto",
      topK: 5,
      candidateK: 40
    });
    effectiveMode = search.mode;
    const baseline = await lexicalFileBaseline(options.root, testCase.query, 5);
    const foundPaths = [...new Set(search.results.map((result) => result.path))];
    const baselinePaths = baseline.map((result) => result.path);

    rows.push({
      id: testCase.id,
      query: testCase.query,
      expectedPaths: testCase.expectedPaths,
      foundPaths,
      baselinePaths,
      reciprocalRank: reciprocalRank(foundPaths, expected),
      baselineReciprocalRank: reciprocalRank(baselinePaths, expected),
      contextTokens: search.estimatedContextTokens,
      baselineContextTokens: baseline.reduce((sum, result) => sum + result.estimatedTokens, 0)
    });
  }

  const divisor = rows.length;
  const recallAt5 = rows.reduce((sum, row) => sum + hitAt(row.foundPaths, new Set(row.expectedPaths), 5), 0) / divisor;
  const baselineRecallAt5 = rows.reduce((sum, row) => sum + hitAt(row.baselinePaths, new Set(row.expectedPaths), 5), 0) / divisor;
  const mrr = rows.reduce((sum, row) => sum + row.reciprocalRank, 0) / divisor;
  const baselineMrr = rows.reduce((sum, row) => sum + row.baselineReciprocalRank, 0) / divisor;
  const contextTokens = rows.reduce((sum, row) => sum + row.contextTokens, 0);
  const baselineContextTokens = rows.reduce((sum, row) => sum + row.baselineContextTokens, 0);
  const tokenSavingsPct = baselineContextTokens === 0
    ? 0
    : ((baselineContextTokens - contextTokens) / baselineContextTokens) * 100;

  const qualityGatePass = recallAt5 >= baselineRecallAt5 && mrr >= baselineMrr;
  const summary: BenchmarkSummary = {
    suite: suite.name,
    cases: divisor,
    mode: effectiveMode,
    recallAt5,
    mrr,
    baselineRecallAt5,
    baselineMrr,
    contextTokens,
    baselineContextTokens,
    tokenSavingsPct,
    qualityGatePass,
    results: rows
  };

  if (options.outputPath) {
    await writeFile(path.resolve(options.outputPath), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  }
  return summary;
}
