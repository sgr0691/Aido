import Docker from "dockerode";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";
import { RUNTIME_IMAGES } from "./types.js";
import type { RunMetadata, RunSummary } from "./types.js";
import {
  getSandboxDir,
  updateRunMetadata,
  appendEvent,
} from "./sandbox.js";
import { parseTtl } from "./ttl.js";
import type { SandboxSpec } from "./types.js";

const docker = new Docker();

export function resolveImage(runtime: string): string {
  return RUNTIME_IMAGES[runtime] ?? runtime;
}

function resolveTaskCommand(
  runtime: string,
  taskPath: string
): [string, string[]] {
  const base = RUNTIME_IMAGES[runtime] ? runtime : null;

  switch (base) {
    case "python":
      return ["python", [taskPath]];
    case "node":
      return ["node", [taskPath]];
    case "bash":
      return ["bash", [taskPath]];
    default:
      // For custom images, try to infer from file extension
      if (taskPath.endsWith(".py")) return ["python", [taskPath]];
      if (taskPath.endsWith(".ts") || taskPath.endsWith(".js"))
        return ["node", [taskPath]];
      return ["bash", [taskPath]];
  }
}

export async function checkDockerAvailable(): Promise<boolean> {
  try {
    await docker.ping();
    return true;
  } catch {
    return false;
  }
}

export interface RunOptions {
  sandboxId: string;
  spec: SandboxSpec;
  taskFile: string;
  taskFileName: string;
  allowMutations?: boolean;
  verbose?: boolean;
}

export async function executeTask(options: RunOptions): Promise<RunSummary> {
  const { sandboxId, spec, taskFile, taskFileName, allowMutations, verbose } =
    options;
  const dir = await getSandboxDir(sandboxId);
  const image = resolveImage(spec.runtime);
  const ttlMs = parseTtl(spec.ttl);

  // Ensure output directories exist
  await mkdir(join(dir, "outputs"), { recursive: true });

  await appendEvent(sandboxId, "run.starting", `Task: ${taskFileName}`);
  await updateRunMetadata(sandboxId, {
    status: "running",
    task: taskFileName,
    startedAt: new Date().toISOString(),
  });

  if (verbose) {
    console.log(`  Image: ${image}`);
    console.log(`  TTL: ${spec.ttl} (${ttlMs}ms)`);
    console.log(`  Task: ${taskFileName}`);
  }

  // Pull image if needed
  try {
    await docker.getImage(image).inspect();
    if (verbose) console.log(`  Image ${image} found locally`);
  } catch {
    console.log(`  Pulling image ${image}...`);
    await new Promise<void>((resolve, reject) => {
      docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err: Error | null) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  }

  const [cmd, args] = resolveTaskCommand(spec.runtime, `/task/${taskFileName}`);

  const binds = [
    `${join(dir, "outputs")}:/outputs`,
    `${taskFile}:/task/${taskFileName}:ro`,
  ];

  // Mount inputs as read-only (or read-write if mutations allowed)
  const inputsBind = allowMutations
    ? `${join(dir, "inputs")}:/inputs`
    : `${join(dir, "inputs")}:/inputs:ro`;
  binds.push(inputsBind);

  const startTime = Date.now();
  let stdoutData = "";
  let stderrData = "";
  let exitCode: number | null = null;
  let containerId: string | null = null;
  let timedOut = false;

  try {
    const container = await docker.createContainer({
      Image: image,
      Cmd: [cmd, ...args],
      WorkingDir: "/work",
      HostConfig: {
        Binds: binds,
        NetworkMode: "none",
        Memory: 512 * 1024 * 1024, // 512MB default
        NanoCpus: 1_000_000_000, // 1 CPU
        AutoRemove: false,
      },
    });

    containerId = container.id;

    await appendEvent(
      sandboxId,
      "container.created",
      `Container: ${containerId}`
    );

    await container.start();

    // Set up TTL timeout
    const timeout = setTimeout(async () => {
      timedOut = true;
      try {
        await container.stop({ t: 5 });
      } catch {
        try {
          await container.kill();
        } catch {
          // Container may have already stopped
        }
      }
    }, ttlMs);

    // Wait for container to finish
    const result = await container.wait();
    clearTimeout(timeout);

    exitCode = result.StatusCode;

    // Capture logs
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      follow: false,
    });

    // Docker multiplexed stream: parse stdout/stderr
    const logBuffer = Buffer.isBuffer(logs) ? logs : Buffer.from(logs as string);
    const parsed = demuxDockerStream(logBuffer);
    stdoutData = parsed.stdout;
    stderrData = parsed.stderr;

    // Clean up container
    try {
      await container.remove();
    } catch {
      // Container may have been auto-removed
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    stderrData += `\nAido error: ${message}`;
    await appendEvent(sandboxId, "run.error", message);
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Write output logs
  await writeFile(join(dir, "outputs", "stdout.log"), stdoutData);
  await writeFile(join(dir, "outputs", "stderr.log"), stderrData);

  // Determine output files
  const outputFiles: string[] = [];
  try {
    const { readdir } = await import("fs/promises");
    const files = await readdir(join(dir, "outputs"));
    for (const f of files) {
      if (f !== "stdout.log" && f !== "stderr.log" && f !== "summary.json") {
        outputFiles.push(f);
      }
    }
  } catch {
    // No output files
  }

  const status = timedOut ? "timeout" : exitCode === 0 ? "completed" : "failed";

  // Write summary
  const summary: RunSummary = {
    sandboxId,
    task: taskFileName,
    exitCode,
    durationMs: duration,
    stdout: "outputs/stdout.log",
    stderr: "outputs/stderr.log",
    outputFiles,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date(endTime).toISOString(),
  };

  await writeFile(
    join(dir, "outputs", "summary.json"),
    JSON.stringify(summary, null, 2)
  );

  // Update run metadata
  await updateRunMetadata(sandboxId, {
    status,
    completedAt: new Date(endTime).toISOString(),
    duration,
    exitCode,
    container: {
      id: containerId,
      image,
    },
  });

  await appendEvent(
    sandboxId,
    `run.${status}`,
    `Exit code: ${exitCode}, Duration: ${duration}ms`
  );

  return summary;
}

/**
 * Demultiplex Docker stream output into stdout and stderr.
 * Docker uses an 8-byte header for each frame:
 *   [type(1)][0(3)][size(4)][payload(size)]
 * type: 1=stdout, 2=stderr
 */
function demuxDockerStream(buffer: Buffer): {
  stdout: string;
  stderr: string;
} {
  let stdout = "";
  let stderr = "";
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {
      // Remaining data without header — treat as stdout
      stdout += buffer.subarray(offset).toString("utf-8");
      break;
    }

    const type = buffer[offset];
    const size = buffer.readUInt32BE(offset + 4);
    offset += 8;

    if (offset + size > buffer.length) {
      // Partial frame — take what we can
      const chunk = buffer.subarray(offset).toString("utf-8");
      if (type === 2) {
        stderr += chunk;
      } else {
        stdout += chunk;
      }
      break;
    }

    const payload = buffer.subarray(offset, offset + size).toString("utf-8");
    if (type === 2) {
      stderr += payload;
    } else {
      stdout += payload;
    }
    offset += size;
  }

  return { stdout, stderr };
}

export async function stopAndRemoveContainer(
  containerId: string
): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    try {
      await container.stop({ t: 5 });
    } catch {
      // May already be stopped
    }
    try {
      await container.remove();
    } catch {
      // May already be removed
    }
  } catch {
    // Container doesn't exist
  }
}
