const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "by",
  "do", "does", "for", "from", "how", "in", "into", "is", "it", "its",
  "of", "on", "or", "our", "that", "the", "these", "this", "those", "to",
  "we", "what", "when", "where", "which", "who", "why", "with", "you", "your"
]);

export function tokenize(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .flatMap((token) => token.split("_"))
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}
