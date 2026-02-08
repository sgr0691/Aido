import { join } from "path";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import {
  getLatestSandboxId,
  getSandboxDir,
  getRunMetadata,
} from "../lib/sandbox.js";

interface LogsOptions {
  sandbox?: string;
  follow?: boolean;
}

export async function logsCommand(options: LogsOptions): Promise<void> {
  const sandboxId = options.sandbox ?? (await getLatestSandboxId());
  if (!sandboxId) {
    console.error(
      "Error: No sandbox found. Create one with: aido sandbox up"
    );
    process.exit(1);
  }

  const dir = await getSandboxDir(sandboxId);
  const meta = await getRunMetadata(sandboxId);

  console.log(`Logs for sandbox ${sandboxId} (${meta.sandbox}):`);
  console.log(`Status: ${meta.status}`);
  console.log("");

  const stdoutPath = join(dir, "outputs", "stdout.log");
  const stderrPath = join(dir, "outputs", "stderr.log");

  if (existsSync(stdoutPath)) {
    const stdout = await readFile(stdoutPath, "utf-8");
    if (stdout.trim()) {
      console.log("--- stdout ---");
      console.log(stdout);
    }
  }

  if (existsSync(stderrPath)) {
    const stderr = await readFile(stderrPath, "utf-8");
    if (stderr.trim()) {
      console.log("--- stderr ---");
      console.log(stderr);
    }
  }

  if (!existsSync(stdoutPath) && !existsSync(stderrPath)) {
    console.log("No logs available. Run a task first: aido run <task>");
  }

  if (options.follow) {
    console.log("");
    console.log("(--follow not yet implemented in v0.1)");
  }
}
