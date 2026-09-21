#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import { runBenchmark } from "./benchmark.js";
import { formatSearch } from "./format.js";
import { runMcpServer } from "./mcp.js";
import { searchCode } from "./search.js";
import type { SearchMode } from "./types.js";

const program = new Command();
program
  .name("codescope")
  .description("Quality-first semantic code retrieval for AI coding agents.")
  .version("0.1.0");

program
  .command("search")
  .argument("<query>", "What behavior or implementation are you trying to find?")
  .option("-r, --root <path>", "Git repository root", ".")
  .option("-k, --top <number>", "Number of excerpts", "8")
  .option("--candidates <number>", "Lexical candidates before semantic reranking", "40")
  .option("--mode <mode>", "auto, lexical, or semantic", "auto")
  .option("--json", "Emit machine-readable JSON")
  .action(async (query: string, opts: Record<string, string | boolean>) => {
    const result = await searchCode({
      root: path.resolve(String(opts.root)),
      query,
      topK: Number(opts.top),
      candidateK: Number(opts.candidates),
      mode: String(opts.mode) as SearchMode
    });
    process.stdout.write(opts.json ? `${JSON.stringify(result, null, 2)}\n` : `${formatSearch(result)}\n`);
  });

program
  .command("benchmark")
  .requiredOption("--suite <path>", "Benchmark suite JSON")
  .option("-r, --root <path>", "Git repository root", ".")
  .option("--mode <mode>", "auto, lexical, or semantic", "auto")
  .option("--output <path>", "Write full benchmark result JSON")
  .action(async (opts: Record<string, string>) => {
    const summary = await runBenchmark({
      root: path.resolve(opts.root ?? "."),
      suitePath: path.resolve(opts.suite),
      mode: (opts.mode ?? "auto") as SearchMode,
      ...(opts.output ? { outputPath: path.resolve(opts.output) } : {})
    });
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    if (!summary.qualityGatePass) process.exitCode = 2;
  });

program
  .command("mcp")
  .option("-r, --root <path>", "Git repository root", ".")
  .action(async (opts: Record<string, string>) => {
    await runMcpServer(path.resolve(opts.root ?? "."));
  });

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`codescope: ${message}\n`);
  process.exitCode = 1;
});
