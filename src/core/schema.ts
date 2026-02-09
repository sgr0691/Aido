import { z } from 'zod';
import { isSafeConfigPath } from './path-rules.js';

const sandboxPathSchema = z
  .string()
  .min(1, 'Path is required')
  .refine(isSafeConfigPath, 'Paths must be relative and cannot traverse parent directories');

/**
 * Duration string schema (e.g., "15m", "2h", "30s")
 */
export const durationSchema = z
  .string()
  .regex(/^\d+[smh]$/, 'Duration must be in format: <number><unit> where unit is s, m, or h')
  .refine((val) => {
    const match = val.match(/^(\d+)([smh])$/);
    if (!match) return false;
    const minutes = parseDuration(val);
    return minutes >= 1 && minutes <= 1440; // 1 minute to 24 hours
  }, 'Duration must be between 1m and 24h');

/**
 * Sandbox configuration schema
 */
export const sandboxConfigSchema = z.object({
  name: z.string().min(1, 'Sandbox name is required'),
  runtime: z.string().min(1, 'Runtime is required'),
  ttl: durationSchema,
  inputs: z.array(sandboxPathSchema).optional().default([]),
  outputs: z.array(sandboxPathSchema).optional().default(['outputs/']),
  permissions: z
    .object({
      filesystem: z.enum(['readonly', 'readwrite', 'none']).optional().default('readonly'),
      network: z.boolean().optional().default(false),
      aws: z
        .object({
          role: z.enum(['readonly', 'readwrite']),
          services: z.array(z.string()),
        })
        .optional(),
    })
    .optional()
    .default({}),
  env: z.record(z.string()).optional().default({}),
  resources: z
    .object({
      cpu: z.number().positive().optional().default(1),
      memory: z
        .string()
        .regex(/^\d+[MG]$/)
        .optional()
        .default('512M'),
      timeout: durationSchema.optional().default('10m'),
    })
    .optional()
    .default({}),
});

export type SandboxConfig = z.infer<typeof sandboxConfigSchema>;

/**
 * Sandbox metadata schema
 */
export const sandboxMetadataSchema = z.object({
  id: z.string(),
  created_at: z.string().datetime(),
  status: z.enum(['created', 'running', 'completed', 'failed', 'destroyed']),
  config: sandboxConfigSchema,
  runs: z.array(
    z.object({
      run_id: z.string(),
      task: z.string(),
      started_at: z.string().datetime(),
      completed_at: z.string().datetime().optional(),
      duration_ms: z.number().optional(),
      exit_code: z.number().optional(),
      artifacts: z.array(z.string()).optional(),
    })
  ),
});

export type SandboxMetadata = z.infer<typeof sandboxMetadataSchema>;

/**
 * Run result schema
 */
export const runResultSchema = z.object({
  run_id: z.string(),
  sandbox_id: z.string(),
  task: z.string(),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime(),
  duration_ms: z.number(),
  exit_code: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  artifacts: z.array(z.string()),
});

export type RunResult = z.infer<typeof runResultSchema>;

/**
 * Parse duration string to minutes
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smh])$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);

  const numStr = match[1]!;
  const unit = match[2]!;
  const num = parseInt(numStr, 10);

  switch (unit) {
    case 's':
      return num / 60;
    case 'm':
      return num;
    case 'h':
      return num * 60;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}

/**
 * Parse duration string to milliseconds
 */
export function parseDurationMs(duration: string): number {
  return parseDuration(duration) * 60 * 1000;
}

/**
 * Parse memory string to bytes
 */
export function parseMemory(memory: string): number {
  const match = memory.match(/^(\d+)([MG])$/);
  if (!match) throw new Error(`Invalid memory format: ${memory}`);

  const numStr = match[1]!;
  const unit = match[2]!;
  const num = parseInt(numStr, 10);

  switch (unit) {
    case 'M':
      return num * 1024 * 1024;
    case 'G':
      return num * 1024 * 1024 * 1024;
    default:
      throw new Error(`Invalid memory unit: ${unit}`);
  }
}
