import { resolve } from "path";
import { loadSpec } from "../lib/spec.js";
import { createSandbox } from "../lib/sandbox.js";
import { checkDockerAvailable, resolveImage } from "../lib/docker.js";
import { parseTtl } from "../lib/ttl.js";

interface SandboxUpOptions {
  spec: string;
}

export async function sandboxUpCommand(options: SandboxUpOptions): Promise<void> {
  const specPath = resolve(options.spec);

  console.log(`Loading spec from ${specPath}...`);

  let spec;
  try {
    spec = await loadSpec(specPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }

  // Check Docker
  const dockerOk = await checkDockerAvailable();
  if (!dockerOk) {
    console.error(
      "Error: Docker is not running. Please start Docker and try again."
    );
    process.exit(1);
  }

  console.log(`Creating sandbox "${spec.name}"...`);

  const id = await createSandbox(spec);
  const image = resolveImage(spec.runtime);
  const ttlMs = parseTtl(spec.ttl);

  console.log("");
  console.log(`Sandbox created successfully.`);
  console.log(`  ID:      ${id}`);
  console.log(`  Name:    ${spec.name}`);
  console.log(`  Runtime: ${spec.runtime} (${image})`);
  console.log(`  TTL:     ${spec.ttl} (${ttlMs}ms)`);
  console.log(`  Inputs:  ${spec.inputs?.length ?? 0} pattern(s)`);
  console.log(`  Outputs: ${spec.outputs?.length ?? 0} expected`);
  console.log("");
  console.log(`Next: aido run <task> --sandbox ${id}`);
}
