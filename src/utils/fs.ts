import { mkdir, readFile, writeFile, rm, readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';

/**
 * Ensure directory exists
 */
export async function ensureDir(path: string): Promise<void> {
  if (!existsSync(path)) {
    await mkdir(path, { recursive: true });
  }
}

/**
 * Read JSON file
 */
export async function readJSON<T>(path: string): Promise<T> {
  const content = await readFile(path, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Write JSON file
 */
export async function writeJSON(path: string, data: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Remove directory recursively
 */
export async function removeDir(path: string): Promise<void> {
  if (existsSync(path)) {
    await rm(path, { recursive: true, force: true });
  }
}

/**
 * Get all files in directory recursively
 */
export async function getAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentPath: string, basePath: string) {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      const relativePath = join(basePath, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath, relativePath);
      } else {
        files.push(relativePath);
      }
    }
  }

  await walk(dir, '');
  return files;
}

/**
 * Check if path exists
 */
export function pathExists(path: string): boolean {
  return existsSync(path);
}

/**
 * Get file size in bytes
 */
export async function getFileSize(path: string): Promise<number> {
  const stats = await stat(path);
  return stats.size;
}

/**
 * Resolve path relative to workspace
 */
export function resolvePath(path: string): string {
  return resolve(process.cwd(), path);
}
