import { nanoid } from 'nanoid';

/**
 * Generate a sandbox ID
 */
export function generateSandboxId(): string {
  return nanoid(12);
}

/**
 * Generate a run ID
 */
export function generateRunId(): string {
  return `run-${nanoid(8)}`;
}
