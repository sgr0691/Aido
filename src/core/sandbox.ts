import { join } from 'path';
import { homedir } from 'os';
import {
  type SandboxConfig,
  type SandboxMetadata,
  sandboxConfigSchema,
  parseDurationMs,
} from './schema.js';
import { ensureDir, readJSON, writeJSON, removeDir, pathExists } from '../utils/fs.js';
import { generateSandboxId } from '../utils/id.js';
import { logger } from '../utils/logger.js';

/**
 * Get Aido workspace directory
 */
export function getWorkspaceDir(): string {
  return join(process.cwd(), '.aido');
}

/**
 * Get sandbox directory
 */
export function getSandboxDir(sandboxId: string): string {
  return join(getWorkspaceDir(), 'sandboxes', sandboxId);
}

/**
 * Get global config directory
 */
export function getGlobalConfigDir(): string {
  return join(homedir(), '.aido');
}

/**
 * Sandbox Manager
 */
export class SandboxManager {
  /**
   * Create a new sandbox
   */
  async create(config: SandboxConfig): Promise<SandboxMetadata> {
    // Validate config
    const validatedConfig = sandboxConfigSchema.parse(config);

    // Generate sandbox ID
    const sandboxId = generateSandboxId();
    logger.debug('Generated sandbox ID', { sandboxId });

    // Create directory structure
    const sandboxDir = getSandboxDir(sandboxId);
    await ensureDir(join(sandboxDir, 'inputs'));
    await ensureDir(join(sandboxDir, 'work'));
    await ensureDir(join(sandboxDir, 'outputs'));

    logger.debug('Created sandbox directories', { sandboxDir });

    // Create metadata
    const metadata: SandboxMetadata = {
      id: sandboxId,
      created_at: new Date().toISOString(),
      status: 'created',
      config: validatedConfig,
      runs: [],
    };

    // Write metadata
    await this.saveMetadata(sandboxId, metadata);

    // Create events log
    await this.logEvent(sandboxId, {
      event: 'sandbox_created',
      timestamp: new Date().toISOString(),
      sandbox_id: sandboxId,
    });

    logger.success(`Sandbox created: ${sandboxId}`);

    return metadata;
  }

  /**
   * Load sandbox metadata
   */
  async load(sandboxId: string): Promise<SandboxMetadata> {
    const metadataPath = join(getSandboxDir(sandboxId), 'sandbox.json');

    if (!pathExists(metadataPath)) {
      throw new Error(`Sandbox not found: ${sandboxId}`);
    }

    return readJSON<SandboxMetadata>(metadataPath);
  }

  /**
   * Save sandbox metadata
   */
  async saveMetadata(sandboxId: string, metadata: SandboxMetadata): Promise<void> {
    const metadataPath = join(getSandboxDir(sandboxId), 'sandbox.json');
    await writeJSON(metadataPath, metadata);
  }

  /**
   * Destroy a sandbox
   */
  async destroy(sandboxId: string): Promise<void> {
    const sandboxDir = getSandboxDir(sandboxId);

    if (!pathExists(sandboxDir)) {
      throw new Error(`Sandbox not found: ${sandboxId}`);
    }

    // Log destruction event
    await this.logEvent(sandboxId, {
      event: 'sandbox_destroyed',
      timestamp: new Date().toISOString(),
      sandbox_id: sandboxId,
    });

    // Remove directory
    await removeDir(sandboxDir);

    logger.success(`Sandbox destroyed: ${sandboxId}`);
  }

  /**
   * List all sandboxes
   */
  async list(): Promise<SandboxMetadata[]> {
    const sandboxesDir = join(getWorkspaceDir(), 'sandboxes');

    if (!pathExists(sandboxesDir)) {
      return [];
    }

    const { readdir } = await import('fs/promises');
    const entries = await readdir(sandboxesDir, { withFileTypes: true });

    const sandboxes: SandboxMetadata[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const metadata = await this.load(entry.name);
          sandboxes.push(metadata);
        } catch (error) {
          logger.warn(`Failed to load sandbox: ${entry.name}`, error);
        }
      }
    }

    return sandboxes;
  }

  /**
   * Get latest sandbox
   */
  async getLatest(): Promise<SandboxMetadata | null> {
    const sandboxes = await this.list();
    if (sandboxes.length === 0) return null;

    // Sort by creation time, most recent first
    sandboxes.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return sandboxes[0]!;
  }

  /**
   * Check if sandbox is expired
   */
  isExpired(metadata: SandboxMetadata): boolean {
    const ttlMs = parseDurationMs(metadata.config.ttl);
    const createdAt = new Date(metadata.created_at).getTime();
    const now = Date.now();

    return now - createdAt > ttlMs;
  }

  /**
   * Clean up expired sandboxes
   */
  async cleanupExpired(): Promise<number> {
    const sandboxes = await this.list();
    let cleaned = 0;

    for (const sandbox of sandboxes) {
      if (this.isExpired(sandbox)) {
        logger.info(`Cleaning up expired sandbox: ${sandbox.id}`);
        await this.destroy(sandbox.id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Log event to sandbox events.log
   */
  async logEvent(sandboxId: string, event: Record<string, unknown>): Promise<void> {
    const eventsPath = join(getSandboxDir(sandboxId), 'events.log');
    const { appendFile } = await import('fs/promises');
    await appendFile(eventsPath, JSON.stringify(event) + '\n', 'utf-8');
  }
}
