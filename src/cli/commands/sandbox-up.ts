import { readFile } from 'fs/promises';
import { parse as parseYaml } from 'yaml';
import { type SandboxConfig } from '../../core/schema.js';
import { SandboxManager } from '../../core/sandbox.js';
import { logger } from '../../utils/logger.js';
import { pathExists } from '../../utils/fs.js';

interface SandboxUpOptions {
  file?: string;
  name?: string;
  runtime?: string;
  ttl?: string;
}

export async function sandboxUp(options: SandboxUpOptions): Promise<void> {
  try {
    const manager = new SandboxManager();

    let config: SandboxConfig;

    // Load from file if specified
    if (options.file) {
      if (!pathExists(options.file)) {
        throw new Error(`Config file not found: ${options.file}`);
      }

      logger.info(`Loading config from: ${options.file}`);
      const content = await readFile(options.file, 'utf-8');
      config = parseYaml(content) as SandboxConfig;
    } else {
      // Use CLI options or defaults
      config = {
        name: options.name || 'default',
        runtime: options.runtime || 'python:3.11',
        ttl: options.ttl || '15m',
        inputs: [],
        outputs: ['outputs/'],
        permissions: {
          filesystem: 'readonly',
          network: false,
        },
        env: {},
        resources: {
          cpu: 1,
          memory: '512M',
          timeout: '10m',
        },
      };
    }

    // Create sandbox
    const metadata = await manager.create(config);

    // Output result
    logger.success(`Sandbox created: ${metadata.id}`);
    console.log();
    console.log(`ID:       ${metadata.id}`);
    console.log(`Name:     ${metadata.config.name}`);
    console.log(`Runtime:  ${metadata.config.runtime}`);
    console.log(`TTL:      ${metadata.config.ttl}`);
    console.log(`Created:  ${metadata.created_at}`);
  } catch (error) {
    logger.error('Failed to create sandbox', error);
    process.exit(1);
  }
}
