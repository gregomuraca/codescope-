export function tokenize(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .flatMap((token) => token.split("_"))
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}
