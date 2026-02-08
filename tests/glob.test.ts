import { describe, it, expect } from "vitest";
import { glob } from "../src/lib/glob.js";
import { join } from "path";

const projectRoot = join(import.meta.dirname, "..");

describe("glob", () => {
  it("matches yaml files in examples directory", async () => {
    const files = await glob("examples/*.yaml", projectRoot);
    expect(files.length).toBeGreaterThanOrEqual(2);
    expect(files.some((f) => f.includes("sandbox.readonly.yaml"))).toBe(true);
    expect(files.some((f) => f.includes("sandbox.mutate.yaml"))).toBe(true);
  });

  it("matches nested files with wildcards", async () => {
    const files = await glob("examples/tasks/*.py", projectRoot);
    expect(files.some((f) => f.includes("hello.py"))).toBe(true);
  });

  it("returns empty array for no matches", async () => {
    const files = await glob("nonexistent/*.xyz", projectRoot);
    expect(files).toEqual([]);
  });
});
