import { resolve } from "path";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { loadSpec } from "../lib/spec.js";
import {
  getLatestSandboxId,
  getSandboxDir,
} from "../lib/sandbox.js";
import {
  checkDockerAvailable,
  executeTask,
} from "../lib/docker.js";
import type { SandboxSpec } from "../lib/types.js";
import yaml from "js-yaml";

interface RunOptions {
  sandbox?: string;
  json?: boolean;
  verbose?: boolean;
  dangerousAllowMutations?: boolean;
}

export async function runCommand(
  task: string,
  options: RunOptions
): Promise<void> {
  // Resolve sandbox
  const sandboxId = options.sandbox ?? (await getLatestSandboxId());
  if (!sandboxId) {
    console.error(
      "Error: No sandbox found. Create one with: aido sandbox up"
    );
    process.exit(1);
  }

  // Resolve task file
  const taskFile = resolve(task);
  if (!existsSync(taskFile)) {
    console.error(`Error: Task file not found: ${taskFile}`);
    process.exit(1);
  }

  const taskFileName = task.split("/").pop() ?? task;

  // Check Docker
  const dockerOk = await checkDockerAvailable();
  if (!dockerOk) {
    console.error(
      "Error: Docker is not running. Please start Docker and try again."
    );
    process.exit(1);
  }

  // Load sandbox spec
  const dir = await getSandboxDir(sandboxId);
  const specRaw = await readFile(`${dir}/sandbox.yaml`, "utf-8");
  const spec = yaml.load(specRaw) as SandboxSpec;

  if (options.dangerousAllowMutations) {
    console.log("WARNING: --dangerous-allow-mutations enabled. Inputs are writable.");
  }

  console.log(`Running task "${taskFileName}" in sandbox ${sandboxId}...`);

  if (options.verbose) {
    console.log(`  Sandbox: ${spec.name} (${sandboxId})`);
  }

  const summary = await executeTask({
    sandboxId,
    spec,
    taskFile,
    taskFileName,
    allowMutations: options.dangerousAllowMutations,
    verbose: options.verbose,
  });

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log("");
    console.log(`Run complete.`);
    console.log(`  Status:   ${summary.exitCode === 0 ? "success" : "failed"}`);
    console.log(`  Exit:     ${summary.exitCode}`);
    console.log(`  Duration: ${summary.durationMs}ms`);
    if (summary.outputFiles.length > 0) {
      console.log(`  Outputs:  ${summary.outputFiles.join(", ")}`);
    }
    console.log("");
    console.log(`View logs: aido logs --sandbox ${sandboxId}`);
  }
}
