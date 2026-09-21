import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { chunkFile } from "./chunker.js";
import { isEligiblePath } from "./security.js";
import type { CodeChunk, RepositoryIndex } from "./types.js";

const execFileAsync = promisify(execFile);
const CACHE_VERSION = 1;
const MAX_FILE_BYTES = 512 * 1024;

interface CacheEntry {
  mtimeMs: number;
  size: number;
  chunks: CodeChunk[];
}

interface CacheFile {
  version: number;
  files: Record<string, CacheEntry>;
}

function cachePath(root: string): string {
  const key = createHash("sha256").update(path.resolve(root)).digest("hex").slice(0, 20);
  const base = process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
  return path.join(base, "codescope", key, "index-v1.json");
}

async function readCache(root: string): Promise<CacheFile> {
  try {
    const parsed = JSON.parse(await readFile(cachePath(root), "utf8")) as CacheFile;
    if (parsed.version === CACHE_VERSION && parsed.files) return parsed;
  } catch {
    // Missing or invalid cache is equivalent to an empty cache.
  }
  return { version: CACHE_VERSION, files: {} };
}

async function writeCache(root: string, cache: CacheFile): Promise<void> {
  const target = cachePath(root);
  await mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(cache), "utf8");
  await rename(tmp, target);
}

async function gitTrackedAndUntracked(root: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", root, "ls-files", "-co", "--exclude-standard", "-z"],
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
    );
    return stdout.split("\0").filter(Boolean);
  } catch (error) {
    throw new Error(`CodeScope requires a Git working tree: ${String(error)}`);
  }
}

function looksBinary(buffer: Buffer): boolean {
  const length = Math.min(buffer.length, 8192);
  for (let i = 0; i < length; i += 1) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

export async function buildIndex(rootInput: string): Promise<RepositoryIndex> {
  const root = path.resolve(rootInput);
  const files = (await gitTrackedAndUntracked(root)).filter(isEligiblePath);
  const previous = await readCache(root);
  const next: CacheFile = { version: CACHE_VERSION, files: {} };
  const chunks: CodeChunk[] = [];
  let cacheHits = 0;
  let cacheMisses = 0;
  let scannedFiles = 0;

  for (const relativePath of files) {
    const absolutePath = path.join(root, relativePath);
    let info;
    try {
      info = await stat(absolutePath);
    } catch {
      continue;
    }
    if (!info.isFile() || info.size > MAX_FILE_BYTES) continue;

    scannedFiles += 1;
    const cached = previous.files[relativePath];
    if (cached && cached.mtimeMs === info.mtimeMs && cached.size === info.size) {
      next.files[relativePath] = cached;
      chunks.push(...cached.chunks);
      cacheHits += 1;
      continue;
    }

    const buffer = await readFile(absolutePath);
    if (looksBinary(buffer)) continue;
    const fileChunks = chunkFile(relativePath, buffer.toString("utf8"));
    const entry: CacheEntry = { mtimeMs: info.mtimeMs, size: info.size, chunks: fileChunks };
    next.files[relativePath] = entry;
    chunks.push(...fileChunks);
    cacheMisses += 1;
  }

  await writeCache(root, next);
  return {
    root,
    chunks,
    stats: { scannedFiles, chunks: chunks.length, cacheHits, cacheMisses }
  };
}
