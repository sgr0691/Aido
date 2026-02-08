import { join } from 'path';
import { readFile } from 'fs/promises';
import { SandboxManager, getSandboxDir } from '../../core/sandbox.js';
import { logger } from '../../utils/logger.js';
import { pathExists } from '../../utils/fs.js';

interface LogsOptions {
  sandbox?: string;
  stderr?: boolean;
}

export async function logs(options: LogsOptions): Promise<void> {
  try {
    const manager = new SandboxManager();

    // Get sandbox
    let sandboxId = options.sandbox;
    let metadata;

    if (sandboxId) {
      metadata = await manager.load(sandboxId);
    } else {
      // Use latest sandbox
      metadata = await manager.getLatest();
      if (!metadata) {
        throw new Error('No sandbox found');
      }
      sandboxId = metadata.id;
    }

    // Check if sandbox has runs
    if (metadata.runs.length === 0) {
      logger.warn('No runs found in this sandbox');
      return;
    }

    // Get latest run
    const latestRun = metadata.runs[metadata.runs.length - 1]!;

    logger.info(`Sandbox: ${sandboxId}`);
    logger.info(`Run: ${latestRun.run_id}`);
    logger.info(`Task: ${latestRun.task}`);
    console.log();

    // Read and display logs
    const sandboxDir = getSandboxDir(sandboxId);
    const logFile = options.stderr ? 'stderr.log' : 'stdout.log';
    const logPath = join(sandboxDir, 'outputs', logFile);

    if (!pathExists(logPath)) {
      logger.warn(`Log file not found: ${logFile}`);
      return;
    }

    const content = await readFile(logPath, 'utf-8');

    if (content.trim()) {
      console.log(content);
    } else {
      logger.info('(empty)');
    }
  } catch (error) {
    logger.error('Failed to read logs', error);
    process.exit(1);
  }
}
