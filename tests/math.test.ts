import { describe, expect, it } from "vitest";
import { cosineSimilarity, normalizeScores } from "../src/retrieval/math.js";

describe("retrieval math", () => {
  it("computes cosine similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("normalizes equal positive scores safely", () => {
    expect(normalizeScores([2, 2])).toEqual([1, 1]);
  });
});
