import { describe, it, expect } from "vitest";
import { loadSpec } from "../src/lib/spec.js";
import { join } from "path";

const fixturesDir = join(import.meta.dirname, "..", "examples");

describe("loadSpec", () => {
  it("loads a valid readonly spec", async () => {
    const spec = await loadSpec(join(fixturesDir, "sandbox.readonly.yaml"));
    expect(spec.name).toBe("inspect-logs");
    expect(spec.runtime).toBe("python");
    expect(spec.ttl).toBe("10m");
    expect(spec.inputs).toEqual(["logs/*.json", "config/settings.yaml"]);
    expect(spec.outputs).toEqual(["report.md"]);
    expect(spec.permissions?.aws?.role).toBe("readonly");
  });

  it("loads a valid mutate spec", async () => {
    const spec = await loadSpec(join(fixturesDir, "sandbox.mutate.yaml"));
    expect(spec.name).toBe("apply-migration");
    expect(spec.runtime).toBe("node");
    expect(spec.ttl).toBe("5m");
    expect(spec.permissions?.aws?.role).toBe("readwrite");
  });

  it("throws on missing file", async () => {
    await expect(loadSpec("/nonexistent/sandbox.yaml")).rejects.toThrow(
      "Spec file not found"
    );
  });
});
