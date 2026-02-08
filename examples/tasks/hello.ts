/**
 * Example Aido task — hello world (TypeScript).
 *
 * Demonstrates the basic structure:
 * - Read from /inputs (read-only)
 * - Write results to /outputs
 * - Print to stdout (captured automatically)
 */

import { readdir, mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

async function main() {
  console.log("Hello from Aido!");
  console.log(`Running at: ${new Date().toISOString()}`);

  // List available inputs
  const inputDir = "/inputs";
  if (existsSync(inputDir)) {
    const files = await readdir(inputDir);
    console.log(`Found ${files.length} input file(s):`, files);
  } else {
    console.log("No inputs directory found (running outside sandbox?)");
  }

  // Write output
  const outputDir = "/outputs";
  await mkdir(outputDir, { recursive: true });

  const result = {
    status: "success",
    message: "Hello from Aido!",
    timestamp: new Date().toISOString(),
  };

  const outputPath = join(outputDir, "result.json");
  await writeFile(outputPath, JSON.stringify(result, null, 2));
  console.log(`Output written to ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
