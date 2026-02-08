import { readdir, stat } from "fs/promises";
import { join, relative } from "path";

/**
 * Simple glob implementation for matching input file patterns.
 * Supports basic * wildcards in file paths.
 */
export async function glob(pattern: string, cwd: string): Promise<string[]> {
  const matches: string[] = [];
  await walkDir(cwd, cwd, pattern, matches);
  return matches;
}

async function walkDir(
  dir: string,
  root: string,
  pattern: string,
  matches: string[]
): Promise<void> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = relative(root, fullPath);

      if (entry.isDirectory()) {
        // Skip hidden directories and node_modules
        if (entry.name.startsWith(".") || entry.name === "node_modules") {
          continue;
        }
        await walkDir(fullPath, root, pattern, matches);
      } else if (matchGlob(relPath, pattern)) {
        matches.push(relPath);
      }
    }
  } catch {
    // Directory not accessible, skip
  }
}

function matchGlob(path: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "{{DOUBLESTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\{\{DOUBLESTAR\}\}/g, ".*");

  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(path);
}
