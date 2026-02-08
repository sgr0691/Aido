import {
  destroySandbox,
  getLatestSandboxId,
  getRunMetadata,
  listSandboxes,
} from "../lib/sandbox.js";
import { stopAndRemoveContainer } from "../lib/docker.js";

interface SandboxDestroyOptions {
  sandbox?: string;
  all?: boolean;
}

export async function sandboxDestroyCommand(
  options: SandboxDestroyOptions
): Promise<void> {
  if (options.all) {
    const ids = await listSandboxes();
    if (ids.length === 0) {
      console.log("No sandboxes found.");
      return;
    }

    console.log(`Destroying ${ids.length} sandbox(es)...`);
    for (const id of ids) {
      await destroyOne(id);
    }
    console.log("All sandboxes destroyed.");
    return;
  }

  const id = options.sandbox ?? (await getLatestSandboxId());
  if (!id) {
    console.error("Error: No sandbox found. Create one with: aido sandbox up");
    process.exit(1);
  }

  await destroyOne(id);
  console.log(`Sandbox ${id} destroyed.`);
}

async function destroyOne(id: string): Promise<void> {
  try {
    const meta = await getRunMetadata(id);
    if (meta.container.id && meta.status === "running") {
      console.log(`  Stopping container for sandbox ${id}...`);
      await stopAndRemoveContainer(meta.container.id);
    }
  } catch {
    // Metadata may not exist, proceed with directory cleanup
  }

  await destroySandbox(id);
}
