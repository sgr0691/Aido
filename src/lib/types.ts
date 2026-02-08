export interface SandboxSpec {
  name: string;
  runtime: string;
  ttl: string;
  inputs?: string[];
  outputs?: string[];
  permissions?: {
    aws?: {
      role: "readonly" | "readwrite";
      services: string[];
    };
  };
}

export interface RunMetadata {
  id: string;
  sandbox: string;
  sandboxId: string;
  status: "pending" | "running" | "completed" | "failed" | "timeout";
  task: string;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  exitCode: number | null;
  container: {
    id: string | null;
    image: string;
  };
}

export interface RunSummary {
  sandboxId: string;
  task: string;
  exitCode: number | null;
  durationMs: number | null;
  stdout: string;
  stderr: string;
  outputFiles: string[];
  startedAt: string | null;
  completedAt: string | null;
}

export interface EventEntry {
  timestamp: string;
  event: string;
  detail?: string;
}

export const RUNTIME_IMAGES: Record<string, string> = {
  python: "python:3.12-slim",
  node: "node:20-slim",
  bash: "ubuntu:22.04",
};

export const AIDO_DIR = ".aido";
export const SANDBOXES_DIR = "sandboxes";
