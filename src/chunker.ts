import { createHash } from "node:crypto";
import path from "node:path";
import type { CodeChunk } from "./types.js";

const START_PATTERNS: RegExp[] = [
  /^\s*(?:export\s+)?(?:async\s+)?function\s+([\w$]+)/,
  /^\s*(?:export\s+)?class\s+([\w$]+)/,
  /^\s*(?:export\s+)?(?:const|let|var)\s+([\w$]+)\s*=\s*(?:async\s*)?\(/,
  /^\s*(?:def|class)\s+([\w$]+)/,
  /^\s*(?:func|fn)\s+([\w$]+)/,
  /^\s*(?:public|private|protected|internal|static|final|abstract|async|override|virtual|sealed|synchronized|native|strictfp|transient|volatile|\s)+\s*[\w<>,.?\[\]]+\s+([\w$]+)\s*\(/,
  /^\s*#{1,6}\s+(.+)/
];

function languageFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return ext.slice(1) || path.basename(filePath).toLowerCase();
}

function symbolAt(line: string): string | undefined {
  for (const pattern of START_PATTERNS) {
    const match = line.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function chunkFile(
  relativePath: string,
  content: string,
  options: { maxLines?: number; overlapLines?: number } = {}
): CodeChunk[] {
  const maxLines = Math.max(20, options.maxLines ?? 120);
  const overlapLines = Math.min(Math.max(0, options.overlapLines ?? 10), Math.floor(maxLines / 3));
  const lines = content.split(/\r?\n/);
  const starts = new Set<number>([0]);

  for (let i = 0; i < lines.length; i += 1) {
    if (symbolAt(lines[i] ?? "")) starts.add(i);
  }

  const structuralStarts = [...starts].sort((a, b) => a - b);
  const chunks: CodeChunk[] = [];

  for (let s = 0; s < structuralStarts.length; s += 1) {
    const sectionStart = structuralStarts[s] ?? 0;
    const sectionEnd = structuralStarts[s + 1] ?? lines.length;
    let cursor = sectionStart;

    while (cursor < sectionEnd) {
      const end = Math.min(cursor + maxLines, sectionEnd);
      const text = lines.slice(cursor, end).join("\n").trimEnd();
      if (text.trim()) {
        const symbol = symbolAt(lines[sectionStart] ?? "");
        const chunkHash = hash(`${relativePath}:${cursor + 1}:${end}:${text}`);
        chunks.push({
          id: chunkHash.slice(0, 20),
          path: relativePath,
          language: languageFor(relativePath),
          ...(symbol ? { symbol } : {}),
          startLine: cursor + 1,
          endLine: end,
          text,
          hash: chunkHash
        });
      }
      if (end >= sectionEnd) break;
      cursor = Math.max(cursor + 1, end - overlapLines);
    }
  }

  return chunks;
}
