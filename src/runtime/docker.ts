import Docker from 'dockerode';
import { join } from 'path';
import { type SandboxConfig, parseDurationMs, parseMemory } from '../core/schema.js';
import { getSandboxDir } from '../core/sandbox.js';
import { logger } from '../utils/logger.js';
import { pathExists } from '../utils/fs.js';

export interface RuntimeOptions {
  sandboxId: string;
  config: SandboxConfig;
  taskPath: string;
  allowMutations?: boolean;
  enableNetwork?: boolean;
}

export interface RuntimeResult {
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
}

/**
 * Docker Runtime Adapter
 */
export class DockerRuntime {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  /**
   * Check if Docker is available
   */
  async checkAvailable(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (error) {
      logger.error('Docker is not available', error);
      return false;
    }
  }

  /**
   * Get Docker image for runtime
   */
  private getImage(runtime: string): string {
    // Handle docker:// prefix for custom images
    if (runtime.startsWith('docker://')) {
      return runtime.replace('docker://', '');
    }

    // Map runtime to official images
    const imageMap: Record<string, string> = {
      python: 'python:3.11-slim',
      'python:3.11': 'python:3.11-slim',
      'python:3.10': 'python:3.10-slim',
      'python:3.9': 'python:3.9-slim',
      node: 'node:18-alpine',
      'node:18': 'node:18-alpine',
      'node:20': 'node:20-alpine',
    };

    return imageMap[runtime] || runtime;
  }

  /**
   * Get command to execute task
   */
  private getCommand(runtime: string, taskPath: string): string[] {
    const taskName = taskPath.split('/').pop()!;

    if (runtime.startsWith('python')) {
      return ['python', `/work/${taskName}`];
    }

    if (runtime.startsWith('node')) {
      return ['node', `/work/${taskName}`];
    }

    // Default: execute directly
    return [`/work/${taskName}`];
  }

  /**
   * Pull Docker image if not present
   */
  private async ensureImage(image: string): Promise<void> {
    logger.debug('Checking Docker image', { image });

    try {
      await this.docker.getImage(image).inspect();
      logger.debug('Image already present', { image });
    } catch (error) {
      logger.info(`Pulling Docker image: ${image}`);
      await new Promise<void>((resolve, reject) => {
        this.docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
          if (err) return reject(err);

          this.docker.modem.followProgress(
            stream,
            (err: Error | null) => {
              if (err) return reject(err);
              logger.success(`Image pulled: ${image}`);
              resolve();
            },
            (event: { status?: string; progress?: string }) => {
              if (event.status && event.progress) {
                logger.debug(`${event.status}: ${event.progress}`);
              }
            }
          );
        });
      });
    }
  }

  /**
   * Execute task in Docker container
   */
  async execute(options: RuntimeOptions): Promise<RuntimeResult> {
    const { sandboxId, config, taskPath, allowMutations = false, enableNetwork = false } = options;

    // Check Docker availability
    const available = await this.checkAvailable();
    if (!available) {
      throw new Error('Docker is not available. Please ensure Docker is running.');
    }

    // Validate task exists
    if (!pathExists(taskPath)) {
      throw new Error(`Task file not found: ${taskPath}`);
    }

    // Get sandbox directories
    const sandboxDir = getSandboxDir(sandboxId);
    const inputsDir = join(sandboxDir, 'inputs');
    const workDir = join(sandboxDir, 'work');
    const outputsDir = join(sandboxDir, 'outputs');

    // Get Docker image
    const image = this.getImage(config.runtime);
    await this.ensureImage(image);

    // Copy task to work directory
    const { copyFile } = await import('fs/promises');
    const taskName = taskPath.split('/').pop()!;
    const workTaskPath = join(workDir, taskName);
    await copyFile(taskPath, workTaskPath);

    // Prepare command
    const command = this.getCommand(config.runtime, taskPath);

    // Prepare binds (volume mounts)
    const binds = [
      `${workDir}:/work`,
      `${outputsDir}:/outputs`,
    ];

    // Add inputs if they exist
    const inputsExist = pathExists(inputsDir);
    if (inputsExist) {
      binds.push(`${inputsDir}:/inputs:ro`);
    }

    // Network mode
    const networkMode = enableNetwork || config.permissions?.network ? 'bridge' : 'none';

    // Resource limits
    const cpus = config.resources?.cpu || 1;
    const memoryLimit = parseMemory(config.resources?.memory || '512M');
    const timeout = parseDurationMs(config.resources?.timeout || '10m');

    logger.debug('Creating container', {
      image,
      command,
      binds,
      networkMode,
      cpus,
      memoryLimit,
      timeout,
    });

    // Create container
    const container = await this.docker.createContainer({
      Image: image,
      Cmd: command,
      WorkingDir: '/work',
      HostConfig: {
        Binds: binds,
        NetworkMode: networkMode,
        AutoRemove: true,
        CpuQuota: Math.floor(cpus * 100000),
        Memory: memoryLimit,
        PidsLimit: 100,
        SecurityOpt: ['no-new-privileges'],
        ReadonlyRootfs: false, // Some runtimes need writable /tmp
      },
      Env: Object.entries(config.env || {}).map(([key, value]) => `${key}=${value}`),
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    });

    logger.debug('Container created', { id: container.id });

    // Attach to container streams
    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });

    let stdout = '';
    let stderr = '';

    // Demux stdout and stderr
    const stdoutStream = new Array<Buffer>();
    const stderrStream = new Array<Buffer>();

    this.docker.modem.demuxStream(
      stream,
      {
        write: (chunk: Buffer) => stdoutStream.push(chunk),
      } as NodeJS.WritableStream,
      {
        write: (chunk: Buffer) => stderrStream.push(chunk),
      } as NodeJS.WritableStream
    );

    // Start container
    const startTime = Date.now();
    await container.start();
    logger.spinner('Task running...');

    // Wait for container with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Task exceeded timeout of ${config.resources?.timeout || '10m'}`));
      }, timeout);
    });

    try {
      await Promise.race([
        container.wait(),
        timeoutPromise,
      ]);
    } catch (error) {
      // Kill container on timeout
      try {
        await container.kill();
      } catch (killError) {
        logger.warn('Failed to kill container', killError);
      }
      throw error;
    }

    const duration = Date.now() - startTime;

    // Collect output
    stdout = Buffer.concat(stdoutStream).toString('utf-8');
    stderr = Buffer.concat(stderrStream).toString('utf-8');

    // Get exit code
    const inspection = await container.inspect();
    const exitCode = inspection.State.ExitCode;

    logger.debug('Container finished', {
      exitCode,
      duration,
      stdoutLength: stdout.length,
      stderrLength: stderr.length,
    });

    return {
      exit_code: exitCode,
      stdout,
      stderr,
      duration_ms: duration,
    };
  }
}
