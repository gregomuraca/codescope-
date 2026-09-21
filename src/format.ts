import type { SearchResponse } from "./types.js";

export function formatSearch(response: SearchResponse): string {
  const lines = [
    `CodeScope · ${response.mode} · ${response.durationMs} ms`,
    `${response.scannedFiles} files · ${response.chunks} chunks · ~${response.estimatedContextTokens} context tokens`,
    ""
  ];

  response.results.forEach((result, index) => {
    const symbol = result.symbol ? ` · ${result.symbol}` : "";
    lines.push(`${index + 1}. ${result.path}:${result.startLine}-${result.endLine}${symbol}`);
    lines.push(`   score=${result.score.toFixed(4)} · ~${result.estimatedTokens} tokens`);
    lines.push(result.text.split("\n").map((line) => `   ${line}`).join("\n"));
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}
