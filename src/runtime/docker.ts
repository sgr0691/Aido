import Docker from 'dockerode';
import { copyFile, stat } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { type SandboxConfig, parseDurationMs, parseMemory } from '../core/schema.js';
import {
  getGlobSearchBase,
  globToRegExp,
  isGlobPath,
  isPathAllowed,
  normalizeConfigPath,
  normalizeOutputRule,
} from '../core/path-rules.js';
import { getSandboxDir } from '../core/sandbox.js';
import { logger } from '../utils/logger.js';
import { ensureDir, getAllFiles, pathExists, removeDir } from '../utils/fs.js';

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

  private toPosixPath(pathValue: string): string {
    return pathValue.replace(/\\/g, '/');
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

  private async stageInputs(inputRules: string[], inputsDir: string): Promise<number> {
    await removeDir(inputsDir);
    await ensureDir(inputsDir);

    if (inputRules.length === 0) {
      return 0;
    }

    const workspaceRoot = process.cwd();
    const stagedFiles = new Map<string, string>();

    for (const inputRule of inputRules) {
      const normalizedRule = normalizeConfigPath(inputRule);
      if (!normalizedRule) continue;

      const matches = await this.resolveInputMatches(workspaceRoot, normalizedRule);
      if (matches.length === 0) {
        logger.warn(`Input pattern matched no files: ${inputRule}`);
        continue;
      }

      for (const match of matches) {
        stagedFiles.set(match.relativePath, match.absolutePath);
      }
    }

    for (const [relativePath, absolutePath] of stagedFiles) {
      const destinationPath = join(inputsDir, relativePath);
      await ensureDir(dirname(destinationPath));
      await copyFile(absolutePath, destinationPath);
    }

    logger.debug('Staged input files', { count: stagedFiles.size });
    return stagedFiles.size;
  }

  private async resolveInputMatches(
    workspaceRoot: string,
    inputRule: string
  ): Promise<Array<{ relativePath: string; absolutePath: string }>> {
    if (isGlobPath(inputRule)) {
      return this.resolveGlobMatches(workspaceRoot, inputRule);
    }

    const absolutePath = resolve(workspaceRoot, inputRule);
    if (!pathExists(absolutePath)) {
      throw new Error(`Input path not found: ${inputRule}`);
    }

    const fileStats = await stat(absolutePath);
    if (fileStats.isDirectory()) {
      const nestedFiles = await getAllFiles(absolutePath);
      return nestedFiles.map((nestedFile) => {
        const relativePath = this.toPosixPath(join(inputRule, nestedFile));
        return {
          relativePath,
          absolutePath: join(absolutePath, nestedFile),
        };
      });
    }

    return [{ relativePath: inputRule, absolutePath }];
  }

  private async resolveGlobMatches(
    workspaceRoot: string,
    inputRule: string
  ): Promise<Array<{ relativePath: string; absolutePath: string }>> {
    const searchBase = getGlobSearchBase(inputRule);
    const absoluteSearchBase = resolve(workspaceRoot, searchBase);

    if (!pathExists(absoluteSearchBase)) {
      return [];
    }

    const matcher = globToRegExp(inputRule);
    const candidateFiles = await getAllFiles(absoluteSearchBase);
    const matches: Array<{ relativePath: string; absolutePath: string }> = [];

    for (const candidateFile of candidateFiles) {
      const joined = searchBase === '.' ? candidateFile : join(searchBase, candidateFile);
      const relativePath = this.toPosixPath(joined);
      if (!matcher.test(relativePath)) continue;

      matches.push({
        relativePath,
        absolutePath: join(absoluteSearchBase, candidateFile),
      });
    }

    return matches;
  }

  private async resetOutputs(outputsDir: string): Promise<void> {
    await removeDir(outputsDir);
    await ensureDir(outputsDir);
  }

  private async findUnauthorizedOutputs(outputsDir: string, outputRules: string[]): Promise<string[]> {
    if (!pathExists(outputsDir)) {
      return [];
    }

    const normalizedRules = outputRules.map((rule) => normalizeOutputRule(rule));
    const outputFiles = await getAllFiles(outputsDir);

    return outputFiles
      .map((outputFile) => this.toPosixPath(outputFile))
      .filter((outputFile) => !isPathAllowed(outputFile, normalizedRules))
      .sort();
  }

  private appendStderr(currentStderr: string, message: string): string {
    if (!currentStderr) return message;
    if (currentStderr.endsWith('\n')) return `${currentStderr}${message}`;
    return `${currentStderr}\n${message}`;
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

    await ensureDir(workDir);
    await ensureDir(inputsDir);
    await ensureDir(outputsDir);

    // Get Docker image
    const image = this.getImage(config.runtime);
    await this.ensureImage(image);

    // Stage configured inputs and clear previous outputs
    const stagedInputCount = await this.stageInputs(config.inputs || [], inputsDir);
    await this.resetOutputs(outputsDir);

    // Copy task to work directory
    const taskName = taskPath.split('/').pop()!;
    const workTaskPath = join(workDir, taskName);
    await copyFile(taskPath, workTaskPath);

    // Prepare command
    const command = this.getCommand(config.runtime, taskPath);

    const filesystemMode = config.permissions?.filesystem || 'readonly';
    const workReadOnly = filesystemMode !== 'readwrite' || !allowMutations;

    // Prepare binds (volume mounts)
    const binds = [`${workDir}:/work${workReadOnly ? ':ro' : ''}`];

    if (filesystemMode !== 'none') {
      binds.push(`${outputsDir}:/outputs`);
    }

    // Add staged inputs if they exist
    if (stagedInputCount > 0) {
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
      } as unknown as NodeJS.WritableStream,
      {
        write: (chunk: Buffer) => stderrStream.push(chunk),
      } as unknown as NodeJS.WritableStream
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
      await Promise.race([container.wait(), timeoutPromise]);
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
    let exitCode = inspection.State.ExitCode ?? 1;

    // Validate task outputs against configured output rules
    if (filesystemMode !== 'none') {
      const outputRules = config.outputs && config.outputs.length > 0 ? config.outputs : ['outputs/'];
      const unauthorizedOutputs = await this.findUnauthorizedOutputs(outputsDir, outputRules);
      if (unauthorizedOutputs.length > 0) {
        exitCode = 1;
        const message = [
          'Output policy violation: task wrote files outside configured outputs.',
          ...unauthorizedOutputs.map((outputFile) => `  - ${outputFile}`),
        ].join('\n');
        stderr = this.appendStderr(stderr, message);
      }
    }

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
