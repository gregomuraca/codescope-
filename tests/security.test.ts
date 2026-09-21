import { describe, expect, it } from "vitest";
import { isEligiblePath } from "../src/security.js";

describe("isEligiblePath", () => {
  it("blocks credentials and build artifacts without a separate inspect step", () => {
    expect(isEligiblePath(".env")).toBe(false);
    expect(isEligiblePath("config/service-account-prod.json")).toBe(false);
    expect(isEligiblePath("node_modules/pkg/index.js")).toBe(false);
    expect(isEligiblePath("src/search.ts")).toBe(true);
  });
});
