import { readFile } from "fs/promises";
import { existsSync } from "fs";
import yaml from "js-yaml";
import type { SandboxSpec } from "./types.js";

export async function loadSpec(specPath: string): Promise<SandboxSpec> {
  if (!existsSync(specPath)) {
    throw new Error(`Spec file not found: ${specPath}`);
  }

  const raw = await readFile(specPath, "utf-8");
  const parsed = yaml.load(raw) as Record<string, unknown>;

  return validateSpec(parsed);
}

function validateSpec(raw: Record<string, unknown>): SandboxSpec {
  const errors: string[] = [];

  if (!raw.name || typeof raw.name !== "string") {
    errors.push("'name' is required and must be a string");
  }

  if (!raw.runtime || typeof raw.runtime !== "string") {
    errors.push("'runtime' is required and must be a string");
  }

  if (!raw.ttl || typeof raw.ttl !== "string") {
    errors.push("'ttl' is required and must be a string");
  } else if (!/^\d+(s|m|h)$/.test(raw.ttl as string)) {
    errors.push("'ttl' must match pattern: <number>(s|m|h), e.g. '5m', '1h'");
  }

  if (raw.inputs !== undefined) {
    if (!Array.isArray(raw.inputs)) {
      errors.push("'inputs' must be an array of strings");
    }
  }

  if (raw.outputs !== undefined) {
    if (!Array.isArray(raw.outputs)) {
      errors.push("'outputs' must be an array of strings");
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid sandbox spec:\n${errors.map((e) => `  - ${e}`).join("\n")}`
    );
  }

  return raw as unknown as SandboxSpec;
}
