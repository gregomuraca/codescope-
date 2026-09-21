import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { searchCode } from "./search.js";

export async function runMcpServer(root: string): Promise<void> {
  const server = new McpServer({ name: "codescope", version: "0.1.0" });

  server.tool(
    "semantic_search_code",
    "Find relevant source-code excerpts by behavior or intent. Returns exact repository text with paths and line ranges.",
    {
      query: z.string().min(2).describe("Natural-language description of the code or behavior to find."),
      max_results: z.number().int().min(1).max(20).optional().describe("Maximum number of source excerpts to return."),
      mode: z.enum(["auto", "lexical", "semantic"]).optional().describe("auto uses semantic ranking when an embeddings endpoint is configured.")
    },
    async ({ query, max_results, mode }) => {
      const result = await searchCode({
        root,
        query,
        topK: max_results ?? 8,
        mode: mode ?? "auto"
      });

      const payload = {
        query: result.query,
        mode: result.mode,
        estimatedContextTokens: result.estimatedContextTokens,
        durationMs: result.durationMs,
        results: result.results.map((item) => ({
          path: item.path,
          symbol: item.symbol,
          startLine: item.startLine,
          endLine: item.endLine,
          score: item.score,
          excerpt: item.text
        }))
      };

      return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
