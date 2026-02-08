import { mkdir, writeFile, readFile, readdir, rm, cp } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve } from "path";
import { nanoid } from "nanoid";
import yaml from "js-yaml";
import type { SandboxSpec, RunMetadata, EventEntry } from "./types.js";
import { AIDO_DIR, SANDBOXES_DIR } from "./types.js";
import { resolveImage } from "./docker.js";
import { glob } from "./glob.js";

function sandboxesRoot(): string {
  return join(process.cwd(), AIDO_DIR, SANDBOXES_DIR);
}

function sandboxDir(id: string): string {
  return join(sandboxesRoot(), id);
}

export async function createSandbox(spec: SandboxSpec): Promise<string> {
  const id = nanoid(8);
  const dir = sandboxDir(id);

  // Create directory structure
  await mkdir(join(dir, "inputs"), { recursive: true });
  await mkdir(join(dir, "work"), { recursive: true });
  await mkdir(join(dir, "outputs"), { recursive: true });

  // Copy spec
  await writeFile(join(dir, "sandbox.yaml"), yaml.dump(spec));

  // Copy input files
  if (spec.inputs && spec.inputs.length > 0) {
    const inputDir = join(dir, "inputs");
    for (const pattern of spec.inputs) {
      const files = await glob(pattern, process.cwd());
      for (const file of files) {
        const dest = join(inputDir, file);
        const destDir = join(dest, "..");
        await mkdir(destDir, { recursive: true });
        await cp(resolve(file), dest);
      }
    }
  }

  // Write initial run metadata
  const runMeta: RunMetadata = {
    id,
    sandbox: spec.name,
    sandboxId: id,
    status: "pending",
    task: "",
    startedAt: null,
    completedAt: null,
    duration: null,
    exitCode: null,
    container: {
      id: null,
      image: resolveImage(spec.runtime),
    },
  };

  await writeFile(join(dir, "run.json"), JSON.stringify(runMeta, null, 2));

  // Initialize events log
  const event: EventEntry = {
    timestamp: new Date().toISOString(),
    event: "sandbox.created",
    detail: `Sandbox "${spec.name}" created with ID ${id}`,
  };
  await writeFile(join(dir, "events.log"), JSON.stringify(event) + "\n");

  return id;
}

export async function getLatestSandboxId(): Promise<string | null> {
  const root = sandboxesRoot();
  if (!existsSync(root)) return null;

  const entries = await readdir(root);
  if (entries.length === 0) return null;

  // Sort by creation time (most recent first) using run.json timestamps
  let latest: { id: string; time: number } | null = null;

  for (const entry of entries) {
    const runPath = join(root, entry, "run.json");
    if (!existsSync(runPath)) continue;

    const raw = await readFile(runPath, "utf-8");
    const meta = JSON.parse(raw) as RunMetadata;
    const eventsPath = join(root, entry, "events.log");

    let time = 0;
    if (existsSync(eventsPath)) {
      const eventsRaw = await readFile(eventsPath, "utf-8");
      const firstLine = eventsRaw.split("\n")[0];
      if (firstLine) {
        const event = JSON.parse(firstLine) as EventEntry;
        time = new Date(event.timestamp).getTime();
      }
    }

    if (!latest || time > latest.time) {
      latest = { id: meta.id, time };
    }
  }

  return latest?.id ?? null;
}

export async function getSandboxDir(id: string): Promise<string> {
  const dir = sandboxDir(id);
  if (!existsSync(dir)) {
    throw new Error(`Sandbox not found: ${id}`);
  }
  return dir;
}

export async function getRunMetadata(id: string): Promise<RunMetadata> {
  const dir = await getSandboxDir(id);
  const raw = await readFile(join(dir, "run.json"), "utf-8");
  return JSON.parse(raw) as RunMetadata;
}

export async function updateRunMetadata(
  id: string,
  updates: Partial<RunMetadata>
): Promise<void> {
  const dir = await getSandboxDir(id);
  const current = await getRunMetadata(id);
  const updated = { ...current, ...updates };
  await writeFile(join(dir, "run.json"), JSON.stringify(updated, null, 2));
}

export async function appendEvent(
  id: string,
  event: string,
  detail?: string
): Promise<void> {
  const dir = await getSandboxDir(id);
  const entry: EventEntry = {
    timestamp: new Date().toISOString(),
    event,
    detail,
  };
  const eventsPath = join(dir, "events.log");
  const existing = existsSync(eventsPath)
    ? await readFile(eventsPath, "utf-8")
    : "";
  await writeFile(eventsPath, existing + JSON.stringify(entry) + "\n");
}

export async function destroySandbox(id: string): Promise<void> {
  const dir = sandboxDir(id);
  if (!existsSync(dir)) {
    throw new Error(`Sandbox not found: ${id}`);
  }
  await rm(dir, { recursive: true, force: true });
}

export async function listSandboxes(): Promise<string[]> {
  const root = sandboxesRoot();
  if (!existsSync(root)) return [];
  return readdir(root);
}
