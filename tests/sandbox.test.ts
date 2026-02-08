import { describe, it, expect, afterEach } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { rm } from "fs/promises";
import {
  createSandbox,
  getSandboxDir,
  getRunMetadata,
  destroySandbox,
  listSandboxes,
} from "../src/lib/sandbox.js";
import type { SandboxSpec } from "../src/lib/types.js";

const testSpec: SandboxSpec = {
  name: "test-sandbox",
  runtime: "python",
  ttl: "5m",
  inputs: [],
  outputs: ["result.json"],
};

const aidoDir = join(process.cwd(), ".aido");

afterEach(async () => {
  // Clean up any sandboxes created during tests
  if (existsSync(aidoDir)) {
    await rm(aidoDir, { recursive: true, force: true });
  }
});

describe("sandbox management", () => {
  it("creates a sandbox with correct directory structure", async () => {
    const id = await createSandbox(testSpec);

    expect(id).toHaveLength(8);

    const dir = await getSandboxDir(id);
    expect(existsSync(join(dir, "inputs"))).toBe(true);
    expect(existsSync(join(dir, "work"))).toBe(true);
    expect(existsSync(join(dir, "outputs"))).toBe(true);
    expect(existsSync(join(dir, "sandbox.yaml"))).toBe(true);
    expect(existsSync(join(dir, "run.json"))).toBe(true);
    expect(existsSync(join(dir, "events.log"))).toBe(true);
  });

  it("writes initial run metadata", async () => {
    const id = await createSandbox(testSpec);
    const meta = await getRunMetadata(id);

    expect(meta.id).toBe(id);
    expect(meta.sandbox).toBe("test-sandbox");
    expect(meta.status).toBe("pending");
    expect(meta.container.image).toBe("python:3.12-slim");
  });

  it("destroys a sandbox", async () => {
    const id = await createSandbox(testSpec);
    const dir = await getSandboxDir(id);

    expect(existsSync(dir)).toBe(true);
    await destroySandbox(id);
    expect(existsSync(dir)).toBe(false);
  });

  it("lists sandboxes", async () => {
    await createSandbox(testSpec);
    await createSandbox({ ...testSpec, name: "test-sandbox-2" });

    const list = await listSandboxes();
    expect(list).toHaveLength(2);
  });

  it("throws when destroying non-existent sandbox", async () => {
    await expect(destroySandbox("nonexistent")).rejects.toThrow(
      "Sandbox not found"
    );
  });
});
