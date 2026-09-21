import { describe, expect, it } from "vitest";
import { chunkFile } from "../src/chunker.js";

describe("chunkFile", () => {
  it("keeps structural symbols and line ranges", () => {
    const source = [
      "export function alpha() {",
      "  return 1;",
      "}",
      "",
      "export function beta() {",
      "  return 2;",
      "}"
    ].join("\n");

    const chunks = chunkFile("src/example.ts", source, { maxLines: 20 });
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({ symbol: "alpha", startLine: 1, endLine: 4 });
    expect(chunks[1]).toMatchObject({ symbol: "beta", startLine: 5, endLine: 7 });
  });
});
