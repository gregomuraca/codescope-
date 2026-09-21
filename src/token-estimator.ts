/**
 * Model-agnostic estimate used only for relative benchmark comparisons.
 * It intentionally does not claim model-exact token accounting.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}
