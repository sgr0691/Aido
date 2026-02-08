import { resolve } from 'path';
import { SandboxManager } from '../../core/sandbox.js';
import { DockerRuntime } from '../../runtime/docker.js';
import { EvidenceGenerator } from '../../evidence/generator.js';
import { generateRunId } from '../../utils/id.js';
import { logger } from '../../utils/logger.js';
import { pathExists } from '../../utils/fs.js';
import type { RunResult } from '../../core/schema.js';

interface RunOptions {
  sandbox?: string;
  dangerousAllowMutations?: boolean;
  network?: boolean;
  json?: boolean;
}

export async function run(taskPath: string, options: RunOptions): Promise<void> {
  try {
    const manager = new SandboxManager();
    const runtime = new DockerRuntime();
    const evidence = new EvidenceGenerator();

    // Resolve task path
    const resolvedTaskPath = resolve(taskPath);
    if (!pathExists(resolvedTaskPath)) {
      throw new Error(`Task file not found: ${taskPath}`);
    }

    // Get sandbox
    let sandboxId = options.sandbox;
    let metadata;

    if (sandboxId) {
      metadata = await manager.load(sandboxId);
    } else {
      // Use latest sandbox
      metadata = await manager.getLatest();
      if (!metadata) {
        throw new Error('No sandbox found. Create one with: aido sandbox up');
      }
      sandboxId = metadata.id;
    }

    // Check if sandbox is expired
    if (manager.isExpired(metadata)) {
      throw new Error(`Sandbox ${sandboxId} has expired (TTL: ${metadata.config.ttl})`);
    }

    // Check for dangerous operations
    const wantsMutations = options.dangerousAllowMutations || false;
    const configAllowsMutations = metadata.config.permissions?.filesystem === 'readwrite';

    if (configAllowsMutations && !wantsMutations) {
      logger.warn('⚠️  This sandbox allows file mutations');
      logger.warn('   Add --dangerous-allow-mutations to confirm');
      process.exit(1);
    }

    // Generate run ID
    const runId = generateRunId();

    logger.info(`Running task: ${taskPath}`);
    logger.info(`Sandbox: ${sandboxId}`);
    logger.info(`Run ID: ${runId}`);
    console.log();

    // Update metadata
    metadata.status = 'running';
    await manager.saveMetadata(sandboxId, metadata);

    // Execute task
    const startTime = new Date().toISOString();

    await manager.logEvent(sandboxId, {
      event: 'run_started',
      timestamp: startTime,
      run_id: runId,
      task: taskPath,
    });

    const result = await runtime.execute({
      sandboxId,
      config: metadata.config,
      taskPath: resolvedTaskPath,
      allowMutations: wantsMutations,
      enableNetwork: options.network,
    });

    const endTime = new Date().toISOString();

    // Create run result
    const runResult: RunResult = {
      run_id: runId,
      sandbox_id: sandboxId,
      task: taskPath,
      started_at: startTime,
      completed_at: endTime,
      duration_ms: result.duration_ms,
      exit_code: result.exit_code,
      stdout: result.stdout,
      stderr: result.stderr,
      artifacts: [],
    };

    // Generate evidence
    const artifacts = await evidence.generate(sandboxId, runResult);
    runResult.artifacts = artifacts;

    // Update metadata
    metadata.status = result.exit_code === 0 ? 'completed' : 'failed';
    metadata.runs.push({
      run_id: runId,
      task: taskPath,
      started_at: startTime,
      completed_at: endTime,
      duration_ms: result.duration_ms,
      exit_code: result.exit_code,
      artifacts,
    });
    await manager.saveMetadata(sandboxId, metadata);

    await manager.logEvent(sandboxId, {
      event: 'run_completed',
      timestamp: endTime,
      run_id: runId,
      exit_code: result.exit_code,
      duration_ms: result.duration_ms,
    });

    // Output results
    if (options.json) {
      console.log(JSON.stringify(runResult, null, 2));
    } else {
      console.log();
      console.log(evidence.generateReport(runResult));
    }

    // Exit with task's exit code
    process.exit(result.exit_code);
  } catch (error) {
    logger.error('Failed to run task', error);
    process.exit(1);
  }
}
