import path from "node:path";

const BLOCKED_SEGMENTS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "vendor",
  "target",
  ".terraform",
  ".cache"
]);

const BLOCKED_FILE_PATTERNS = [
  /^\.env(?:\.|$)/i,
  /(?:^|\.)pem$/i,
  /(?:^|\.)key$/i,
  /(?:^|\.)p12$/i,
  /(?:^|\.)pfx$/i,
  /^id_(?:rsa|dsa|ecdsa|ed25519)$/i,
  /credentials?/i,
  /secrets?\.(?:json|ya?ml|toml|ini)$/i,
  /service[-_]?account.*\.json$/i
];

const ALLOWED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".rb", ".go", ".rs", ".java", ".kt", ".kts",
  ".c", ".h", ".cc", ".cpp", ".hpp", ".cs", ".swift",
  ".php", ".scala", ".sh", ".bash", ".zsh", ".fish",
  ".sql", ".graphql", ".gql", ".html", ".css", ".scss",
  ".vue", ".svelte", ".astro", ".md", ".mdx", ".json",
  ".jsonc", ".yaml", ".yml", ".toml", ".xml", ".proto"
]);

const ALLOWED_EXTENSIONLESS = new Set([
  "dockerfile", "makefile", "procfile", "gemfile", "rakefile"
]);

export function isEligiblePath(relativePath: string): boolean {
  const normalized = relativePath.replaceAll("\\", "/");
  const segments = normalized.split("/");
  if (segments.some((segment) => BLOCKED_SEGMENTS.has(segment))) return false;

  const base = path.basename(normalized);
  if (BLOCKED_FILE_PATTERNS.some((pattern) => pattern.test(base))) return false;

  const extension = path.extname(base).toLowerCase();
  if (extension) return ALLOWED_EXTENSIONS.has(extension);
  return ALLOWED_EXTENSIONLESS.has(base.toLowerCase());
}

export function assertRemoteEndpointAllowed(endpoint: string): void {
  const url = new URL(endpoint);
  const host = url.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";

  if (!isLocal && process.env.CODESCOPE_ALLOW_REMOTE !== "1") {
    throw new Error(
      "Remote semantic endpoint blocked. Set CODESCOPE_ALLOW_REMOTE=1 only after you accept that eligible code excerpts may leave this machine."
    );
  }
}
