import { describe, expect, it } from "vitest";
import { rankBm25 } from "../src/retrieval/bm25.js";
import type { CodeChunk } from "../src/types.js";

function chunk(path: string, symbol: string, text: string): CodeChunk {
  return { id: path, path, language: "ts", symbol, startLine: 1, endLine: 3, text, hash: path };
}

describe("rankBm25", () => {
  it("prioritizes the relevant session-expiry implementation", () => {
    const chunks = [
      chunk("src/auth/session.ts", "expireSession", "invalidate a user session when it reaches its expiry"),
      chunk("src/payments/stripe.ts", "createCheckout", "create a Stripe checkout session"),
      chunk("src/ui/button.tsx", "Button", "render a button")
    ];

    const ranked = rankBm25("where is session expiry handled", chunks, 3);
    expect(ranked[0]?.chunk.path).toBe("src/auth/session.ts");
  });
});
